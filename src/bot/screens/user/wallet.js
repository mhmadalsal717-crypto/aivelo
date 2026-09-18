// ============================================================
//  Wallet: top-up (gateway list) / payment log / voucher / withdrawals
// ============================================================
import { screen, to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { db, rows, ensureUser } from '../../../lib/db.js';
import { E, S, Snum } from '../../../lib/settings.js';
import { esc, money, RULE, fmtDate, statusIcon } from '../../../lib/fmt.js';
import { t } from '../../../i18n/index.js';
import { activeGateways, gateway, methodLabel } from '../../../payments/index.js';
import { setPayment } from '../../../payments/service.js';
import * as stars from '../../../payments/gateways/stars.js';

// ---------- top-up: list gateways ----------
screen('topup', async (ctx) => {
  const gws = activeGateways();
  if (!gws.length) return {
    text: t(ctx, 'topup.none'),
    kb: kb().add({ text: t(ctx, 'topup.back'), data: to('home'), style: 'danger' }).build(),
  };
  const k = kb();
  for (const g of gws) k.add({ text: g.button(ctx.lang), data: to('pay', g.id), style: g.style || (g.manualReview ? 'primary' : 'success') }).row();
  k.add({ text: t(ctx, 'topup.back'), data: to('home'), style: 'danger' });
  return { text: t(ctx, 'topup.pick'), kb: k.build() };
});

/** Generic gateway entry: n:pay:<GATEWAY_ID> */
screen('pay', async (ctx, [id]) => {
  const g = gateway(id);
  if (!g || !g.isEnabled()) return { text: t(ctx, 'topup.unknownMethod'), kb: kb().text(t(ctx, 'btn.back'), to('topup')).build() };
  if (!g.isConfigured()) return { text: t(ctx, 'topup.notConfigured', { name: g.label(ctx.lang) }), kb: kb().text(t(ctx, 'btn.back'), to('topup')).build() };
  return g.start(ctx);
});

screen('pay_cancel', async (ctx, [orderId]) => {
  const { clear } = await import('../../ui/input.js');
  await clear(ctx.from.id);
  await setPayment(orderId, { status: 'CANCELLED' });
  await ctx.answerCallbackQuery?.({ text: t(ctx, 'sys.cancelled') }).catch(() => {});
  return { goto: 'topup' };
});

// Stars specifics (packs / custom)
screen('st_custom', async (ctx) => {
  const { min, max } = stars.limits();
  await ask(ctx.from.id, 'pay_amount', { method: 'STARS' });
  return {
    text: `${t(ctx, 'pay.stars.customTitle')}\n${RULE}\n${t(ctx, 'pay.stars.range', { min, max })}\n\n${t(ctx, 'pay.stars.customPrompt')}`,
    kb: kb().add({ text: t(ctx, 'btn.cancel'), data: to('pay', 'STARS'), style: 'danger' }).build(),
  };
});

screen('pay_log', async (ctx) => {
  const u = ctx.user;
  const data = await rows(db.from('payments').select('method, amount_usd, stars, status, created_at')
    .eq('user_id', u.id).order('created_at', { ascending: false }).limit(10), 'paylog');
  const body = data.length
    ? data.map((p) => `${statusIcon(p.status)} ${methodLabel(ctx.lang, p.method)} · ${money(p.amount_usd)}` +
        (p.stars ? ` (${p.stars}⭐️)` : '') + `\n    <i>${fmtDate(p.created_at, ctx.lang)}</i>`).join('\n')
    : t(ctx, 'topup.logNone');
  return { text: `${t(ctx, 'topup.logTitle')}\n${RULE}\n${body}`, kb: kb().text(t(ctx, 'btn.back'), to('topup')).build() };
});

// ---------- voucher ----------
screen('voucher', async (ctx) => {
  await ask(ctx.from.id, 'voucher');
  const su = S('support_user').replace(/^@/, '');
  const k = kb();
  if (su) k.url(t(ctx, 'voucher.request'), `https://t.me/${su}`).row();
  k.text(t(ctx, 'btn.close'), to('close'));
  return { text: `<blockquote>${E('card')} <b>${t(ctx, 'voucher.title')}</b></blockquote>\n\n${t(ctx, 'voucher.prompt')}`, kb: k.build() };
});

// ---------- withdrawals ----------
screen('wd_profile', async (ctx) => {
  const u = await ensureUser(ctx.from);
  const body = u.binance_id ? t(ctx, 'wd.hasId', { id: esc(u.binance_id) }) : t(ctx, 'wd.noId');
  return { text: `${t(ctx, 'wd.profileTitle')}\n${RULE}\n${body}`,
    kb: kb().text(t(ctx, 'wd.editBtn'), to('wd_edit')).row().text(t(ctx, 'btn.back'), to('profile')).build() };
});

screen('wd_edit', async (ctx) => {
  await ask(ctx.from.id, 'binance_id');
  return { text: t(ctx, 'wd.editPrompt'), kb: kb().text(t(ctx, 'btn.back'), to('wd_profile')).build() };
});

screen('wd_new', async (ctx) => {
  const u = await ensureUser(ctx.from);
  const min = Snum('min_withdraw', 5);
  if (!u.binance_id) return { text: t(ctx, 'wd.noId'),
    kb: kb().text(t(ctx, 'wd.editBtn'), to('wd_edit')).row().text(t(ctx, 'btn.back'), to('profile')).build() };
  if (Number(u.balance) < min) return {
    text: `${t(ctx, 'wd.newTitle')}\n${RULE}\n${t(ctx, 'wd.min', { min: money(min) })}\n${t(ctx, 'wd.yourBal', { balance: money(u.balance) })}`,
    kb: kb().text(t(ctx, 'btn.back'), to('profile')).build() };
  await ask(ctx.from.id, 'withdraw');
  return { text: `${t(ctx, 'wd.newTitle')}\n${RULE}\n${t(ctx, 'wd.yourBal', { balance: money(u.balance) })}\n${t(ctx, 'wd.min', { min: money(min) })}\n\n${t(ctx, 'wd.prompt')}`,
    kb: kb().text(t(ctx, 'btn.back'), to('profile')).build() };
});

screen('wd_list', async (ctx) => {
  const data = await rows(db.from('withdrawals').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending: false }).limit(10), 'wd.list');
  const body = data.length
    ? data.map((w) => `${statusIcon(w.status)} ${money(w.amount)} · ${fmtDate(w.created_at, ctx.lang)}` + (w.admin_note ? `\n    <i>${esc(w.admin_note)}</i>` : '')).join('\n')
    : t(ctx, 'wd.listNone');
  return { text: `${t(ctx, 'wd.listTitle')}\n${RULE}\n${body}`, kb: kb().text(t(ctx, 'btn.back'), to('profile')).build() };
});
