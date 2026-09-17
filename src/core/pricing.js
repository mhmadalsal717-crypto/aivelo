// ============================================================
//  Pricing
//
//  Two modes (setting `margin_mode`):
//
//    flat (default) — cost + fixed USD by cost bracket (margin_tiers):
//        cost < 15$   → +1.00$
//        15$ – 25$    → +1.50$
//        > 25$        → +2.00$
//
//    percent — cost × (1 + markup_pct / 100)
//
//  Cost is re-read from GGSoma every sync and the sell price is
//  recomputed, so prices track supplier cost in both directions.
//  The only thing that breaks tracking is a manual `price_override`.
// ============================================================
import { S, Snum, Sbool, tiers, margins } from '../lib/settings.js';
import { round2 } from '../lib/fmt.js';

export const flatMode = () => S('margin_mode', 'flat') !== 'percent';

/** Highest tier discount — worst case for margin */
export const maxTierDiscount = () =>
  tiers().reduce((m, t) => Math.max(m, Number(t.discount_pct) || 0), 0);

/**
 * Fixed profit for a cost bracket. `up_to` is inclusive; the last
 * bracket has up_to = null meaning "everything above".
 */
export function flatAdd(cost) {
  const c = Number(cost) || 0;
  const list = margins();
  if (!list.length) return Snum('flat_add_default', 1);
  for (const m of list) {
    if (m.up_to == null || c <= Number(m.up_to)) return Number(m.add_usd) || 0;
  }
  return Number(list[list.length - 1].add_usd) || 0;
}

/** Effective markup % for a product (percent mode) */
export const effMarkup = (p) =>
  p?.markup_pct != null ? Number(p.markup_pct) : Snum('markup_pct', 40);

/** Computed base price from cost (before tier discount) */
export function basePrice(cost, markupPct = Snum('markup_pct', 40)) {
  const step  = Snum('round_to', 0) || 0.01;
  const floor = Snum('min_price', 0);
  const c = Number(cost) || 0;

  let raw = flatMode() ? c + flatAdd(c) : c * (1 + Number(markupPct) / 100);

  // Percent mode only: pre-inflate so the top-tier customer still
  // yields the full margin. Flat mode protects via a floor in
  // finalPrice() instead, keeping the displayed price exact.
  if (!flatMode() && Sbool('margin_after_discount', true)) {
    const d = maxTierDiscount();
    if (d > 0 && d < 100) raw = raw / (1 - d / 100);
  }

  const rounded = step > 0 ? Math.ceil(raw / step - 1e-9) * step : raw;
  return round2(Math.max(rounded, floor));
}

/** Displayed price: manual override if set, else computed */
export const listPrice = (p) =>
  p?.price_override != null ? Number(p.price_override) : Number(p?.sell_price || 0);

export const isAutoPriced = (p) => p?.price_override == null;

/** Tier for a total-spent value */
export function tierOf(totalSpent) {
  const list = tiers();
  if (!list.length) return null;
  const spent = Number(totalSpent || 0);
  let cur = list[0];
  for (const t of list) if (spent >= Number(t.min_spent)) cur = t;
  return cur;
}
export function nextTier(totalSpent) {
  const spent = Number(totalSpent || 0);
  return tiers().find((t) => Number(t.min_spent) > spent) || null;
}

/** Final unit price for a specific user (after tier discount, with floor) */
export function finalPrice(product, user) {
  const base = listPrice(product);
  const tier = tierOf(user?.total_spent);
  const disc = tier ? Number(tier.discount_pct) : 0;
  if (!disc) return round2(base);

  const out  = round2(base * (1 - disc / 100));
  const cost = Number(product?.cost_price) || 0;

  // Flat mode: never discount below cost + minimum profit
  if (flatMode() && cost > 0) {
    const floor = round2(cost + Snum('min_margin_usd', 0.5));
    return Math.max(out, Math.min(floor, base));
  }
  return out;
}

/** Margin breakdown — used by admin panel and guard */
export function marginOf(product) {
  const cost  = Number(product?.cost_price) || 0;
  const list  = listPrice(product);
  const floor = round2(list * (1 - maxTierDiscount() / 100));
  return {
    cost, list, floor,
    profit:    round2(list - cost),
    minProfit: round2(floor - cost),
    pct:    cost > 0 ? ((list - cost) / cost) * 100 : 0,
    minPct: cost > 0 ? ((floor - cost) / cost) * 100 : 0,
    auto: isAutoPriced(product),
  };
}
