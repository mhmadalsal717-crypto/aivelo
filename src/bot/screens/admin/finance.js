// ============================================================
//  Admin: withdrawals / manual payments review / stuck orders
// ============================================================
import { adminScreen, backTo } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { db, q, one, rows, rpc } from '../../../lib/db.js';
import { esc, money, RULE, fmtDate, statusIcon, trim } from '../../../lib/fmt.js';
import { T } from '../../../lib/settings.js';
import { t } from '../../../i18n/index.js';
import { getPaymentRow, creditPayment, setPayment, depositLimits } from '../../../payments/service.js';
import { manualGateways, gateway, methodLabel } from '../../../payments/index.js';

// ---------- withdrawals ----------
adminScreen('a_wds', async (ctx) => {
  const data = await rows(db.from('withdrawals').select('*, users!inner(tg_id, first_name)').eq('status', 'PENDING').order('created_at').limit(15), 'a_wds');
  if (!data.length) return { text: t(ctx, 'admin.wdsNone'), kb: backTo(ctx, 'admin') };
  const k = kb();
  for (const w of data) k.text(t(ctx, 'admin.wdRow', { id: w.id, amount: money(w.amount), name: esc(w.users.first_name || w.users.tg_id) }), to('a_wd', String(w.id))).row();
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: `${t(ctx, 'admin.wdsTitle')}\n${RULE}`, kb: k.build() };
});

adminScreen('a_wd', async (ctx, [id]) => {
  const w = await one(db.from('withdrawals').select('*, users!inner(tg_id, first_name)').eq('id', id).maybeSingle(), 'a_wd');
  if (!w) return { goto: 'a_wds' };
  return { text: t(ctx, 'admin.wdTitle', { id: w.id, rule: RULE, name: esc(w.users.first_name || ''), tg: w.users.tg_id, amount: money(w.amount), binance: esc(w.binance_id || '—'), date: fmtDate(w.created_at, ctx.lang) }),
    kb: kb().add({ text: t(ctx, 'admin.wdBtn.paid'), data: to('a_wdok', id), style: 'success' }).row()
            .add({ text: t(ctx, 'admin.wdBtn.reject'), data: to('a_wdno', id), style: 'danger' }).row()
            .text(t(ctx, 'btn.back'), to('a_wds')).build() };
});

adminScreen('a_wdok', async (ctx, [id]) => {
  const w = await one(db.from('withdrawals').select('*, users!inner(tg_id, lang)').eq('id', id).maybeSingle(), 'a_wdok');
  if (!w || w.status !== 'PENDING') return { text: t(ctx, 'admin.wdNotPending'), kb: backTo(ctx, 'a_wds') };
  await q(db.from('withdrawals').update({ status: 'PAID', processed_at: new Date().toISOString() }).eq('id', id), 'a_wdok.set');
  ctx.api.sendMessage(w.users.tg_id, t(w.users.lang || 'ar', 'wd.paid', { amount: money(w.amount) }), { parse_mode: 'HTML' }).catch(() => {});
  return { text: t(ctx, 'admin.wdPaid', { id }), kb: backTo(ctx, 'a_wds') };
});

adminScreen('a_wdno', async (ctx, [id]) => {
  const w = await one(db.from('withdrawals').select('*, users!inner(tg_id, lang)').eq('id', id).maybeSingle(), 'a_wdno');
  if (!w || w.status !== 'PENDING') return { text: t(ctx, 'admin.wdNotPending'), kb: backTo(ctx, 'a_wds') };
  await rpc('reject_withdrawal', { p_id: Number(id), p_note: t(ctx, 'admin.wdRejectNote') });
  ctx.api.sendMessage(w.users.tg_id, t(w.users.lang || 'ar', 'wd.rejected', { amount: money(w.amount), note: '' }), { parse_mode: 'HTML' }).catch(() => {});
  return { text: t(ctx, 'admin.wdRejected'), kb: backTo(ctx, 'a_wds') };
});

// ---------- manual payments (all manualReview gateways) ----------
adminScreen('a_pays', async (ctx) => {
  const methods = manualGateways().map((g) => g.id);
  const data = await rows(db.from('payments').select('*, users!inner(tg_id, first_name)')
    .eq('status', 'PENDING').in('method', methods).not('external_id', 'is', null).order('created_at').limit(15), 'a_pays');
  if (!data.length) return { text: t(ctx, 'admin.paysNone'), kb: backTo(ctx, 'admin') };
  const k = kb();
  for (const p of data) {
    const label = Number(p.amount_usd) > 0
      ? t(ctx, 'admin.payRow', { amount: money(p.amount_usd), name: esc(p.users.first_name || p.users.tg_id) })
      : t(ctx, 'admin.payRowTx', { name: esc(p.users.first_name || p.users.tg_id), tx: esc(p.external_id || '') });
    k.text(`${methodLabel(ctx.lang, p.method)} ${label}`, to('a_pay', p.order_id)).row();
  }
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.paysTitle', { rule: RULE }), kb: k.build() };
});

adminScreen('a_pay', async (ctx, [orderId]) => {
  const row = await getPaymentRow(orderId);
  if (!row) return { text: t(ctx, 'admin.payNotFound'), kb: backTo(ctx, 'a_pays') };
  const hasAmount = Number(row.amount_usd) > 0;
  return { text: t(ctx, 'admin.payTitle', { rule: RULE, name: esc(row.users.first_name || ''), tg: row.users.tg_id,
                                     amount: hasAmount ? money(row.amount_usd) : '—', tx: esc(row.external_id || '—'), date: fmtDate(row.created_at, ctx.lang) }),
    kb: kb().add(hasAmount
            ? { text: t(ctx, 'admin.payBtn.approve', { amount: money(row.amount_usd) }), data: to('a_payok', orderId), style: 'success' }
            : { text: t(ctx, 'admin.payBtn.approveAsk'), data: to('a_payok', orderId), style: 'success' }).row()
            .add({ text: t(ctx, 'admin.payBtn.reject'), data: to('a_payno', orderId), style: 'danger' }).row()
            .text(t(ctx, 'btn.back'), to('a_pays')).build() };
});

adminScreen('a_payok', async (ctx, [orderId]) => {
  const row = await getPaymentRow(orderId);
  if (!row) return { text: t(ctx, 'admin.payNotFound'), kb: backTo(ctx, 'a_pays') };
  // "Any amount" flow (Binance Pay): the admin enters the deposited amount now
  if (!(Number(row.amount_usd) > 0)) {
    await ask(ctx.from.id, 'a_pay_amount', { orderId });
    return { text: t(ctx, 'admin.payAskAmount'), kb: backTo(ctx, 'a_pays') };
  }
  const r = await creditPayment(orderId, row.external_id);
  if (!r.credited) return { text: t(ctx, 'admin.payAlready', { balance: money(r.new_balance) }), kb: backTo(ctx, 'a_pays') };
  const lang = row.users.lang || 'ar';
  ctx.api.sendMessage(row.users.tg_id, t(lang, 'pay.binance.approved', { amount: money(r.amount), balance: money(r.new_balance) }), { parse_mode: 'HTML' }).catch(() => {});
  return { text: t(ctx, 'admin.payApproved', { amount: money(r.amount), balance: money(r.new_balance) }), kb: backTo(ctx, 'a_pays') };
});

adminScreen('a_payno', async (ctx, [orderId]) => {
  const row = await getPaymentRow(orderId);
  if (!row) return { text: t(ctx, 'admin.payNotFound'), kb: backTo(ctx, 'a_pays') };
  if (row.credited) return { text: t(ctx, 'admin.payCantReject'), kb: backTo(ctx, 'a_pays') };
  await setPayment(orderId, { status: 'FAILED' });
  ctx.api.sendMessage(row.users.tg_id, t(row.users.lang || 'ar', 'pay.binance.rejected')).catch(() => {});
  return { text: t(ctx, 'admin.payRejected'), kb: backTo(ctx, 'a_pays') };
});

// ---------- payment info: credentials + gateway status in one place ----------
adminScreen('a_payinfo', async (ctx) => {
  const bin = gateway('BINANCE_PAY'), crypt = gateway('CRYPTOMUS');
  const payId = T('binance_pay_id', 'ar', '').trim();
  const { min, max } = depositLimits();

  const cryptoState = !crypt.isEnabled() ? t(ctx, 'sys.off')
                    : crypt.isConfigured() ? t(ctx, 'sys.on')
                    : '⚠️';
  const lines = [
    t(ctx, 'admin.payInfoTitle', { rule: RULE }),
    payId ? t(ctx, 'admin.payInfoBinance', { id: esc(payId) }) : t(ctx, 'admin.payInfoBinanceEmpty'),
    bin.isEnabled() && !payId ? `   ↳ ${t(ctx, 'admin.payInfoEdit')}` : null,
    t(ctx, 'admin.payInfoCrypto', { state: cryptoState }),
    crypt.isEnabled() && !crypt.isConfigured() ? t(ctx, 'admin.payInfoCryptoHint') : null,
    t(ctx, 'admin.payInfoStars'),
    t(ctx, 'admin.payInfoLimits', { min, max }),
  ].filter(Boolean).join('\n');

  const k = kb()
    .text(t(ctx, 'admin.payInfoEdit'), to('a_text', 'binance_pay_id', 'x')).row()
    .text(t(ctx, 'admin.payInfoSettings'), to('a_set', 'payments')).row()
    .text(t(ctx, 'btn.back'), to('admin'));
  return { text: lines, kb: k.build() };
});

// ---------- stuck orders ----------
adminScreen('a_stuck', async (ctx) => {
  const data = await rows(db.from('orders').select('external_order_id, product_name, charged_usd, status, attempts, error_code, users!inner(tg_id)')
    .in('status', ['PENDING', 'NEEDS_REVIEW']).order('created_at').limit(12), 'a_stuck');
  if (!data.length) return { text: t(ctx, 'admin.stuckNone'), kb: backTo(ctx, 'admin') };
  const body = data.map((o) => t(ctx, 'admin.stuckRow', { icon: statusIcon(o.status), name: esc(o.product_name || ''), amount: money(o.charged_usd), ext: o.external_order_id, tg: o.users.tg_id, attempts: o.attempts, err: o.error_code || '—' })).join('\n\n');
  const k = kb();
  for (const o of data.filter((x) => x.status === 'NEEDS_REVIEW')) {
    k.text(`${t(ctx, 'admin.stuckBtn.retry')} ${trim(o.product_name, 14)}`, to('a_oretry', o.external_order_id))
     .add({ text: t(ctx, 'admin.stuckBtn.refund'), data: to('a_refund', o.external_order_id, 'ask'), style: 'danger' }).row();
  }
  k.text(t(ctx, 'btn.refresh'), to('a_stuck')).text(t(ctx, 'btn.back'), to('admin'));
  return { text: `${t(ctx, 'admin.stuckTitle')}\n${RULE}\n${body}\n\n${t(ctx, 'admin.stuckFoot')}`, kb: k.build() };
});

adminScreen('a_refund', async (ctx, [ext, step]) => {
  const o = await one(db.from('orders').select('charged_usd').eq('external_order_id', ext).maybeSingle(), 'a_refund');
  if (!o) return { goto: 'a_stuck' };
  if (step !== 'yes') return { text: t(ctx, 'admin.refundConfirm', { rule: RULE, ext, amount: money(o.charged_usd) }),
    kb: kb().add({ text: t(ctx, 'btn.yes'), data: to('a_refund', ext, 'yes'), style: 'danger' }).text(t(ctx, 'btn.no'), to('a_stuck')).build() };
  await rpc('refund_order', { p_ext: ext, p_error_code: 'ADMIN_REFUND' });
  return { text: t(ctx, 'admin.refunded', { ext }), kb: backTo(ctx, 'a_stuck') };
});

adminScreen('a_oretry', async (ctx, [ext]) => {
  const { resolveOne } = await import('../../../core/reconciler.js');
  const { notifyAdmin, sendResult } = await import('../../index.js');
  const o = await one(db.from('orders').select('*, users!inner(tg_id, lang)').eq('external_order_id', ext).maybeSingle(), 'a_oretry');
  if (!o) return { goto: 'a_stuck' };
  // give it a fresh attempt budget
  await q(db.from('orders').update({ status: 'PENDING', attempts: 0 }).eq('external_order_id', ext), 'a_oretry.reset');
  const r = await resolveOne({ ...o, status: 'PENDING', attempts: 0 }, { notifyAdmin, notifyUser: sendResult });
  return { text: t(ctx, 'admin.retried', { state: r?.state || '—' }), kb: backTo(ctx, 'a_stuck') };
});
