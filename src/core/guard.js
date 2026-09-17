// ============================================================
//  Margin guard
//
//  GGSoma can raise `yourPrice` at any time. With a manual price or
//  a high-tier discount you could end up selling at a loss without
//  noticing. Every sync we compute the LOWEST price any customer can
//  pay and compare it to the new cost. Below threshold → pause sales
//  and notify the admin. Fixed → resumes automatically.
// ============================================================
import { db, rows, q } from '../lib/db.js';
import { Snum, Sbool } from '../lib/settings.js';
import { money } from '../lib/fmt.js';
import { marginOf, flatMode } from './pricing.js';

/**
 * @returns {{ok:boolean, floor:number, cost:number, marginPct:number, profit:number}}
 */
export function checkMargin(product) {
  const m = marginOf(product);
  if (m.cost <= 0) return { ok: true, floor: m.floor, cost: m.cost, marginPct: 100, profit: m.minProfit };

  // Flat mode measures in USD, percent mode in %. A 50$ product with
  // 2$ profit is 4% — fine in flat mode, would wrongly pause in percent.
  const ok = flatMode()
    ? m.minProfit >= Snum('min_margin_usd', 0.5)
    : m.minPct    >= Snum('min_margin_pct', 5);

  return { ok, floor: m.floor, cost: m.cost, marginPct: m.minPct, profit: m.minProfit };
}

/** Human-readable reason (admin language handled by caller via keys) */
function reasonFor(p, m) {
  const costRose = p.last_cost != null && Number(p.cost_price) > Number(p.last_cost);
  if (costRose) return `cost ${money(p.last_cost)} → ${money(p.cost_price)}`;
  return flatMode()
    ? `profit ${money(m.profit)} < ${money(Snum('min_margin_usd', 0.5))}`
    : `margin ${m.marginPct.toFixed(1)}% < ${Snum('min_margin_pct', 5)}%`;
}

/**
 * Check the whole catalog after a sync.
 * @returns {{paused: Array, resumed: Array}}
 */
export async function enforceMargins() {
  const autoPause = Sbool('auto_pause_on_loss', true);
  const products = await rows(db.from('products')
    .select('slug, name, cost_price, last_cost, sell_price, price_override, paused, paused_reason, paused_manual')
    .is('deleted_at', null), 'guard.products');

  const paused = [], resumed = [];
  const now = new Date().toISOString();

  for (const p of products) {
    const m = checkMargin(p);

    if (!m.ok && !p.paused && autoPause) {
      const reason = reasonFor(p, m);
      await q(db.from('products')
        .update({ paused: true, paused_reason: reason, paused_manual: false, last_cost: p.cost_price, updated_at: now })
        .eq('slug', p.slug), 'guard.pause');
      paused.push({ ...p, ...m, reason });
      continue;
    }

    // Auto-paused (not by admin) and margin is healthy again → resume
    if (m.ok && p.paused && !p.paused_manual) {
      await q(db.from('products')
        .update({ paused: false, paused_reason: null, last_cost: p.cost_price, updated_at: now })
        .eq('slug', p.slug), 'guard.resume');
      resumed.push(p);
      continue;
    }

    if (p.last_cost == null || Number(p.last_cost) !== Number(p.cost_price)) {
      await q(db.from('products').update({ last_cost: p.cost_price }).eq('slug', p.slug), 'guard.lastCost');
    }
  }
  return { paused, resumed };
}
