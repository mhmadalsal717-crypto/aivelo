// ============================================================
//  Binance Pay — manual transfer via Pay ID, admin approves
//  Config: texts.binance_pay_id (set from admin → Texts)
// ============================================================
import { T, Snum, Sbool } from '../../lib/settings.js';
import { money, RULE, esc } from '../../lib/fmt.js';
import { t } from '../../i18n/index.js';
import { db, one } from '../../lib/db.js';
import { kb } from '../../bot/ui/kb.js';
import { to } from '../../bot/ui/nav.js';
import { ask } from '../../bot/ui/input.js';
import { openPayment, setPayment, getPaymentRow } from '../service.js';
import { askAmount, checkAmount } from '../flow.js';

const payId = () => T('binance_pay_id', 'ar', '').trim();
const looksLikeTxId = (s) => /^[A-Za-z0-9_-]{8,80}$/.test(String(s || '').trim());

const gw = {
  id: 'BINANCE_PAY',
  icon: '🅱️',
  manualReview: true,
  label:  (lang) => t(lang, 'pay.binance.name'),
  button: (lang) => t(lang, 'pay.binance.btn'),
  isEnabled:    () => Sbool('pay_binance', true),
  isConfigured: () => !!payId(),

  start: (ctx) => askAmount(ctx, gw),

  async onAmount(ctx, amountUsd) {
    if (!(await checkAmount(ctx, amountUsd))) return;
    const minutes = Snum('binance_session_min', 30);
    const pay = await openPayment({ tgId: ctx.from.id, method: 'BINANCE_PAY', amountUsd, minutes });

    // input TTL must cover the whole session
    await ask(ctx.from.id, 'pay_reference', { method: 'BINANCE_PAY', orderId: pay.order_id }, (minutes + 5) * 60_000);

    return ctx.reply(t(ctx, 'pay.binance.instructions', {
      amount: Number(amountUsd).toFixed(2), payId: payId(), minutes,
    }), {
      parse_mode: 'HTML',
      reply_markup: kb().add({ text: t(ctx, 'btn.cancel'), data: to('pay_cancel', pay.order_id), style: 'danger' }).build(),
    });
  },

  async onReference(ctx, orderId, txid, { notifyAdmin }) {
    txid = String(txid).trim();
    if (!looksLikeTxId(txid)) {
      await ask(ctx.from.id, 'pay_reference', { method: 'BINANCE_PAY', orderId }, 15 * 60_000);
      return ctx.reply(t(ctx, 'pay.binance.badTx'));
    }
    const row = await getPaymentRow(orderId);
    if (!row || row.status !== 'PENDING') return ctx.reply(t(ctx, 'topup.sessionEnded'));

    const dup = await one(db.from('payments').select('order_id').eq('external_id', txid).neq('order_id', orderId).maybeSingle(), 'binance.dup');
    if (dup) return ctx.reply(t(ctx, 'pay.binance.dupTx'));

    await setPayment(orderId, { external_id: txid, status: 'PENDING' });

    notifyAdmin?.(t('ar', 'admin.payNew', {
      rule: RULE, name: esc(ctx.from.first_name || ''), tg: ctx.from.id, amount: money(row.amount_usd), tx: esc(txid),
    }), kb()
      .add({ text: t('ar', 'admin.payBtn.approve', { amount: money(row.amount_usd) }), data: to('a_payok', orderId), style: 'success' }).row()
      .add({ text: t('ar', 'admin.payBtn.reject'), data: to('a_payno', orderId), style: 'danger' })
      .build());

    return ctx.reply(t(ctx, 'pay.binance.received', { rule: RULE, amount: money(row.amount_usd), tx: esc(txid) }),
      { parse_mode: 'HTML' });
  },
};

export default gw;
