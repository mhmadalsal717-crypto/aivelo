// ============================================================
//  NOWPayments — any coin, any network, automatic via signed IPN
//  (replaces Cryptomus — same slot/flow, Cryptomus isn't usable from Syria)
//
//  Signature: HMAC-SHA512 of the JSON body with keys sorted (recursively),
//  signed with the IPN secret, sent in the `x-nowpayments-sig` header
//  (NOT inside the body — unlike Cryptomus, so the webhook route must
//  forward req.headers; see web/server.js).
//
//  Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
// ============================================================
import crypto from 'node:crypto';
import { cfg } from '../../config/index.js';
import { Snum, Sbool } from '../../lib/settings.js';
import { money } from '../../lib/fmt.js';
import { t } from '../../i18n/index.js';
import { logger } from '../../lib/logger.js';
import { kb } from '../../bot/ui/kb.js';
import { to } from '../../bot/ui/nav.js';
import { openPayment, setPayment, getPaymentRow, creditPayment } from '../service.js';
import { askAmount, checkAmount, creditedKb } from '../flow.js';

const log = logger('nowpayments');
const BASE = 'https://api.nowpayments.io/v1';

async function post(path, data) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'x-api-key': cfg.nowpayments.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!json) throw new Error('NOWPAYMENTS_BAD_RESPONSE');
  if (json.statusCode >= 400 || json.status === 'error') {
    const e = new Error(json.message || JSON.stringify(json)); e.code = 'NOWPAYMENTS_ERROR'; throw e;
  }
  return json;
}

export const createInvoice = ({ orderId, amountUsd, callbackUrl }) =>
  post('/invoice', {
    price_amount: Number(amountUsd).toFixed(2),
    price_currency: 'usd',
    order_id: String(orderId),
    order_description: `Wallet top-up ${orderId}`,
    ipn_callback_url: callbackUrl,
  });

/** NOWPayments recursively sorts object keys before signing — no nested keys
 *  in practice for IPN payloads, but sort deep anyway to match exactly. */
function sortDeep(o) {
  if (Array.isArray(o)) return o.map(sortDeep);
  if (o && typeof o === 'object') {
    return Object.keys(o).sort().reduce((acc, k) => { acc[k] = sortDeep(o[k]); return acc; }, {});
  }
  return o;
}

/** Verify `x-nowpayments-sig` header — timing-safe */
export function verifyWebhook(body, sigHeader) {
  if (!sigHeader || !body || typeof body !== 'object') return false;
  const hmac = crypto.createHmac('sha512', cfg.nowpayments.ipnSecret);
  hmac.update(JSON.stringify(sortDeep(body)));
  const expected = hmac.digest('hex');
  const a = Buffer.from(String(sigHeader)), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const FAILED = new Set(['failed', 'expired', 'refunded']);

const gw = {
  id: 'NOWPAYMENTS',
  icon: '⬛',
  style: 'primary',            // blue button on the top-up menu, same slot Cryptomus had
  manualReview: false,
  label:  (lang) => t(lang, 'pay.nowpayments.name'),
  button: (lang) => t(lang, 'pay.nowpayments.btn'),
  isEnabled:    () => Sbool('pay_nowpayments', true),
  isConfigured: () => !!(cfg.nowpayments.apiKey && cfg.nowpayments.ipnSecret && cfg.bot.webhookUrl),

  start: (ctx) => askAmount(ctx, gw),

  async onAmount(ctx, amountUsd) {
    if (!(await checkAmount(ctx, amountUsd))) return;
    if (!cfg.bot.webhookUrl) return ctx.reply(t(ctx, 'pay.nowpayments.unavailable'));

    const lifetimeMin = Snum('nowpayments_lifetime_min', 60);   // our own PENDING row TTL
    const pay = await openPayment({ tgId: ctx.from.id, method: 'NOWPAYMENTS', amountUsd, minutes: lifetimeMin });

    try {
      const inv = await createInvoice({
        orderId: pay.order_id, amountUsd,
        callbackUrl: `${cfg.bot.webhookUrl}/hooks/nowpayments/${cfg.bot.secret}`,
      });
      await setPayment(pay.order_id, { external_id: String(inv.id), pay_url: inv.invoice_url, payload: inv });

      return ctx.reply(t(ctx, 'pay.nowpayments.text', { amount: Number(amountUsd).toFixed(2) }), {
        parse_mode: 'HTML',
        reply_markup: kb().url(t(ctx, 'pay.nowpayments.open'), inv.invoice_url).row()
          .add({ text: t(ctx, 'btn.cancel'), data: to('pay_cancel', pay.order_id), style: 'danger' }).build(),
      });
    } catch (e) {
      await setPayment(pay.order_id, { status: 'FAILED' });
      log.error('createInvoice failed', e);
      return ctx.reply(t(ctx, 'pay.nowpayments.createFail'));
    }
  },

  /** `headers` is forwarded by web/server.js (added for this gateway — see server.js) */
  async onWebhook(body, { bot, notifyAdmin, headers }) {
    const sig = headers?.['x-nowpayments-sig'];
    if (!verifyWebhook(body, sig)) {
      log.warn('invalid signature', { order: body?.order_id });
      notifyAdmin?.(t('ar', 'admin.alert.badSig', { gw: 'NOWPayments' }));
      return { ok: false, reason: 'bad signature' };
    }
    const orderId = String(body.order_id || ''), status = String(body.payment_status || '');
    const row = await getPaymentRow(orderId);
    if (!row) return { ok: false, reason: 'unknown order' };
    const lang = row.users.lang || 'ar';

    // NOWPayments itself decides "finished" vs "partially_paid" — we trust its
    // status rather than re-comparing crypto amounts ourselves (mixed currencies).
    if (status === 'finished') {
      const r = await creditPayment(orderId, String(body.payment_id || ''));
      await setPayment(orderId, { payload: body });
      if (!r.credited) return { ok: true };

      bot.api.sendMessage(row.users.tg_id,
        t(lang, 'topup.credited', { amount: money(r.amount), balance: money(r.new_balance) }),
        { parse_mode: 'HTML', reply_markup: creditedKb({ lang }) }).catch(() => {});
      notifyAdmin?.(t('ar', 'admin.alert.deposit', { method: 'NOWPayments', amount: money(r.amount), tg: row.users.tg_id }));
      return { ok: true };
    }
    if (status === 'partially_paid') {
      await setPayment(orderId, { status: 'FAILED', payload: body });
      notifyAdmin?.(t('ar', 'admin.alert.underpaid', { order: orderId, need: money(row.amount_usd), paid: money(Number(body.actually_paid || 0)) }));
      bot.api.sendMessage(row.users.tg_id, t(lang, 'topup.underpaid')).catch(() => {});
      return { ok: true };
    }
    if (FAILED.has(status)) {
      await setPayment(orderId, { status: 'FAILED', payload: body });
      bot.api.sendMessage(row.users.tg_id, t(lang, 'topup.failed')).catch(() => {});
    }
    return { ok: true };   // waiting / confirming / confirmed / sending — no action yet
  },
};

export default gw;
