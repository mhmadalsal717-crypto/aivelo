// ============================================================
//  Consistency checks — run before every commit (npm run check)
//   1. i18n: ar/en have identical key sets
//   2. every t('x.y') key used in code exists in the dictionary
//   3. every setting read via S/Snum/Sbool is declared in the registry
//   4. every to('screen') target has a screen() definition
// ============================================================
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ar from '../src/i18n/locales/ar.js';
import en from '../src/i18n/locales/en.js';
import { SETTINGS } from '../src/config/settings.registry.js';

const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o)) { const key = p ? `${p}.${k}` : k;
  if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out); else out[key] = v; } return out; };
const AR = flat(ar), EN = flat(en);

const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f.endsWith('.js') && !f.startsWith('_template') && files.push(p); } })('src');
const src = files.map((f) => [f, readFileSync(f, 'utf8')]);

let errors = 0;
const fail = (m) => { errors++; console.error('✖ ' + m); };

// 1
for (const k of Object.keys(AR)) if (!(k in EN)) fail(`i18n: "${k}" missing in en.js`);
for (const k of Object.keys(EN)) if (!(k in AR)) fail(`i18n: "${k}" missing in ar.js`);

// 2 — static keys only (skip template literals)
for (const [f, s] of src) for (const m of s.matchAll(/\bt\((?:ctx|lang|'ar'|'en'|L|ctxOrLang|[a-zA-Z.]+lang[a-zA-Z.]*)\s*,\s*'([a-zA-Z0-9_.]+)'/g)) {
  if (!(m[1] in AR)) fail(`i18n: key "${m[1]}" used in ${f} not found`);
}

// 3
for (const [f, s] of src) for (const m of s.matchAll(/\bS(?:num|bool)?\('([a-z_]+)'/g)) {
  if (!SETTINGS[m[1]]) fail(`settings: "${m[1]}" read in ${f} is not in settings.registry.js`);
}

// 4
const defined = new Set(), called = new Set();
for (const [, s] of src) {
  for (const m of s.matchAll(/(?:adminScreen|screen)\('([a-z_]+)'/g)) defined.add(m[1]);
  for (const m of s.matchAll(/\bto\('([a-z_]+)'/g)) called.add(m[1]);
  for (const m of s.matchAll(/goto:\s*'([a-z_]+)'/g)) called.add(m[1]);
}
const special = new Set(['close', 'buy', 'st_buy']);   // handled by dedicated callbackQuery handlers
for (const c of called) if (!defined.has(c) && !special.has(c)) fail(`nav: screen "${c}" is referenced but never defined`);

console.log(errors ? `\n${errors} problem(s)` : `✔ consistency OK — ${Object.keys(AR).length} i18n keys · ${Object.keys(SETTINGS).length} settings · ${defined.size} screens`);
process.exit(errors ? 1 : 0);
