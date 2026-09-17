// ============================================================
//  Admin: settings (from registry) / texts / emoji
// ============================================================
import { adminScreen, backTo, onOff } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { S, Sbool, setSetting, T, loadAll } from '../../../lib/settings.js';
import { SETTINGS, SETTING_GROUPS, TEXTS, EMOJI } from '../../../config/settings.registry.js';
import { db, rows } from '../../../lib/db.js';
import { esc, RULE } from '../../../lib/fmt.js';
import { t, LANGS, LANG_META } from '../../../i18n/index.js';

const label = (ctx, key) => SETTINGS[key]?.[ctx.lang] || SETTINGS[key]?.ar || key;

// ---------- groups ----------
adminScreen('a_settings', async (ctx) => {
  const built = kb();
  const btns = SETTING_GROUPS.map((g) => ({ text: `${g.icon} ${g[ctx.lang] || g.ar}`, data: to('a_set', g.key) }));
  built.grid(btns, { cols: 2, label: (b) => b.text, data: (b) => b.data });
  built.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.settingsTitle', { rule: RULE }), kb: built.build() };
});

adminScreen('a_set', async (ctx, [grp]) => {
  await loadAll(true);
  const g = SETTING_GROUPS.find((x) => x.key === grp);
  if (!g) return { goto: 'a_settings' };
  const k = kb();
  for (const [key, def] of Object.entries(SETTINGS)) {
    if (def.grp !== grp) continue;
    const val = def.kind === 'bool' ? onOff(ctx, Sbool(key)) : (S(key) || t(ctx, 'sys.none'));
    k.text(`${label(ctx, key)}: ${val}`, to('a_seti', key)).row();
  }
  k.text(t(ctx, 'btn.back'), to('a_settings'));
  return { text: t(ctx, 'admin.groupTitle', { icon: g.icon, name: g[ctx.lang] || g.ar, rule: RULE }), kb: k.build() };
});

adminScreen('a_seti', async (ctx, [key]) => {
  const def = SETTINGS[key];
  if (!def) return { text: t(ctx, 'admin.settingNotFound'), kb: backTo(ctx, 'a_settings') };
  if (def.kind === 'bool') {
    await setSetting(key, Sbool(key) ? 'off' : 'on');
    await loadAll(true);
    return { goto: 'a_set', args: [def.grp] };
  }
  await ask(ctx.from.id, 'setting', { key, grp: def.grp });
  return { text: t(ctx, 'admin.settingEdit', { label: esc(label(ctx, key)), rule: RULE, value: esc(S(key) || '—'), def: esc(def.def || '—') }),
           kb: backTo(ctx, 'a_set', def.grp) };
});

// ---------- long texts ----------
adminScreen('a_texts', async (ctx) => {
  const k = kb();
  for (const [key, meta] of Object.entries(TEXTS)) {
    if (meta.single) {
      k.text(`${meta[ctx.lang] || meta.ar}${T(key, 'ar') ? '' : ' ⚠️'}`, to('a_text', key, 'x')).row();
      continue;
    }
    for (const l of LANGS) {
      const has = !!T(key, l, '') && T(key, l, '') !== T(key, l === 'ar' ? 'en' : 'ar', '__none__');
      k.text(`${LANG_META[l].flag} ${meta[ctx.lang] || meta.ar}${has ? '' : ' ⚠️'}`, to('a_text', key, l));
    }
    k.row();
  }
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.textsTitle', { rule: RULE }), kb: k.build() };
});

adminScreen('a_text', async (ctx, [key, lang]) => {
  const meta = TEXTS[key];
  if (!meta) return { goto: 'a_texts' };
  const dbKey = meta.single ? key : `${key}_${lang}`;
  const cur = (await rows(db.from('texts').select('content').eq('key', dbKey)))[0]?.content;
  await ask(ctx.from.id, 'text', { key: dbKey });
  return {
    text: t(ctx, 'admin.textEdit', { label: esc(meta[ctx.lang] || meta.ar), lang: meta.single ? '—' : LANG_META[lang]?.name, rule: RULE,
                                     current: cur || t(ctx, 'admin.textEmpty') }),
    kb: backTo(ctx, 'a_texts'),
  };
});

// ---------- emoji ----------
adminScreen('a_emoji', async (ctx) => {
  const list = await rows(db.from('ui_emoji').select('*').order('key'));
  const byKey = Object.fromEntries(list.map((e) => [e.key, e]));
  const items = Object.keys(EMOJI).map((k) => ({ key: k, fallback: byKey[k]?.fallback || EMOJI[k], custom: byKey[k]?.custom_id }));
  const k = kb().grid(items, { cols: 3, label: (e) => `${e.fallback} ${e.key}${e.custom ? ' ⭐️' : ''}`, data: (e) => to('a_emo', e.key) });
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.emojiTitle', { rule: RULE, state: onOff(ctx, Sbool('premium_emoji')) }), kb: k.build() };
});

adminScreen('a_emo', async (ctx, [key]) => {
  const e = (await rows(db.from('ui_emoji').select('*').eq('key', key)))[0];
  await ask(ctx.from.id, 'emoji', { key });
  return { text: t(ctx, 'admin.emojiEdit', { label: key, rule: RULE, fallback: e?.fallback || EMOJI[key] || '•', custom: esc(e?.custom_id || '—') }),
           kb: backTo(ctx, 'a_emoji') };
});
