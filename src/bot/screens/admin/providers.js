// ============================================================
//  Admin: providers (name/emoji/order/visibility/width) + tiers
// ============================================================
import { adminScreen, backTo } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { db, q, one, rows } from '../../../lib/db.js';
import { esc, money, RULE } from '../../../lib/fmt.js';
import { t } from '../../../i18n/index.js';
import { listAllProviders, provName } from '../../../core/catalog.js';
import { tiers, loadAll } from '../../../lib/settings.js';

adminScreen('a_provs', async (ctx) => {
  const provs = await listAllProviders();
  if (!provs.length) return { text: t(ctx, 'admin.provsNone'), kb: backTo(ctx, 'admin') };
  const k = kb();
  for (const p of provs) k.text(`${p.visible ? '👁' : '🙈'}${p.full_width ? '▬' : '▪'} ${p.emoji || '·'} ${provName(p)}`, to('a_prov', p.key)).row();
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.provsTitle', { rule: RULE }), kb: k.build() };
});

adminScreen('a_prov', async (ctx, [key]) => {
  const p = await one(db.from('providers').select('*').eq('key', key).maybeSingle(), 'a_prov');
  if (!p) return { text: t(ctx, 'admin.provNotFound'), kb: backTo(ctx, 'a_provs') };
  const [{ count: total }, { count: inStock }] = await Promise.all([
    q(db.from('products').select('slug', { count: 'exact', head: true }).eq('provider_key', key).is('deleted_at', null)),
    q(db.from('products').select('slug', { count: 'exact', head: true }).eq('provider_key', key).is('deleted_at', null).eq('in_stock', true)),
  ]);
  const A = (k, v) => t(ctx, `admin.${k}`, v);
  const text = `${A('provTitle', { name: esc(provName(p)) })}\n${RULE}\n` + A('provBody', {
    ggName: esc(p.name), display: p.name_override ? esc(p.name_override) : A('provSame'),
    emoji: p.emoji || A('provNoEmoji'), order: p.sort_order ?? 100,
    visible: p.visible ? '👁' : '🙈', width: p.full_width ? A('provFull') : A('provHalf'),
    products: total ?? 0, inStock: inStock ?? 0,
  });
  const B = (k) => t(ctx, `admin.provBtn.${k}`);
  return { text, kb: kb()
    .text(B('name'), to('a_pvset', key, 'name')).text(B('emoji'), to('a_pvset', key, 'emoji')).row()
    .text(B('order'), to('a_pvset', key, 'order')).text(B('products'), to('a_prods', 'all', '1')).row()
    .text(p.visible ? B('hide') : B('show'), to('a_pvtog', key, 'visible'))
    .text(p.full_width ? B('half') : B('full'), to('a_pvtog', key, 'width')).row()
    .text(t(ctx, 'btn.back'), to('a_provs')).build() };
});

adminScreen('a_pvtog', async (ctx, [key, what]) => {
  const col = what === 'width' ? 'full_width' : 'visible';
  const p = await one(db.from('providers').select(col).eq('key', key).maybeSingle(), 'a_pvtog');
  await q(db.from('providers').update({ [col]: !p?.[col] }).eq('key', key), 'a_pvtog.set');
  return { goto: 'a_prov', args: [key] };
});

adminScreen('a_pvset', async (ctx, [key, field]) => {
  await ask(ctx.from.id, 'provider', { key, field });
  return { text: t(ctx, `admin.provSet.${field}`), kb: backTo(ctx, 'a_prov', key) };
});

// ---------- tiers ----------
adminScreen('a_tiers', async (ctx) => {
  await loadAll(true);
  const list = tiers();
  const rowsTxt = list.map((x) => t(ctx, 'admin.tierRow', { emoji: x.emoji, name: esc(x.name), min: money(x.min_spent), pct: x.discount_pct })).join('\n') || '—';
  const k = kb();
  for (const x of list) k.text(`${x.emoji} ${x.name}`, to('a_tier', String(x.id))).row();
  k.add({ text: t(ctx, 'admin.tierAdd'), data: to('a_tier', 'new'), style: 'success' }).row();
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.tiersTitle', { rule: RULE, rows: rowsTxt }), kb: k.build() };
});

adminScreen('a_tier', async (ctx, [id]) => {
  await ask(ctx.from.id, 'tier', { id });
  return { text: t(ctx, 'admin.tierEditPrompt'), kb: backTo(ctx, 'a_tiers') };
});
