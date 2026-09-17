// ============================================================
//  Cryptomus — any coin, any network, automatic via signed webhook
//
//  Signature: md5( base64(json_body) + API_KEY ) in header `sign`
//  Webhook:   same, after removing `sign` from body, with PAYMENT key.
//  We sign the exact bytes we send (JSON.stringify once).
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

const log = logger('cryptomus');
const BASE = 'https://api.cryptomus.com/v1';

const md5  = (s) => crypto.createHash('md5').update(s).digest('hex');
const sign = (bodyStr, key) => md5(Buffer.from(bodyStr).toString('base64') + key);

async function post(path, data) {
  const body = JSON.stringify(data);
  const res = await fetch(BASE + path, {
    method: 'POST', body,
    headers: { merchant: cfg.cryptomus.merchant, sign: sign(body, cfg.cryptomus.apiKey), 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => null);
  if (!json) throw new Error('CRYPTOMUS_BAD_RESPONSE');
  if (json.state !== 0) { const e = new Error(json.message || JSON.stringify(json.errors || json)); e.code = 'CRYPTOMUS_ERROR'; throw e; }
  return json.result;
}

export const createInvoice = ({ orderId, amountUsd, callbackUrl, returnUrl, lifetimeSec = 3600 }) =>
  post('/payment', { amount: Number(amountUsd).toFixed(2), currency: 'USD', order_id: String(orderId),
    url_callback: callbackUrl, url_return: returnUrl, lifetime: lifetimeSec, is_payment_multiple: false });

export const getPayment = ({ orderId, uuid }) => post('/payment/info', uuid ? { uuid } : { order_id: String(orderId) });

/** Verify webhook signature — timing-safe */
export function verifyWebhook(payload) {
  if (!payload || typeof payload !== 'object' || !payload.sign) return false;
  const { sign: received, ...rest } = payload;
  const expected = sign(JSON.stringify(rest), cfg.cryptomus.paymentKey || cfg.cryptomus.apiKey);
  const a = Buffer.from(String(received)), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const PAID   = new Set(['paid', 'paid_over']);
const FAILED = new Set(['fail', 'cancel', 'system_fail', 'wrong_amount']);

const gw = {
  id: 'CRYPTOMUS',
  icon: '🪙',
  manualReview: false,
  label:  (lang) => t(lang, 'pay.cryptomus.name'),
  button: (lang) => t(lang, 'pay.cryptomus.btn'),
  isEnabled:    () => Sbool('pay_cryptomus', true),
  isConfigured: () => !!(cfg.cryptomus.merchant && cfg.cryptomus.apiKey && cfg.bot.webhookUrl),

  start: (ctx) => askAmount(ctx, gw),

  async onAmount(ctx, amountUsd) {
    if (!(await checkAmount(ctx, amountUsd))) return;
    if (!cfg.bot.webhookUrl) return ctx.reply(t(ctx, 'pay.cryptomus.unavailable'));

    const lifetimeMin = Snum('cryptomus_lifetime_min', 60);
    const pay = await openPayment({ tgId: ctx.from.id, method: 'CRYPTOMUS', amountUsd, minutes: lifetimeMin });

    try {
      const me = await ctx.api.getMe();
      const inv = await createInvoice({
        orderId: pay.order_id, amountUsd,
        callbackUrl: `${cfg.bot.webhookUrl}/hooks/cryptomus/${cfg.bot.secret}`,
        returnUrl: `https://t.me/${me.username}`,
        lifetimeSec: lifetimeMin * 60,
      });
      await setPayment(pay.order_id, { external_id: inv.uuid, pay_url: inv.url, payload: inv });

      return ctx.reply(t(ctx, 'pay.cryptomus.text', { amount: Number(amountUsd).toFixed(2) }), {
        parse_mode: 'HTML',
        reply_markup: kb().url(t(ctx, 'pay.cryptomus.open'), inv.url).row()
          .add({ text: t(ctx, 'btn.cancel'), data: to('pay_cancel', pay.order_id), style: 'danger' }).build(),
      });
    } catch (e) {
      await setPayment(pay.order_id, { status: 'FAILED' });
      log.error('createInvoice failed', e);
      return ctx.reply(t(ctx, 'pay.cryptomus.createFail'));
    }
  },

  async onWebhook(body, { bot, notifyAdmin }) {
    if (!verifyWebhook(body)) {
      log.warn('invalid signature', { order: body?.order_id });
      notifyAdmin?.(t('ar', 'admin.alert.badSig', { gw: 'Cryptomus' }));
      return { ok: false, reason: 'bad signature' };
    }
    const orderId = String(body.order_id || ''), status = String(body.status || '');
    const row = await getPaymentRow(orderId);
    if (!row) return { ok: false, reason: 'unknown order' };
    const lang = row.users.lang || 'ar';

    if (PAID.has(status)) {
      const paid = Number(body.payment_amount_usd ?? body.merchant_amount ?? body.amount ?? 0);
      if (paid > 0 && paid < Number(row.amount_usd) * 0.98) {
        await setPayment(orderId, { status: 'FAILED', payload: body });
        notifyAdmin?.(t('ar', 'admin.alert.underpaid', { order: orderId, need: money(row.amount_usd), paid: money(paid) }));
        bot.api.sendMessage(row.users.tg_id, t(lang, 'topup.underpaid')).catch(() => {});
        return { ok: true };
      }
      const r = await creditPayment(orderId, body.uuid);
      await setPayment(orderId, { payload: body });
      if (!r.credited) return { ok: true };

      bot.api.sendMessage(row.users.tg_id,
        t(lang, 'topup.credited', { amount: money(r.amount), balance: money(r.new_balance) }),
        { parse_mode: 'HTML', reply_markup: creditedKb({ lang }) }).catch(() => {});
      notifyAdmin?.(t('ar', 'admin.alert.deposit', { method: 'Cryptomus', amount: money(r.amount), tg: row.users.tg_id }));
      return { ok: true };
    }
    if (FAILED.has(status)) {
      await setPayment(orderId, { status: 'FAILED', payload: body });
      bot.api.sendMessage(row.users.tg_id, t(lang, 'topup.failed')).catch(() => {});
    }
    return { ok: true };
  },
};

export default gw;
