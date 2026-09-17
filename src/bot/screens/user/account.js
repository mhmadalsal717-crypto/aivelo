// ============================================================
//  Account: profile / tier / orders / ledger / stock-alert toggle
// ============================================================
import { screen, to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { renderDelivery } from '../../ui/delivery.js';
import { db, q, one, ensureUser } from '../../../lib/db.js';
import { E } from '../../../lib/settings.js';
import { esc, money, RULE, bar, fmtDate, fmtTime, statusIcon, trim } from '../../../lib/fmt.js';
import { tierOf, nextTier } from '../../../core/pricing.js';
import { t } from '../../../i18n/index.js';

const PER_ORDERS = 5, PER_LEDGER = 10;

screen('profile', async (ctx) => {
  const u = await ensureUser(ctx.from);
  const tier = tierOf(u.total_spent);
  const [{ count: done }, { count: pend }] = await Promise.all([
    q(db.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'COMPLETED')),
    q(db.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'PENDING')),
  ]);

  const text = [
    t(ctx, 'profile.title', { emoji: E('profile') }), RULE,
    t(ctx, 'profile.id', { id: ctx.from.id }),
    t(ctx, 'profile.name', { name: esc(u.first_name || '—') }),
    t(ctx, 'profile.balance', { emoji: E('balance'), balance: money(u.balance) }),
    tier ? t(ctx, 'profile.tier', { emoji: tier.emoji, name: esc(tier.name), pct: tier.discount_pct }) : null,
    t(ctx, 'profile.purchases', { n: done ?? 0 }),
    (pend ?? 0) > 0 ? t(ctx, 'profile.pending', { n: pend }) : null,
    t(ctx, 'profile.spent', { amount: money(u.total_spent) }),
    t(ctx, 'profile.refEarned', { amount: money(u.ref_earned) }),
    t(ctx, 'profile.since', { date: fmtDate(u.created_at, ctx.lang) }),
  ].filter(Boolean).join('\n');

  const k = kb()
    .text(t(ctx, 'profile.btnOrders'), to('orders', '1')).text(t(ctx, 'profile.btnTier'), to('tier')).row()
    .text(t(ctx, 'profile.btnLedger'), to('ledger', '1')).text(t(ctx, 'profile.btnWithdraw'), to('wd_new')).row()
    .text(t(ctx, 'profile.btnWdProfile'), to('wd_profile')).text(t(ctx, 'profile.btnWdList'), to('wd_list')).row()
    .text(t(ctx, 'profile.btnNotif', { icon: u.notify_stock ? '🔔' : '🔕' }), to('notif')).row()
    .text(t(ctx, 'btn.close'), to('close'));
  return { text, kb: k.build() };
});

screen('notif', async (ctx) => {
  const u = await ensureUser(ctx.from);
  await q(db.from('users').update({ notify_stock: !u.notify_stock }).eq('id', u.id), 'notif.toggle');
  await ctx.answerCallbackQuery?.({ text: t(ctx, !u.notify_stock ? 'notif.on' : 'notif.off') }).catch(() => {});
  return { goto: 'profile' };
});

screen('tier', async (ctx) => {
  const u = await ensureUser(ctx.from);
  const cur = tierOf(u.total_spent), next = nextTier(u.total_spent), spent = Number(u.total_spent || 0);
  let progress;
  if (next) {
    const from = Number(cur?.min_spent || 0), need = Number(next.min_spent);
    const pct = Math.min(100, ((spent - from) / (need - from)) * 100);
    progress = ['', t(ctx, 'tier.progress'), `${bar(pct)} ${pct.toFixed(0)}%`,
      t(ctx, 'tier.of', { spent: money(spent), need: money(need) }),
      t(ctx, 'tier.remaining', { amount: money(need - spent) }), '',
      t(ctx, 'tier.next', { emoji: next.emoji, name: esc(next.name), pct: next.discount_pct })].join('\n');
  } else progress = `\n${t(ctx, 'tier.max')}`;

  return {
    text: `${t(ctx, 'tier.title', { emoji: E('star') })}\n${RULE}\n` +
          t(ctx, 'tier.current', { emoji: cur?.emoji || '', name: esc(cur?.name || '—'), pct: cur?.discount_pct || 0 }) + '\n' + progress,
    kb: kb().text(t(ctx, 'tier.all'), to('tiers')).row().text(t(ctx, 'btn.back'), to('profile')).build(),
  };
});

screen('tiers', async (ctx) => {
  const { tiers } = await import('../../../lib/settings.js');
  const body = tiers().map((x) => t(ctx, 'tier.row', { emoji: x.emoji, name: esc(x.name), min: money(x.min_spent), pct: x.discount_pct })).join('\n');
  return { text: `${t(ctx, 'tier.allTitle')}\n${RULE}\n${body}`, kb: kb().text(t(ctx, 'btn.back'), to('tier')).build() };
});

screen('orders', async (ctx, [pageStr]) => {
  const page = Math.max(1, Number(pageStr || 1)), from = (page - 1) * PER_ORDERS;
  const u = ctx.user;
  const { data, count } = await q(db.from('orders')
    .select('external_order_id, product_name, charged_usd, status, created_at', { count: 'exact' })
    .eq('user_id', u.id).order('created_at', { ascending: false }).range(from, from + PER_ORDERS - 1), 'orders.list');
  const pages = Math.max(1, Math.ceil((count || 0) / PER_ORDERS));

  if (!data?.length) return { text: `${t(ctx, 'orders.title')}\n${RULE}\n${t(ctx, 'orders.none')}`,
    kb: kb().text(t(ctx, 'btn.browse'), to('providers')).row().text(t(ctx, 'btn.back'), to('profile')).build() };

  const body = data.map((o) => t(ctx, 'orders.row', { icon: statusIcon(o.status), name: esc(o.product_name || ''), amount: money(o.charged_usd), date: fmtDate(o.created_at, ctx.lang) })).join('\n\n');
  const k = kb();
  for (const o of data.filter((x) => x.status === 'COMPLETED')) k.text(t(ctx, 'orders.view', { name: trim(o.product_name) }), to('order', o.external_order_id)).row();
  k.pager({ page, totalPages: pages, make: (n) => to('orders', String(n)), lang: ctx.lang });
  k.text(t(ctx, 'btn.back'), to('profile'));
  return { text: `${t(ctx, 'orders.title')}\n${RULE}\n${body}`, kb: k.build() };
});

screen('order', async (ctx, [ext]) => {
  const o = await one(db.from('orders').select('*').eq('external_order_id', ext).eq('user_id', ctx.user.id).maybeSingle(), 'order.get');
  if (!o) return { text: t(ctx, 'orders.notFound'), kb: kb().text(t(ctx, 'btn.back'), to('orders', '1')).build() };
  const text = [
    `${statusIcon(o.status)} <b>${esc(o.product_name || '')}</b>`, RULE,
    `${E('receipt')} <code>${esc(o.gg_order_code || o.external_order_id)}</code>`,
    `${E('money')} ${money(o.charged_usd)}` + (o.quantity > 1 ? ` × ${o.quantity}` : ''),
    `📅 ${fmtTime(o.created_at, ctx.lang)}`,
    o.status === 'COMPLETED' && o.delivery ? `\n${renderDelivery(ctx.lang, o.delivery)}` : null,
    o.status === 'PENDING'      ? `\n${t(ctx, 'orders.pendingNote')}` : null,
    o.status === 'REFUNDED'     ? `\n${t(ctx, 'orders.refundedNote')}` : null,
    o.status === 'NEEDS_REVIEW' ? `\n${t(ctx, 'orders.reviewNote')}` : null,
  ].filter(Boolean).join('\n');
  return { text, kb: kb().text(t(ctx, 'btn.back'), to('orders', '1')).build() };
});

screen('ledger', async (ctx, [pageStr]) => {
  const page = Math.max(1, Number(pageStr || 1)), from = (page - 1) * PER_LEDGER;
  const u = await ensureUser(ctx.from);
  const { data, count } = await q(db.from('ledger').select('amount, type, created_at', { count: 'exact' })
    .eq('user_id', u.id).order('created_at', { ascending: false }).range(from, from + PER_LEDGER - 1), 'ledger.list');
  const pages = Math.max(1, Math.ceil((count || 0) / PER_LEDGER));
  const body = data?.length
    ? data.map((r) => { const a = Number(r.amount);
        return `${a >= 0 ? '🟢 +' : '🔴 '}${a.toFixed(2)}$ · ${t(ctx, `ledger.type.${r.type}`)}\n    <i>${fmtDate(r.created_at, ctx.lang)}</i>`; }).join('\n')
    : t(ctx, 'ledger.none');
  const k = kb().pager({ page, totalPages: pages, make: (n) => to('ledger', String(n)), lang: ctx.lang });
  k.text(t(ctx, 'btn.back'), to('profile'));
  return { text: `${t(ctx, 'ledger.title')}\n${RULE}\n${t(ctx, 'ledger.balance', { emoji: E('balance'), balance: money(u.balance) })}\n\n${body}`, kb: k.build() };
});
