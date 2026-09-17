// ============================================================
//  Telegram Stars — native, instant, no external account
//
//  Flow: sendInvoice(XTR) → pre_checkout_query (answer <10s)
//        → successful_payment → credit
//  The bot-level event wiring lives in wireStars() below and is
//  called once from bot/index.js.
// ============================================================
import { Snum, S, Sbool } from '../../lib/settings.js';
import { money, RULE, round2 } from '../../lib/fmt.js';
import { t } from '../../i18n/index.js';
import { logger } from '../../lib/logger.js';
import { kb } from '../../bot/ui/kb.js';
import { to } from '../../bot/ui/nav.js';
import { ask } from '../../bot/ui/input.js';
import { openPayment, setPayment, getPaymentRow, creditPayment } from '../service.js';
import { creditedKb } from '../flow.js';

const log = logger('stars');

export const rate = () => Snum('stars_rate', 0.009);
export const starsToUsd = (n) => round2(Number(n) * rate());
export const limits = () => ({ min: Snum('stars_min', 50), max: Snum('stars_max', 100000) });
export const packs = () => String(S('stars_packs', '50,100,250,500,1000'))
  .split(',').map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n) && n > 0);

/** Create intent + send invoice */
export async function startStars(ctx, starCount) {
  const { min, max } = limits();
  if (!(starCount >= min && starCount <= max)) return ctx.reply(t(ctx, 'pay.stars.customRange', { min, max }));

  const usd = starsToUsd(starCount);
  const pay = await openPayment({ tgId: ctx.from.id, method: 'STARS', amountUsd: usd, stars: starCount, minutes: 60 });
  try {
    await ctx.api.raw.sendInvoice({
      chat_id: ctx.chat.id,
      title: t(ctx, 'pay.stars.invoiceTitle'),
      description: t(ctx, 'pay.stars.invoiceDesc', { n: starCount, usd: usd.toFixed(2) }),
      payload: pay.order_id, currency: 'XTR',
      prices: [{ label: `${starCount} ⭐️`, amount: starCount }],
    });
  } catch (e) {
    await setPayment(pay.order_id, { status: 'FAILED' });
    log.error('sendInvoice failed', e);
    return ctx.reply(t(ctx, 'pay.stars.invoiceFail'));
  }
}

/** Register pre_checkout + successful_payment on the bot */
export function wireStars(bot, { notifyAdmin }) {
  bot.on('pre_checkout_query', async (ctx) => {
    try {
      const row = await getPaymentRow(ctx.preCheckoutQuery.invoice_payload);
      const ok = !!row && row.status === 'PENDING' && new Date(row.expires_at) > new Date();
      await ctx.answerPreCheckoutQuery(ok, ok ? undefined : t(ctx, 'pay.stars.expired'));
    } catch {
      await ctx.answerPreCheckoutQuery(false, t(ctx, 'pay.stars.tempErr')).catch(() => {});
    }
  });

  bot.on('message:successful_payment', async (ctx) => {
    const sp = ctx.message.successful_payment;
    const orderId = sp.invoice_payload;
    try {
      const r = await creditPayment(orderId, sp.telegram_payment_charge_id);
      await setPayment(orderId, { payload: sp });
      if (!r.credited) return;
      await ctx.reply(t(ctx, 'pay.stars.credited', { rule: RULE, n: sp.total_amount, amount: money(r.amount), balance: money(r.new_balance) }),
        { parse_mode: 'HTML', reply_markup: creditedKb(ctx) });
      notifyAdmin?.(t('ar', 'admin.alert.deposit', { method: 'Stars', amount: money(r.amount), tg: ctx.from.id }));
    } catch (e) {
      log.error('credit failed', e);
      notifyAdmin?.(t('ar', 'admin.alert.starsCreditFail', { order: orderId, charge: sp.telegram_payment_charge_id, err: e.message }));
      await ctx.reply(t(ctx, 'pay.stars.creditFail'));
    }
  });
}

/** Admin refund helper */
export const refund = (api, userId, chargeId) =>
  api.raw.refundStarPayment({ user_id: userId, telegram_payment_charge_id: chargeId });

const gw = {
  id: 'STARS',
  icon: '⭐️',
  manualReview: false,
  label:  (lang) => t(lang, 'pay.stars.name'),
  button: (lang) => t(lang, 'pay.stars.btn'),
  isEnabled:    () => Sbool('pay_stars', true),
  isConfigured: () => true,

  /** Stars uses packs instead of a free amount */
  async start(ctx) {
    const { min, max } = limits();
    const k = kb();
    for (const n of packs()) {
      k.text(t(ctx, 'pay.stars.pack', { n, usd: starsToUsd(n).toFixed(2) }), to('st_buy', String(n))).row();
    }
    k.text(t(ctx, 'pay.stars.custom'), to('st_custom')).row();
    k.add({ text: t(ctx, 'btn.back'), data: to('topup'), style: 'danger' }).row();
    return {
      text: [t(ctx, 'pay.stars.title'), RULE, t(ctx, 'pay.stars.intro'), '',
             t(ctx, 'pay.stars.rate', { rate: rate() }), t(ctx, 'pay.stars.range', { min, max })].join('\n'),
      kb: k.build(),
    };
  },

  async onAmount(ctx, stars) { return startStars(ctx, Math.floor(stars)); },
};

export default gw;
