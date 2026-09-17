// ============================================================
//  Reconciler — settles stuck PENDING orders
//
//  Without it every network blip = a customer charged and not served.
//
//  Fix vs v1: when the order exists upstream we now CHECK ITS STATUS.
//  A FAILED/CANCELLED upstream order used to be marked COMPLETED with
//  empty delivery. Now it's refunded.
// ============================================================
import { gg, GGError } from '../services/ggsoma.js';
import { db, rpc, rows, q } from '../lib/db.js';
import { Snum } from '../lib/settings.js';
import { sleep, money, esc } from '../lib/fmt.js';
import { logger } from '../lib/logger.js';
import { finishOrder } from './purchase.js';
import { t } from '../i18n/index.js';

const log = logger('recon');
const MIN_AGE_MS = 30_000;

// GGSoma order statuses (§11)
const UPSTREAM_DONE   = new Set(['COMPLETED', 'DELIVERED', 'SUCCESS']);
const UPSTREAM_FAILED = new Set(['FAILED', 'CANCELLED', 'REFUNDED', 'REJECTED']);

export async function reconcileOnce({ notifyAdmin, notifyUser }) {
  const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();
  const stuck = await rows(db.from('orders').select('*, users!inner(tg_id, lang)')
    .eq('status', 'PENDING').lt('created_at', cutoff).order('created_at').limit(20), 'recon.stuck');
  if (!stuck.length) return 0;

  let n = 0;
  for (const o of stuck) {
    try { await resolveOne(o, { notifyAdmin, notifyUser }); n++; }
    catch (e) { log.error('resolve failed', { ext: o.external_order_id, err: e.message }); }
    await sleep(1200);
  }
  return n;
}

/** Resolve a single order. Exported for the admin "retry" button. */
export async function resolveOne(o, { notifyAdmin, notifyUser }) {
  const ext  = o.external_order_id;
  const tgId = o.users?.tg_id;
  const lang = o.users?.lang || 'ar';
  const maxAttempts = Snum('recon_max_attempts', 6);

  // 1) already exists upstream?
  try {
    const found = await gg.findByExternalId(ext);
    const row = found?.data?.[0];
    if (row?.orderCode) {
      const full = await gg.getOrder(row.orderCode);
      const st = String(full.status || row.status || '').toUpperCase();

      if (UPSTREAM_FAILED.has(st)) {
        await rpc('refund_order', { p_ext: ext, p_error_code: 'UPSTREAM_' + st });
        await notifyUser?.(tgId, { state: 'FAILED', message: t(lang, 'order.reconFail') }, lang);
        return { state: 'REFUNDED' };
      }
      if (UPSTREAM_DONE.has(st) || full.delivery || full.lines?.length) {
        const done = await finishOrder(ext, full, o.charged_usd, notifyAdmin);
        await notifyUser?.(tgId, done, lang);
        return done;
      }
      // still processing upstream — wait for next cycle
      return { state: 'PENDING' };
    }
  } catch (e) {
    if (e instanceof GGError && (e.isAccount || e.code === 'MAINTENANCE')) return { state: 'PENDING' };
  }

  // 2) attempts exhausted → manual review (no auto refund)
  if (o.attempts >= maxAttempts) {
    await q(db.from('orders').update({ status: 'NEEDS_REVIEW', updated_at: new Date().toISOString() })
      .eq('external_order_id', ext), 'recon.review');
    notifyAdmin?.(t('ar', 'admin.reviewAlert', {
      ext, product: esc(o.product_name || o.product_slug), amount: money(o.charged_usd), err: o.error_code || '—',
    }));
    return { state: 'NEEDS_REVIEW' };
  }

  // 3) retry with the same idempotent id
  await q(db.from('orders').update({ attempts: o.attempts + 1, last_attempt_at: new Date().toISOString() })
    .eq('external_order_id', ext), 'recon.bump');
  try {
    const res = await gg.createOrder({ productSlug: o.product_slug, quantity: o.quantity, externalOrderId: ext });
    const done = await finishOrder(ext, res, o.charged_usd, notifyAdmin);
    await notifyUser?.(tgId, done, lang);
    return done;
  } catch (err) {
    const e = err instanceof GGError ? err : new GGError('UNKNOWN', String(err));
    if (e.isTerminal || e.isAccount) {
      await rpc('refund_order', { p_ext: ext, p_error_code: e.code });
      await notifyUser?.(tgId, { state: 'FAILED', message: t(lang, 'order.reconFail') }, lang);
      return { state: 'REFUNDED' };
    }
    await q(db.from('orders').update({ error_code: e.code }).eq('external_order_id', ext), 'recon.err');
    return { state: 'PENDING', code: e.code };
  }
}
