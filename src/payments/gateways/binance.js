// ============================================================
//  Binance Pay — manual transfer via Pay ID, admin approves
//  Config: texts.binance_pay_id (set from admin → Texts)
//
//  Flow (matches the reference bot exactly):
//    1. Customer picks Binance → session opens IMMEDIATELY, no amount
//       ("أرسل أي مبلغ USDT" — any amount works)
//    2. Customer pastes the TxID from the Binance receipt
//    3. Admin reviews → enters the ACTUAL received amount → credit
// ============================================================
import { T, Snum, Sbool } from '../../lib/settings.js';
import { RULE, esc } from '../../lib/fmt.js';
import { t } from '../../i18n/index.js';
import { db, one } from '../../lib/db.js';
import { kb } from '../../bot/ui/kb.js';
import { to } from '../../bot/ui/nav.js';
import { ask } from '../../bot/ui/input.js';
import { openPayment, setPayment, getPaymentRow } from '../service.js';

const payId = () => T('binance_pay_id', 'ar', '').trim();
const looksLikeTxId = (s) => /^[A-Za-z0-9_-]{8,80}$/.test(String(s || '').trim());

const gw = {
  id: 'BINANCE_PAY',
  icon: '🟡',
  style: 'success',          // green button on the top-up screen
  manualReview: true,
  label:  (lang) => t(lang, 'pay.binance.name'),
  button: (lang) => t(lang, 'pay.binance.btn'),
  isEnabled:    () => Sbool('pay_binance', true),
  isConfigured: () => !!payId(),

  /** No amount step — open the session right away and wait for the TxID */
  async start(ctx) {
    const minutes = Snum('binance_session_min', 30);
    const pay = await openPayment({ tgId: ctx.from.id, method: 'BINANCE_PAY', amountUsd: 0, minutes });

    // input TTL must cover the whole session
    await ask(ctx.from.id, 'pay_reference', { method: 'BINANCE_PAY', orderId: pay.order_id }, (minutes + 5) * 60_000);

    return {
      text: t(ctx, 'pay.binance.instructions', { payId: payId(), minutes }),
      kb: kb().add({ text: t(ctx, 'btn.cancel'), data: to('pay_cancel', pay.order_id), style: 'danger' }).build(),
    };
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

    // amount is unknown at this point — admin enters it on approval
    notifyAdmin?.(t('ar', 'admin.payNew', {
      rule: RULE, name: esc(ctx.from.first_name || ''), tg: ctx.from.id, tx: esc(txid),
    }), kb()
      .add({ text: t('ar', 'admin.payBtn.approveNoAmt'), data: to('a_payamt', orderId), style: 'success' }).row()
      .add({ text: t('ar', 'admin.payBtn.reject'), data: to('a_payno', orderId), style: 'danger' })
      .build());

    return ctx.reply(t(ctx, 'pay.binance.received', { rule: RULE, tx: esc(txid) }),
      { parse_mode: 'HTML' });
  },
};

export default gw;
