// ============================================================
//  Admin: dashboard + statistics + manual sync
// ============================================================
import { adminScreen, backTo, badge } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { db, q, rows } from '../../../lib/db.js';
import { money, RULE, esc } from '../../../lib/fmt.js';
import { t } from '../../../i18n/index.js';
import { isHealthy, healthReason } from '../../../core/health.js';
import { gg } from '../../../services/ggsoma.js';

const count = (b) => q(b.select('id', { count: 'exact', head: true })).then((r) => r.count ?? 0);

adminScreen('admin', async (ctx) => {
  const [users, wd, stuck, bp, paused] = await Promise.all([
    count(db.from('users')),
    count(db.from('withdrawals').eq('status', 'PENDING')),
    count(db.from('orders').in('status', ['PENDING', 'NEEDS_REVIEW'])),
    count(db.from('payments').eq('status', 'PENDING').not('external_id', 'is', null).in('method', ['BINANCE_PAY'])),
    q(db.from('products').select('slug', { count: 'exact', head: true }).eq('paused', true).is('deleted_at', null)).then((r) => r.count ?? 0),
  ]);

  const text = [
    t(ctx, 'admin.title'), RULE,
    t(ctx, 'admin.stats.health', { icon: isHealthy() ? '🟢' : '🔴', state: isHealthy() ? t(ctx, 'admin.healthy') : t(ctx, 'admin.unhealthy', { reason: healthReason() }) }),
    t(ctx, 'admin.stats.users', { n: users }),
    t(ctx, 'admin.stats.wd', { n: wd }),
    t(ctx, 'admin.stats.stuck', { n: stuck }),
    t(ctx, 'admin.stats.bp', { n: bp }),
    paused > 0 ? t(ctx, 'admin.stats.paused', { n: paused }) : null,
  ].filter(Boolean).join('\n');

  const B = (k, v) => t(ctx, `admin.btn.${k}`, v);
  const k = kb()
    .text(B('stats'), to('a_stats')).text(B('pricing'), to('a_pricing')).row()
    .text(B('products'), to('a_prods', 'all', '1')).text(B('providers'), to('a_provs')).row()
    .text(B('settings'), to('a_settings')).text(B('texts'), to('a_texts')).row()
    .text(B('tiers'), to('a_tiers')).text(B('emoji'), to('a_emoji')).row()
    .add({ text: B('pays', { badge: badge(bp) }), data: to('a_pays'), style: bp ? 'primary' : undefined })
    .add({ text: B('wds', { badge: badge(wd) }), data: to('a_wds'), style: wd ? 'primary' : undefined }).row()
    .add({ text: B('stuck', { badge: badge(stuck) }), data: to('a_stuck'), style: stuck ? 'danger' : undefined })
    .add({ text: B('paused', { badge: badge(paused) }), data: to('a_prods', 'paused', '1'), style: paused ? 'danger' : undefined }).row()
    .text(B('findUser'), to('a_ufind')).text(B('voucher'), to('a_vnew')).row()
    .text(B('broadcast'), to('a_bc')).text(B('sync'), to('a_sync')).row()
    .text(t(ctx, 'btn.close'), to('close'));
  return { text, kb: k.build() };
});

adminScreen('a_stats', async (ctx) => {
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const since7  = new Date(Date.now() - 7 * 864e5).toISOString();
  const [orders, bal, newUsers] = await Promise.all([
    rows(db.from('orders').select('charged_usd, actual_cost_usd, created_at').eq('status', 'COMPLETED').gte('created_at', since30)),
    rows(db.from('users').select('balance')),
    count(db.from('users').gte('created_at', since7)),
  ]);
  const sum = (arr, f) => arr.reduce((a, r) => a + Number(f(r) || 0), 0);
  const rev = sum(orders, (r) => r.charged_usd), cost = sum(orders, (r) => r.actual_cost_usd);
  const day = orders.filter((r) => Date.now() - new Date(r.created_at) < 864e5);
  let ggBal = '—';
  try { ggBal = money((await gg.balance()).balance); } catch {}

  const text = `${t(ctx, 'admin.statsTitle')}\n${RULE}\n` + t(ctx, 'admin.statsBody', {
    orders: orders.length, rev: money(rev), cost: money(cost), profit: money(rev - cost),
    pct: rev > 0 ? (((rev - cost) / rev) * 100).toFixed(1) : '0', rule: RULE,
    dayRev: money(sum(day, (r) => r.charged_usd)), dayN: day.length,
    held: money(sum(bal, (r) => r.balance)), newUsers, gg: ggBal,
  });
  return { text, kb: kb().text(t(ctx, 'btn.refresh'), to('a_stats')).row().text(t(ctx, 'btn.back'), to('admin')).build() };
});

adminScreen('a_sync', async (ctx) => {
  const { syncCatalog } = await import('../../../core/catalog.js');
  await ctx.answerCallbackQuery?.({ text: t(ctx, 'sys.working') }).catch(() => {});
  try {
    const r = await syncCatalog();
    let extra = '';
    try {
      const [b, u] = await Promise.all([gg.balance(), gg.usage()]);
      extra = '\n' + t(ctx, 'admin.syncGG', { rule: RULE, balance: money(b.balance), total: u.apiOrdersTotal, day: u.apiOrders24h, spend: money(u.apiSpendTotal) });
    } catch { extra = '\n' + t(ctx, 'admin.syncGGFail'); }
    return { text: t(ctx, 'admin.syncDone', { rule: RULE, providers: r.providers, products: r.products, added: r.added, restocked: r.restocked, removed: r.removed, details: r.detailsPulled }) + extra,
             kb: backTo(ctx, 'admin') };
  } catch (e) {
    return { text: t(ctx, 'admin.syncFail', { err: esc(e.code || e.message) }), kb: backTo(ctx, 'admin') };
  }
});
