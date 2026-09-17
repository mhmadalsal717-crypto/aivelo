// ============================================================
//  Admin: user lookup / balance / ban / message · vouchers · broadcast
// ============================================================
import { adminScreen, backTo } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { db, q, one, rows } from '../../../lib/db.js';
import { esc, money, RULE, fmtDate, statusIcon } from '../../../lib/fmt.js';
import { t, LANG_META } from '../../../i18n/index.js';

adminScreen('a_ufind', async (ctx) => {
  await ask(ctx.from.id, 'find_user');
  return { text: t(ctx, 'admin.findPrompt'), kb: backTo(ctx, 'admin') };
});

adminScreen('a_user', async (ctx, [tgId]) => {
  const u = await one(db.from('users').select('*').eq('tg_id', tgId).maybeSingle(), 'a_user');
  if (!u) return { text: t(ctx, 'admin.userNotFound'), kb: backTo(ctx, 'admin') };
  const [{ count: orders }, { count: invited }] = await Promise.all([
    q(db.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'COMPLETED')),
    q(db.from('users').select('id', { count: 'exact', head: true }).eq('referred_by', u.id)),
  ]);
  const text = t(ctx, 'admin.userTitle', {
    name: esc(u.first_name || '—'), username: u.username ? '@' + esc(u.username) : '', rule: RULE, tg: u.tg_id,
    lang: LANG_META[u.lang]?.name || '—', balance: money(u.balance), spent: money(u.total_spent), orders: orders ?? 0,
    ref: money(u.ref_earned), invited: invited ?? 0, date: fmtDate(u.created_at, ctx.lang), banned: u.banned ? t(ctx, 'admin.userBanned') : '',
  });
  const B = (k) => t(ctx, `admin.userBtn.${k}`);
  return { text, kb: kb()
    .text(B('balance'), to('a_ubal', tgId)).add({ text: u.banned ? B('unban') : B('ban'), data: to('a_uban', tgId), style: u.banned ? 'success' : 'danger' }).row()
    .text(B('orders'), to('a_uorders', tgId)).text(B('ledger'), to('a_uledger', tgId)).row()
    .text(B('message'), to('a_umsg', tgId)).row()
    .text(t(ctx, 'btn.back'), to('admin')).build() };
});

adminScreen('a_ubal', async (ctx, [tgId]) => {
  await ask(ctx.from.id, 'adj_balance', { tgId });
  return { text: t(ctx, 'admin.balPrompt'), kb: backTo(ctx, 'a_user', tgId) };
});

adminScreen('a_uban', async (ctx, [tgId]) => {
  const u = await one(db.from('users').select('banned').eq('tg_id', tgId).maybeSingle(), 'a_uban');
  await q(db.from('users').update({ banned: !u.banned }).eq('tg_id', tgId), 'a_uban.set');
  await ctx.answerCallbackQuery?.({ text: t(ctx, !u.banned ? 'admin.banned' : 'admin.unbanned') }).catch(() => {});
  return { goto: 'a_user', args: [tgId] };
});

adminScreen('a_umsg', async (ctx, [tgId]) => {
  await ask(ctx.from.id, 'user_msg', { tgId });
  return { text: t(ctx, 'admin.msgPrompt'), kb: backTo(ctx, 'a_user', tgId) };
});

adminScreen('a_uorders', async (ctx, [tgId]) => {
  const u = await one(db.from('users').select('id, first_name').eq('tg_id', tgId).maybeSingle(), 'a_uorders');
  if (!u) return { goto: 'admin' };
  const data = await rows(db.from('orders').select('product_name, charged_usd, status, created_at, external_order_id').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10));
  const body = data.map((o) => `${statusIcon(o.status)} ${esc(o.product_name || '')} · ${money(o.charged_usd)} · ${fmtDate(o.created_at, ctx.lang)}\n    <code>${o.external_order_id}</code>`).join('\n') || '—';
  return { text: `${t(ctx, 'admin.userOrdersTitle', { name: esc(u.first_name || tgId) })}\n${RULE}\n${body}`, kb: backTo(ctx, 'a_user', tgId) };
});

adminScreen('a_uledger', async (ctx, [tgId]) => {
  const u = await one(db.from('users').select('id, first_name').eq('tg_id', tgId).maybeSingle(), 'a_uledger');
  if (!u) return { goto: 'admin' };
  const data = await rows(db.from('ledger').select('amount, type, ref, created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(15));
  const body = data.map((r) => { const a = Number(r.amount); return `${a >= 0 ? '🟢 +' : '🔴 '}${a.toFixed(2)}$ · ${r.type} · <i>${fmtDate(r.created_at, ctx.lang)}</i>${r.ref ? `\n    <code>${esc(r.ref)}</code>` : ''}`; }).join('\n') || '—';
  return { text: `${t(ctx, 'admin.userLedgerTitle', { name: esc(u.first_name || tgId) })}\n${RULE}\n${body}`, kb: backTo(ctx, 'a_user', tgId) };
});

// ---------- vouchers ----------
adminScreen('a_vnew', async (ctx) => {
  await ask(ctx.from.id, 'voucher_new');
  return { text: t(ctx, 'admin.voucherTitle', { rule: RULE }),
    kb: kb().text(t(ctx, 'admin.vouchersList'), to('a_vlist')).row().text(t(ctx, 'btn.back'), to('admin')).build() };
});

adminScreen('a_vlist', async (ctx) => {
  const data = await rows(db.from('vouchers').select('code, amount, created_at').is('used_by', null).order('created_at', { ascending: false }).limit(30));
  if (!data.length) return { text: t(ctx, 'admin.vouchersNone'), kb: backTo(ctx, 'a_vnew') };
  const body = data.map((v) => `<code>${v.code}</code> · ${money(v.amount)}`).join('\n');
  return { text: `${t(ctx, 'admin.vouchersTitle', { n: data.length })}\n${RULE}\n${body}`, kb: backTo(ctx, 'a_vnew') };
});

// ---------- broadcast ----------
adminScreen('a_bc', async (ctx) => {
  const { count } = await q(db.from('users').select('id', { count: 'exact', head: true }).eq('banned', false));
  await ask(ctx.from.id, 'broadcast');
  return { text: t(ctx, 'admin.bcTitle', { rule: RULE, n: count ?? 0 }), kb: backTo(ctx, 'admin') };
});
