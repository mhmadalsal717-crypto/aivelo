// ============================================================
//  Binance Pay — manual transfer via Pay ID, admin approves
//
//  Reference flow (matches the screenshots exactly):
//    pick method → instructions ("send ANY amount") → paste TxID
//    → admin verifies the transfer in his own Binance account
//    → taps approve and enters the deposited amount → the wallet
//      is credited atomically (credit_payment RPC, idempotent).
//
//  Config: texts.binance_pay_id — set from Admin → Payment info.
// ============================================================
import { T, Snum, Sbool } from '../../lib/settings.js';
import { RULE, esc, money, sleep } from '../../lib/fmt.js';
import { t } from '../../i18n/index.js';
import { db, one, rows } from '../../lib/db.js';
import { kb } from '../../bot/ui/kb.js';
import { to } from '../../bot/ui/nav.js';
import { ask } from '../../bot/ui/input.js';
import { openPayment, setPayment, getPaymentRow, creditPayment } from '../service.js';
import { creditedKb } from '../flow.js';
import { cfg } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { getPayTransactions } from '../../lib/binanceApi.js';

const log = logger('binance-pay-verify');

const payId = () => T('binance_pay_id', 'ar', '').trim();
const looksLikeTxId = (s) => /^[A-Za-z0-9_-]{8,80}$/.test(String(s || '').trim());

let blocked = false; // true once we've confirmed Binance geo-blocks this server

function reportBlocked() {
  if (blocked) return; // log this once, not on every caller that hits it
  blocked = true;
  log.error('permanently disabled: Binance blocks this server\'s IP from api.binance.com '
    + '(happens on every cloud host — Render, Railway, AWS, GCP — not fixable from here; '
    + 'the personal-account API is not meant for server-to-server use from a datacenter IP). '
    + 'Manual admin approval (already in place for every payment) is unaffected. '
    + 'The only durable automatic option is Binance\'s separate Merchant Pay API '
    + '(bpay.binanceapi.com, requires registering a Merchant account at merchant.binance.com) — '
    + 'a different integration, not a config fix.');
}

/** One-shot check for a single TxID. Returns the matching transaction, or
 *  null for "not found this attempt" — including when auto-verify isn't
 *  configured, is already known to be blocked, or the request itself fails.
 *  Never throws, so callers (the live countdown below, and the periodic
 *  poll) can keep going safely either way. */
async function fetchAndMatch(externalId) {
  if (!(cfg.binance.apiKey && cfg.binance.secretKey) || blocked) return null;
  try {
    const res = await getPayTransactions({ startTime: Date.now() - 3 * 24 * 60 * 60 * 1000 });
    const txs = res?.data || [];
    return txs.find((tx) => tx.transactionId === externalId
      && Number(tx.amount) > 0 && tx.currency === 'USDT') || null;
  } catch (e) {
    if (String(e.message || '').includes('restricted location')) reportBlocked();
    return null;
  }
}

const gw = {
  id: 'BINANCE_PAY',
  icon: '💠',
  style: 'success',            // green button on the top-up menu, like the reference
  manualReview: true,
  label:  (lang) => t(lang, 'pay.binance.name'),
  button: (lang) => t(lang, 'pay.binance.btn'),
  isEnabled:    () => Sbool('pay_binance', true),
  isConfigured: () => !!payId(),

  /** No amount step — the customer sends ANY amount (reference mechanism) */
  async start(ctx) {
    const minutes = Snum('binance_session_min', 30);
    const pay = await openPayment({ tgId: ctx.from.id, method: 'BINANCE_PAY', amountUsd: 0, minutes });

    // input TTL must cover the whole session
    await ask(ctx.from.id, 'pay_reference', { method: 'BINANCE_PAY', orderId: pay.order_id }, (minutes + 5) * 60_000);

    return {
      text: t(ctx, 'pay.binance.instructions', { payId: payId(), minutes }),
      kb: kb().add({ text: t(ctx, 'btn.cancel'), data: to('pay_cancel', pay.order_id) }).build(),
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

    // Live check — same feel as the reference bot: a short countdown while
    // we look for the transfer, then either instant credit or a graceful
    // "hasn't shown up yet" message. The admin is notified regardless
    // (below), so the customer is never stuck if auto-verify can't confirm.
    const seconds = 5;
    const msg = await ctx.reply(t(ctx, 'pay.binance.checking', { seconds }));
    for (let s = seconds - 1; s >= 0; s--) {
      await sleep(1000);
      const match = await fetchAndMatch(txid);
      if (match) {
        const r = await creditPayment(orderId, txid);
        if (r.credited) {
          await ctx.api.editMessageText(ctx.chat.id, msg.message_id,
            t(ctx, 'pay.binance.approved', { amount: money(r.amount), balance: money(r.new_balance) }),
            { parse_mode: 'HTML', reply_markup: creditedKb(ctx) }).catch(() => {});
          notifyAdmin?.(t('ar', 'admin.alert.deposit', { method: 'Binance Pay (auto)', amount: money(r.amount), tg: ctx.from.id }));
          return;
        }
      }
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id, t(ctx, 'pay.binance.checking', { seconds: s })).catch(() => {});
    }
    await ctx.api.editMessageText(ctx.chat.id, msg.message_id, t(ctx, 'pay.binance.notFoundYet')).catch(() => {});

    notifyAdmin?.(t('ar', 'admin.payNew', {
      name: esc(ctx.from.first_name || ''), tg: ctx.from.id, tx: esc(txid),
    }), kb()
      .add({ text: t('ar', 'admin.payBtn.approveAsk'), data: to('a_payok', orderId), style: 'success' }).row()
      .add({ text: t('ar', 'admin.payBtn.reject'), data: to('a_payno', orderId), style: 'danger' })
      .build());
  },
};

export default gw;

// ============================================================
//  Auto-verify — polls OUR Binance account's Pay history and
//  matches it against pending BINANCE_PAY orders by transactionId
//  (the TxID the customer pasted, stored as payments.external_id).
//
//  Runs only if BINANCE_API_KEY / BINANCE_SECRET_KEY are set — if
//  not, this is a no-op and the manual admin-approval flow (above)
//  keeps working exactly as before. Called from jobs/scheduler.js.
// ============================================================
export async function verifyPending({ bot, notifyAdmin }) {
  if (!(cfg.binance.apiKey && cfg.binance.secretKey) || blocked) return;

  const pending = await rows(
    db.from('payments').select('*, users!inner(tg_id, lang)')
      .eq('method', 'BINANCE_PAY').eq('status', 'PENDING').eq('credited', false)
      .not('external_id', 'is', null),
    'binance.verify.pending',
  );
  if (!pending.length) return;

  let txs;
  try {
    const res = await getPayTransactions({ startTime: Date.now() - 3 * 24 * 60 * 60 * 1000 });
    txs = res?.data || [];
  } catch (e) {
    if (String(e.message || '').includes('restricted location')) reportBlocked();
    else log.error('poll failed', e);
    return;
  }

  for (const row of pending) {
    // Match by the exact TxID the customer pasted. Require it to be an
    // incoming (positive) USDT transfer — matches the "send USDT" instructions.
    const match = txs.find((tx) => tx.transactionId === row.external_id
      && Number(tx.amount) > 0 && tx.currency === 'USDT');
    if (!match) continue;

    await setPayment(row.order_id, { amount_usd: Number(match.amount), payload: match });
    const r = await creditPayment(row.order_id, match.transactionId);
    if (!r.credited) continue;

    const lang = row.users.lang || 'ar';
    bot.api.sendMessage(row.users.tg_id,
      t(lang, 'pay.binance.approved', { amount: money(r.amount), balance: money(r.new_balance) }),
      { parse_mode: 'HTML', reply_markup: creditedKb({ lang }) }).catch(() => {});
    notifyAdmin?.(t('ar', 'admin.alert.deposit', { method: 'Binance Pay (auto)', amount: money(r.amount), tg: row.users.tg_id }));
  }
}
