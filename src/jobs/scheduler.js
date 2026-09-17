// ============================================================
//  Background jobs — all periodic work lives here
//
//  Each job is self-rescheduling (setTimeout after completion) so a
//  slow run never overlaps with the next one, and intervals read
//  from settings apply without a restart.
// ============================================================
import { Snum, Sbool, loadAll } from '../lib/settings.js';
import { money, RULE, esc } from '../lib/fmt.js';
import { logger } from '../lib/logger.js';
import { db, rows, q } from '../lib/db.js';
import { kb } from '../bot/ui/kb.js';
import { to } from '../bot/ui/nav.js';
import { syncCatalog } from '../core/catalog.js';
import { enforceMargins } from '../core/guard.js';
import { reconcileOnce } from '../core/reconciler.js';
import { checkHealth, checkWallet } from '../core/monitor.js';
import { flushStockAlerts } from '../core/notify.js';
import { expireStale } from '../payments/service.js';
import { purgeExpired } from '../bot/ui/input.js';
import { processBroadcasts } from './broadcast.js';
import { gg } from '../services/ggsoma.js';
import { t } from '../i18n/index.js';

const log = logger('jobs');

/** Run `fn` every `everyMs()` ms, never overlapping */
function loop(name, fn, everyMs) {
  let busy = false;
  const tick = async () => {
    if (!busy) {
      busy = true;
      try { await fn(); } catch (e) { log.error(`${name} failed`, e); } finally { busy = false; }
    }
    setTimeout(tick, Math.max(5_000, everyMs()));
  };
  tick();
}

export function startJobs({ bot, notifyAdmin, notifyUser }) {
  // ---- catalog sync + guard ----
  loop('sync', async () => {
    await loadAll(true);
    const r = await syncCatalog();
    if (r.added || r.restocked || r.removed) log.info('sync', { added: r.added, restocked: r.restocked, removed: r.removed, details: r.detailsPulled });
    if (r.removed) notifyAdmin(t('ar', 'admin.alert.removed', { n: r.removed }));

    for (const m of (r.priceMoves || []).slice(0, 8)) {
      const up = m.movePct > 0;
      notifyAdmin(t('ar', 'admin.alert.priceMove', {
        icon: up ? '📈' : '📉', rule: RULE, name: esc(m.name), old: money(m.oldCost), new: money(m.newCost),
        pct: `${up ? '+' : ''}${m.movePct.toFixed(1)}`,
        tail: m.manual ? t('ar', 'admin.alert.priceMoveManual', { sell: money(m.oldSell), calc: money(m.newSell) })
                       : t('ar', 'admin.alert.priceMoveAuto', { old: money(m.oldSell), new: money(m.newSell) }),
      }), kb().text(t('ar', 'admin.alert.pausedBtn.details'), to('a_prod', m.slug)).build());
    }

    const g = await enforceMargins();
    for (const p of g.paused) {
      notifyAdmin(t('ar', 'admin.alert.paused', { rule: RULE, name: esc(p.name), cost: money(p.cost), floor: money(p.floor), profit: money(p.profit), reason: esc(p.reason) }),
        kb().add({ text: t('ar', 'admin.alert.pausedBtn.fix'), data: to('a_pset', p.slug, 'price'), style: 'primary' }).row()
            .text(t('ar', 'admin.alert.pausedBtn.details'), to('a_prod', p.slug)).row()
            .add({ text: t('ar', 'admin.alert.pausedBtn.resume'), data: to('a_ptoggle', p.slug, 'paused'), style: 'danger' }).build());
    }
    for (const p of g.resumed) notifyAdmin(t('ar', 'admin.alert.resumed', { name: esc(p.name) }));
  }, () => Math.max(1, Snum('sync_minutes', 10)) * 60_000);

  // ---- reconciler: every minute ----
  loop('recon', () => reconcileOnce({ notifyAdmin, notifyUser }), () => 60_000);

  // ---- stock alerts: every 90s ----
  loop('alerts', async () => {
    const r = await flushStockAlerts(bot.api);
    if (r.alerts) notifyAdmin(t('ar', 'admin.alert.stockSent', { alerts: r.alerts, users: r.sent }));
  }, () => 90_000);

  // ---- broadcasts: every 20s ----
  loop('broadcast', () => processBroadcasts(bot.api, notifyAdmin), () => 20_000);

  // ---- housekeeping: every 5 min ----
  loop('cleanup', async () => { await expireStale(); await purgeExpired(); }, () => 5 * 60_000);

  // ---- GGSoma health ----
  loop('health', () => checkHealth({ notifyAdmin }), () => Math.max(1, Snum('health_check_min', 5)) * 60_000);

  // ---- GGSoma wallet: hourly ----
  loop('wallet', () => checkWallet({ notifyAdmin }), () => 3600_000);

  // ---- daily report at ~00:05 UTC ----
  loop('daily', dailyReport(notifyAdmin), () => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5));
    return next - now;
  });

  log.info('jobs started');
}

let lastReportDay = null;
function dailyReport(notifyAdmin) {
  return async () => {
    if (!Sbool('daily_report', true)) return;
    const today = new Date().toISOString().slice(0, 10);
    if (lastReportDay === today) return;     // first tick fires immediately; skip same-day duplicate
    lastReportDay = today;
    const since = new Date(Date.now() - 864e5).toISOString();
    const [orders, deposits, users, stuck] = await Promise.all([
      rows(db.from('orders').select('charged_usd, actual_cost_usd').eq('status', 'COMPLETED').gte('created_at', since)),
      rows(db.from('payments').select('amount_usd').eq('credited', true).gte('updated_at', since)),
      q(db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', since)).then((r) => r.count ?? 0),
      q(db.from('orders').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'NEEDS_REVIEW'])).then((r) => r.count ?? 0),
    ]);
    const sum = (a, f) => a.reduce((s, r) => s + Number(f(r) || 0), 0);
    const rev = sum(orders, (r) => r.charged_usd), cost = sum(orders, (r) => r.actual_cost_usd);
    let ggBal = '—'; try { ggBal = money((await gg.balance()).balance); } catch {}
    notifyAdmin(t('ar', 'admin.dailyReport', { rule: RULE, orders: orders.length, rev: money(rev), profit: money(rev - cost),
      deposits: money(sum(deposits, (r) => r.amount_usd)), newUsers: users, stuck, gg: ggBal }));
  };
}
