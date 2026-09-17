// ============================================================
//  i18n engine
//
//  · Dictionaries live in ./locales/{ar,en}.js — nested objects.
//  · t(ctx|lang, 'shop.pick', { name })  →  string with {vars} filled.
//  · Missing key in EN → falls back to AR → falls back to the key
//    itself (visible in the UI so you notice).
//  · Admin panel uses the same dictionaries under the `admin.*` branch.
//
//  ctx.lang is set once per update by bot/middleware/user.js.
// ============================================================
import ar from './locales/ar.js';
import en from './locales/en.js';
import { S } from '../lib/settings.js';

export const LANGS = ['ar', 'en'];
export const LANG_META = {
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
};

const DICT = { ar: flatten(ar), en: flatten(en) };

/** "a.b.c" keys from nested objects */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export const defaultLang = () => (LANGS.includes(S('default_lang')) ? S('default_lang') : 'ar');

export function langOf(ctxOrLang) {
  if (typeof ctxOrLang === 'string') return LANGS.includes(ctxOrLang) ? ctxOrLang : defaultLang();
  return ctxOrLang?.lang || defaultLang();
}

/**
 * Translate.
 * @param {object|string} ctxOrLang  grammY ctx (with .lang) or 'ar' / 'en'
 * @param {string} key               e.g. 'shop.pick'
 * @param {Record<string, any>} [vars]  {name: 'x'} replaces {name}
 */
export function t(ctxOrLang, key, vars) {
  const lang = langOf(ctxOrLang);
  let s = DICT[lang]?.[key] ?? DICT.ar[key] ?? key;
  if (Array.isArray(s)) s = s.join('\n');
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v ?? ''));
  }
  return s;
}

/** All translations of a key — used to route reply-keyboard button texts */
export const allOf = (key) => LANGS.map((l) => t(l, key));

/** Bound translator: const tr = tt(ctx); tr('shop.pick') */
export const tt = (ctxOrLang) => (key, vars) => t(ctxOrLang, key, vars);

/** For tests / consistency script */
export const dictKeys = (lang) => Object.keys(DICT[lang]);
