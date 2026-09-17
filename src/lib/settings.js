// ============================================================
//  Runtime settings / texts / emoji / tiers — cached in memory
//
//  Reads fall back to the registry default when the DB row is
//  missing, so the bot never breaks because a seed wasn't re-run.
// ============================================================
import { db, rows, q } from './db.js';
import { SETTINGS, TEXTS, EMOJI } from '../config/settings.registry.js';
import { logger } from './logger.js';

const log = logger('settings');
const TTL = 60_000;

let cache = { settings: {}, texts: {}, emoji: {}, tiers: [], margins: [], at: 0 };

export async function loadAll(force = false) {
  if (!force && Date.now() - cache.at < TTL) return cache;
  const [s, t, e, ti, mg] = await Promise.all([
    rows(db.from('settings').select('key, value'), 'settings'),
    rows(db.from('texts').select('key, content'), 'texts'),
    rows(db.from('ui_emoji').select('key, fallback, custom_id'), 'ui_emoji'),
    rows(db.from('tiers').select('*').order('sort_order'), 'tiers'),
    rows(db.from('margin_tiers').select('*').order('sort_order'), 'margin_tiers'),
  ]);
  cache = {
    settings: Object.fromEntries(s.map((r) => [r.key, r.value])),
    texts:    Object.fromEntries(t.map((r) => [r.key, r.content])),
    emoji:    Object.fromEntries(e.map((r) => [r.key, r])),
    tiers:    ti,
    margins:  mg,
    at: Date.now(),
  };
  return cache;
}

export const invalidate = () => { cache.at = 0; };

// ---------- settings ----------
const raw = (k) => cache.settings[k] ?? SETTINGS[k]?.def;

/** string setting */
export const S = (k, d = '') => {
  const v = raw(k);
  return v === undefined || v === null ? d : String(v);
};
/** numeric setting */
export const Snum = (k, d = 0) => {
  const v = Number(raw(k));
  return Number.isFinite(v) ? v : d;
};
/** boolean setting ('on'/'true'/'1') */
export const Sbool = (k, d = false) => {
  const v = raw(k);
  if (v === undefined || v === null || v === '') return d;
  return v === 'on' || v === 'true' || v === '1';
};

export async function setSetting(key, value) {
  if (!SETTINGS[key]) log.warn('setting not in registry', { key });
  await q(db.from('settings').upsert({ key, value: String(value) }, { onConflict: 'key' }), 'settings.set');
  invalidate();
}

// ---------- long texts ----------
/**
 * Long text by language. Falls back: {key}_{lang} → {key}_ar → {key} → default.
 * Single-value texts (e.g. binance_pay_id) are stored under the bare key.
 */
export function T(key, lang = 'ar', d = '') {
  if (TEXTS[key]?.single) return cache.texts[key] ?? d;
  return cache.texts[`${key}_${lang}`] ?? cache.texts[`${key}_ar`] ?? cache.texts[key] ?? d;
}
export async function setText(key, content) {
  await q(db.from('texts').upsert({ key, content }, { onConflict: 'key' }), 'texts.set');
  invalidate();
}

// ---------- emoji ----------
/**
 * Returns <tg-emoji> when premium is on and a custom id exists,
 * otherwise the plain fallback emoji.
 */
export function E(key) {
  const row = cache.emoji[key];
  const fallback = row?.fallback ?? EMOJI[key] ?? '';
  if (Sbool('premium_emoji') && row?.custom_id) {
    return `<tg-emoji emoji-id="${row.custom_id}">${fallback}</tg-emoji>`;
  }
  return fallback;
}
export async function setEmoji(key, customId) {
  await q(db.from('ui_emoji').upsert(
    { key, fallback: EMOJI[key] || '•', custom_id: customId || null }, { onConflict: 'key' }), 'emoji.set');
  invalidate();
}

// ---------- tiers / margins ----------
export const tiers   = () => cache.tiers;
export const margins = () => cache.margins;
