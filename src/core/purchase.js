// ============================================================
//  Purchase flow — the heart of the system
//
//  Mandatory order:
//    1. debit customer + open PENDING order   (one atomic SQL call)
//    2. call GGSoma with the same externalOrderId
//    3. success      → COMPLETED + deliver
//       final error  → refund + REFUNDED
//       temp error   → leave PENDING, refund NOTHING (reconciler decides)
//
//  Why never refund on timeout: the order may have succeeded upstream
//  and only the response was lost. Refunding would pay the customer
//  back while GGSoma already charged us.
//
//  Per-user lock: a customer tapping "confirm" 5 times must produce
//  ONE order, not five.
// ============================================================
import crypto from 'node:crypto';
import { gg, GGError } from '../services/ggsoma.js';
import { db, rpc, q, one } from '../lib/db.js';
import { Snum } from '../lib/settings.js';
import { round2, money, esc } from '../lib/fmt.js';
import { logger } from '../lib/logger.js';
import { getProduct } from './catalog.js';
import { isHealthy } from './health.js';
import { finalPrice } from './pricing.js';
import { checkMargin } from './guard.js';
import { t } from '../i18n/index.js';

const log = logger('purchase');

export const newExternalId = (tgId) =>
  `ax-${tgId}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

// ---------- per-user in-flight lock ----------
const inflight = new Set();
export const isBusy = (tgId) => inflight.has(Number(tgId));

/**
 * @param {{tgId:number, slug:string, quantity?:number, user:object, lang?:string, notifyAdmin?:Function}} p
 * @returns {Promise<{state:'DELIVERED'|'PENDING'|'FAILED', code?:string, message?:string, order?:object, delivery?:object}>}
 */
export async function purchase({ tgId, slug, quantity = 1, user, lang = 'ar', notifyAdmin }) {
  const id = Number(tgId);
  if (inflight.has(id)) return fail(t(lang, 'order.busy'), 'BUSY');
  inflight.add(id);
  try { return await doPurchase({ tgId: id, slug, quantity, user, lang, notifyAdmin }); }
  finally { inflight.delete(id); }
}

async function doPurchase({ tgId, slug, quantity, user, lang, notifyAdmin }) {
  if (!isHealthy()) return fail(t(lang, 'order.maint'), 'MAINTENANCE');

  const product = await getProduct(slug);
  if (!product || !product.visible || product.deleted_at) return fail(t(lang, 'order.gone'), 'GONE');
  if (product.paused)                                    return fail(t(lang, 'order.paused'), 'PAUSED');
  quantity = Math.max(1, Math.floor(Number(quantity) || 1));
  if (quantity > (product.max_quantity || 1))            return fail(t(lang, 'order.badQty'), 'BAD_QTY');
  if (!product.in_stock || product.stock_count < quantity) return fail(t(lang, 'order.noStock'), 'OUT_OF_STOCK');

  // last line of defence against selling at a loss
  const m = checkMargin(product);
  if (!m.ok) {
    notifyAdmin?.(t('ar', 'admin.alert.marginRejected', { name: esc(product.name), profit: money(m.profit) }));
    return fail(t(lang, 'order.paused'), 'MARGIN');
  }

  const unit   = finalPrice(product, user);
  const charge = round2(unit * quantity);
  const cost   = round2(Number(product.cost_price) * quantity);
  const ext    = newExternalId(tgId);

  // ---------- 1) atomic debit ----------
  try {
    await rpc('debit_and_open_order', {
      p_tg_id: tgId, p_slug: slug, p_name: product.name, p_provider: product.provider_key,
      p_qty: quantity, p_charge: charge, p_cost: cost, p_ext: ext,
    });
  } catch (e) {
    if (e.code === 'INSUFFICIENT_BALANCE') {
      return { state: 'FAILED', code: 'INSUFFICIENT_BALANCE', required: charge,
               message: t(lang, 'order.noBalance', { amount: money(charge) }) };
    }
    throw e;
  }

  // ---------- 2) fulfil ----------
  return attemptFulfil({ ext, slug, quantity, charge, lang, notifyAdmin });
}

/** Idempotent: same externalOrderId → same upstream order, no double charge */
export async function attemptFulfil({ ext, slug, quantity, charge, lang = 'ar', notifyAdmin }) {
  const cur = await one(db.from('orders').select('attempts').eq('external_order_id', ext).maybeSingle(), 'order.attempts');
  await q(db.from('orders').update({ attempts: (cur?.attempts ?? 0) + 1, last_attempt_at: new Date().toISOString() })
    .eq('external_order_id', ext), 'order.bump');

  let res;
  try {
    res = await gg.createOrder({ productSlug: slug, quantity, externalOrderId: ext });
  } catch (err) {
    const e = err instanceof GGError ? err : new GGError('UNKNOWN', String(err));
    log.warn('createOrder failed', { ext, code: e.code, http: e.http });

    if (e.isTerminal) {
      await rpc('refund_order', { p_ext: ext, p_error_code: e.code });
      return { state: 'FAILED', code: e.code, message: humanError(lang, e.code) };
    }
    if (e.isAccount) {
      await rpc('refund_order', { p_ext: ext, p_error_code: e.code });
      notifyAdmin?.(t('ar', 'admin.alert.accountIssue', { code: e.code, msg: esc(e.message), req: e.requestId || '—' }));
      return { state: 'FAILED', code: e.code, message: t(lang, 'order.accountIssue') };
    }
    // temporary → keep PENDING
    await q(db.from('orders').update({ error_code: e.code, updated_at: new Date().toISOString() })
      .eq('external_order_id', ext).eq('status', 'PENDING'), 'order.pendingErr');
    return { state: 'PENDING', code: e.code, message: t(lang, 'order.pending') };
  }

  return finishOrder(ext, res, charge, notifyAdmin);
}

/**
 * Persist a successful upstream order. Also used by the reconciler.
 * `res` is a GGSoma order object (from POST /orders or GET /orders/:code).
 */
export async function finishOrder(ext, res, charge, notifyAdmin) {
  const actual = Number(res.totalCharged ?? 0);

  if (charge != null && actual > Number(charge)) {
    notifyAdmin?.(t('ar', 'admin.alert.lossOnOrder', {
      ext, name: esc(res.product?.name || res.product?.slug || '—'),
      charged: money(charge), actual: money(actual),
    }));
  }
  if (res.balanceAfter != null && Number(res.balanceAfter) < Snum('low_wallet_alert', 20)) {
    notifyAdmin?.(t('ar', 'admin.alert.lowWallet', { balance: money(res.balanceAfter) }));
  }

  const delivery = res.lines?.length ? { lines: res.lines } : (res.delivery || null);

  await rpc('complete_order', {
    p_ext: ext, p_gg_code: res.orderCode || null, p_actual: actual,
    p_delivery: delivery, p_ref_pct: Snum('referral_pct', 0),
  });

  return { state: 'DELIVERED', order: res, delivery, deliveryType: res.deliveryType, ext };
}

const fail = (message, code) => ({ state: 'FAILED', message, code });

function humanError(lang, code) {
  const key = `order.err.${code}`;
  const s = t(lang, key);
  const specific = s !== key ? s : t(lang, 'order.genericFail');
  return s !== key ? `${specific} ${t(lang, 'order.refunded')}` : specific;
}
