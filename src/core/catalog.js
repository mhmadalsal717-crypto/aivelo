// ============================================================
//  Catalog sync — full coordination with GGSoma
//
//  Pulled automatically every sync:
//    names · descriptions · instructions · stock · duration ·
//    warranty · providers · emoji · sort order · add/remove
//
//  You control only: price, visibility, display overrides.
// ============================================================
import { gg } from '../services/ggsoma.js';
import { db, rows, q, one } from '../lib/db.js';
import { Snum } from '../lib/settings.js';
import { sanitizeTgHtml } from '../lib/html.js';
import { sleep } from '../lib/fmt.js';
import { logger } from '../lib/logger.js';
import { basePrice, effMarkup } from './pricing.js';

const log = logger('sync');

/**
 * GGSoma sometimes returns a numeric custom-emoji id in `emoji.normal`.
 * Route it to the right column so it never shows up as button text.
 */
function splitEmoji(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { emoji: null, id: null };
  if (/^\d{6,}$/.test(s)) return { emoji: null, id: s };
  if (!/[^\x00-\x7F]/.test(s)) return { emoji: null, id: null };
  if ([...s].length > 8) return { emoji: null, id: null };
  return { emoji: s, id: null };
}

export async function syncCatalog() {
  const now = new Date().toISOString();

  // ---------- 1) providers ----------
  const providers = (await gg.providers()).data || [];
  const oldProv = await rows(db.from('providers').select('key, visible, custom_emoji_id, emoji'), 'sync.oldProv');
  const pOld = Object.fromEntries(oldProv.map((r) => [r.key, r]));

  if (providers.length) {
    await q(db.from('providers').upsert(providers.map((p) => {
      const e = splitEmoji(p.emoji?.normal);
      const o = pOld[p.key];
      return {
        key: p.key, name: p.name,
        emoji: o?.emoji ?? e.emoji,                       // admin override wins (emoji column is editable)
        custom_emoji_id: o?.custom_emoji_id ?? p.emoji?.customTelegramId ?? e.id ?? null,
        sort_order: p.sortOrder ?? 100,
        visible: o?.visible ?? true,
        updated_at: now,
      };
    }), { onConflict: 'key' }), 'sync.providers');

    const liveKeys = new Set(providers.map((p) => p.key));
    const gone = oldProv.filter((r) => !liveKeys.has(r.key)).map((r) => r.key);
    if (gone.length) await q(db.from('providers').update({ visible: false }).in('key', gone), 'sync.provGone');
  }

  // ---------- 2) products ----------
  const live = (await gg.products()).data || [];
  const before = await rows(db.from('products')
    .select('slug, in_stock, stock_count, markup_pct, price_override, visible, custom_emoji_id, deleted_at, cost_price, sell_price, paused'),
    'sync.oldProducts');
  const old = Object.fromEntries(before.map((r) => [r.slug, r]));

  const upserts = [], added = [], restocked = [], priceMoves = [];
  const minDelta  = Snum('min_stock_delta', 1);
  const moveAlert = Snum('price_move_alert_pct', 10);

  for (const p of live) {
    const o = old[p.slug];
    const stock   = p.stock?.count ?? 0;
    const inStock = !!p.stock?.inStock;
    const pe = splitEmoji(p.emoji?.normal);
    const cost = Number(p.yourPrice) || 0;
    const sell = basePrice(cost, effMarkup(o));

    // stock change detection — a product returning from deletion is a
    // RESTOCK, not NEW (avoids duplicate "new product" alerts)
    if (!o) {
      if (inStock && stock > 0) added.push({ slug: p.slug, delta: stock, stock });
    } else if (o.deleted_at) {
      if (inStock && stock > 0) restocked.push({ slug: p.slug, delta: stock, stock });
    } else {
      const delta = stock - (o.stock_count ?? 0);
      if (delta >= minDelta && inStock) restocked.push({ slug: p.slug, delta, stock });
    }

    // cost move detection
    if (o && !o.deleted_at) {
      const oldCost = Number(o.cost_price) || 0;
      if (oldCost > 0 && cost > 0 && oldCost !== cost) {
        const movePct = ((cost - oldCost) / oldCost) * 100;
        if (Math.abs(movePct) >= moveAlert) {
          priceMoves.push({ slug: p.slug, name: p.name, oldCost, newCost: cost, movePct,
            oldSell: Number(o.sell_price) || 0, newSell: sell, manual: o.price_override != null });
        }
      }
    }

    upserts.push({
      slug: p.slug, product_code: p.productCode || null, name: p.name,
      provider_key: p.provider?.key || null,
      emoji: pe.emoji,
      custom_emoji_id: o?.custom_emoji_id ?? p.emoji?.customTelegramId ?? pe.id ?? null,
      delivery_type: p.deliveryType,
      cost_price: cost,
      catalog_price: p.catalogPrice != null ? Number(p.catalogPrice) : null,
      sell_price: sell,
      duration_days: p.durationDays ?? null,
      warranty_days: p.warranty?.enabled ? p.warranty.days : null,
      in_stock: inStock, prev_stock: o?.stock_count ?? 0, stock_count: stock,
      max_quantity: p.stock?.maxQuantity ?? 1,
      has_instructions: !!p.flags?.hasInstructions,
      sensitive_delivery: !!p.flags?.sensitiveDelivery,
      sort_order: p.sortOrder ?? 100,
      visible: o?.visible ?? true,
      deleted_at: null, updated_at: now,
    });
  }

  if (upserts.length) await q(db.from('products').upsert(upserts, { onConflict: 'slug' }), 'sync.products');

  // ---------- 3) removed upstream ----------
  const liveSet = new Set(upserts.map((r) => r.slug));
  const removed = before.filter((r) => !liveSet.has(r.slug) && !r.deleted_at).map((r) => r.slug);

  // Guard: an empty/suspicious response must never wipe the catalog
  const tooMany = before.length && removed.length > before.length * 0.5;
  if (tooMany) log.error(`refused to delete ${removed.length}/${before.length} — suspicious response`);

  if (removed.length && !tooMany) {
    await q(db.from('products').update({ in_stock: false, stock_count: 0, deleted_at: now, updated_at: now })
      .in('slug', removed), 'sync.removed');
  }

  // ---------- 4) alert queue ----------
  const alerts = [
    ...added.map((a)     => ({ slug: a.slug, kind: 'NEW',     delta: a.delta, stock_now: a.stock })),
    ...restocked.map((a) => ({ slug: a.slug, kind: 'RESTOCK', delta: a.delta, stock_now: a.stock })),
  ];
  if (alerts.length) {
    const fresh = await dedupeAlerts(alerts);
    if (fresh.length) await q(db.from('stock_alerts').insert(fresh), 'sync.alerts');
  }

  // ---------- 5) details ----------
  const detailsPulled = await pullDetailsBatch();

  return {
    providers: providers.length, products: upserts.length,
    added: added.length, restocked: restocked.length,
    removed: tooMany ? 0 : removed.length, detailsPulled, priceMoves,
  };
}

/** Drop alerts already queued or sent recently for the same product */
async function dedupeAlerts(alerts) {
  const slugs = [...new Set(alerts.map((a) => a.slug))];
  const since = new Date(Date.now() - Snum('alert_cooldown_min', 90) * 60_000).toISOString();
  const recent = await rows(db.from('stock_alerts').select('slug')
    .in('slug', slugs).or(`status.eq.QUEUED,created_at.gte.${since}`), 'sync.dedupe');
  const blocked = new Set(recent.map((r) => r.slug));

  const best = new Map();
  for (const a of alerts) {
    if (blocked.has(a.slug)) continue;
    const cur = best.get(a.slug);
    if (!cur || a.delta > cur.delta) best.set(a.slug, a);
  }
  return [...best.values()];
}

/**
 * Descriptions/instructions need one call per product (60/min limit).
 * Pull a small batch each sync: never-fetched first, then stalest.
 * Failures back off exponentially instead of being pushed to the end.
 */
export async function pullDetailsBatch(limit = Snum('details_per_sync', 15)) {
  if (limit <= 0) return 0;
  const nowIso = new Date().toISOString();
  const need = await rows(db.from('products').select('slug, details_attempts').is('deleted_at', null)
    .or(`details_next_try.is.null,details_next_try.lte.${nowIso}`)
    .order('details_next_try', { ascending: true, nullsFirst: true })
    .limit(limit), 'sync.detailsNeed');

  let n = 0;
  for (const row of need) {
    const ok = await pullDetails(row.slug, row.details_attempts || 0);
    if (ok === 'RATE_LIMIT') break;
    if (ok) n++;
    await sleep(1100);
  }
  return n;
}

/** Pull details for one product. Returns true | false | 'RATE_LIMIT' */
export async function pullDetails(slug, attempts = 0) {
  const refreshHrs = Snum('details_refresh_hrs', 12);
  try {
    const d = await gg.product(slug);
    const fmt = d.descriptionFormat || 'TEXT';
    await q(db.from('products').update({
      description: sanitizeTgHtml(d.description, fmt) || null,
      description_format: fmt,
      instructions: sanitizeTgHtml(d.instructions, fmt) || null,
      has_instructions: !!d.instructions,
      gg_updated_at: d.updatedAt || null,
      details_synced_at: new Date().toISOString(),
      details_attempts: 0,
      details_next_try: new Date(Date.now() + refreshHrs * 3600_000).toISOString(),
    }).eq('slug', slug), 'sync.details');
    return true;
  } catch (e) {
    if (e.code === 'RATE_LIMIT_EXCEEDED') return 'RATE_LIMIT';
    const att = attempts + 1;
    const backoffMin = Math.min(2 ** att, 120);
    await q(db.from('products').update({
      details_attempts: att,
      details_next_try: new Date(Date.now() + backoffMin * 60_000).toISOString(),
    }).eq('slug', slug), 'sync.detailsFail');
    return false;
  }
}

// ============================================================
//  Reads
// ============================================================
export const provName = (p) => (p?.name_override || p?.name || '').trim();

const VISIBLE_PRODUCT = (b) =>
  b.eq('visible', true).eq('paused', false).is('deleted_at', null);

export const listProviders = () =>
  rows(db.from('providers').select('*').eq('visible', true).order('sort_order').order('name'), 'providers.list');

export const listAllProviders = () =>
  rows(db.from('providers').select('*').order('sort_order').order('name'), 'providers.all');

/** Provider keys that have at least one in-stock product */
export async function stockedProviders() {
  const r = await rows(VISIBLE_PRODUCT(db.from('products').select('provider_key')).eq('in_stock', true), 'products.stocked');
  return new Set(r.map((x) => x.provider_key));
}

/** Everything in stock now, grouped by provider order */
export const listAvailable = () =>
  rows(VISIBLE_PRODUCT(db.from('products')
    .select('slug, name, emoji, custom_emoji_id, sell_price, price_override, cost_price, stock_count, provider_key, sort_order, ' +
            'providers!inner(name, name_override, emoji, sort_order, visible)'))
    .eq('in_stock', true).eq('providers.visible', true)
    .order('sort_order'), 'products.available');

export const listProducts = (providerKey) =>
  rows(VISIBLE_PRODUCT(db.from('products').select('*').eq('provider_key', providerKey))
    .order('sort_order').order('sell_price'), 'products.byProvider');

export const getProduct = (slug) =>
  one(db.from('products').select('*').eq('slug', slug).maybeSingle(), 'products.get');

export const productDesc  = (p) => p?.desc_override  || p?.description  || '';
export const productInstr = (p) => p?.instr_override || p?.instructions || '';
