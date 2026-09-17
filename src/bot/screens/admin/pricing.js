// ============================================================
//  Admin: pricing overview / margin tiers / manual prices
// ============================================================
import { adminScreen, backTo } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { db, q, rows } from '../../../lib/db.js';
import { esc, money, RULE, trim } from '../../../lib/fmt.js';
import { t } from '../../../i18n/index.js';
import { Snum, Sbool, setSetting, margins, loadAll } from '../../../lib/settings.js';
import { basePrice, maxTierDiscount, flatMode, finalPrice } from '../../../core/pricing.js';

const cnt = (b) => q(b).then((r) => r.count ?? 0);

adminScreen('a_pricing', async (ctx) => {
  await loadAll(true);
  const flat = flatMode(), mk = Snum('markup_pct', 40), maxD = maxTierDiscount();
  const [total, manual, custom] = await Promise.all([
    cnt(db.from('products').select('slug', { count: 'exact', head: true }).is('deleted_at', null)),
    cnt(db.from('products').select('slug', { count: 'exact', head: true }).not('price_override', 'is', null).is('deleted_at', null)),
    cnt(db.from('products').select('slug', { count: 'exact', head: true }).not('markup_pct', 'is', null).is('deleted_at', null)),
  ]);

  // live examples with the top-tier customer
  const topUser = { total_spent: 1e9 };
  const demo = [1, 5, 20, 40].map((c) => {
    const p = basePrice(c, mk);
    const worst = finalPrice({ sell_price: p, cost_price: c }, topUser);
    return t(ctx, 'admin.pricingDemo', { cost: money(c), price: money(p), worst: money(worst), profit: money(worst - c) });
  }).join('\n');

  const text = `${t(ctx, 'admin.pricingTitle')}\n${RULE}\n` +
    (flat ? t(ctx, 'admin.pricingFlat') : t(ctx, 'admin.pricingPct', { pct: mk })) + '\n' +
    t(ctx, 'admin.pricingBody', {
      step: Snum('round_to', 0.25), floor: money(Snum('min_price', 0)),
      guard: flat ? money(Snum('min_margin_usd', 0.5)) : `${Snum('min_margin_pct', 5)}%`,
      maxD, demo, rule: RULE, total, auto: total - manual, manual, custom,
    });

  const k = kb()
    .text(t(ctx, 'admin.btn.margins'), to('a_margins')).text(t(ctx, 'admin.btn.settings'), to('a_set', 'pricing')).row();
  if (manual > 0) {
    k.text(t(ctx, 'admin.pricingBtn.manualList'), to('a_manual')).row();
    k.add({ text: t(ctx, 'admin.pricingBtn.clearManual', { n: manual }), data: to('a_clearmanual', 'ask'), style: 'danger' }).row();
  }
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text, kb: k.build() };
});

adminScreen('a_margins', async (ctx) => {
  await loadAll(true);
  const list = margins(), flat = flatMode();
  const rowsTxt = list.map((m, i) => t(ctx, 'admin.marginRow', {
    i: i + 1, from: i === 0 ? '0.00' : Number(list[i - 1].up_to).toFixed(2),
    to: m.up_to == null ? '∞' : Number(m.up_to).toFixed(2), add: Number(m.add_usd).toFixed(2),
  })).join('\n') || '—';
  return {
    text: t(ctx, 'admin.marginsTitle', { rule: RULE, rows: rowsTxt,
      mode: flat ? t(ctx, 'admin.marginModeFlat') : t(ctx, 'admin.marginModePct', { pct: Snum('markup_pct', 40) }) }),
    kb: kb()
      .text(t(ctx, 'admin.marginEdit'), to('a_margins_edit')).row()
      .text(flat ? t(ctx, 'admin.marginTogglePct') : t(ctx, 'admin.marginToggleFlat'), to('a_mm_tog')).row()
      .text(t(ctx, 'btn.back'), to('a_pricing')).build(),
  };
});

adminScreen('a_margins_edit', async (ctx) => {
  await ask(ctx.from.id, 'margins');
  return { text: t(ctx, 'admin.marginsTitle', { rule: RULE, rows: '', mode: '' }).split('\n\n').slice(-1)[0], kb: backTo(ctx, 'a_margins') };
});

adminScreen('a_mm_tog', async (ctx) => {
  await setSetting('margin_mode', flatMode() ? 'percent' : 'flat');
  await loadAll(true);
  return { goto: 'a_margins' };
});

adminScreen('a_manual', async (ctx) => {
  const data = await rows(db.from('products').select('slug, name, sell_price, price_override')
    .not('price_override', 'is', null).is('deleted_at', null).limit(25), 'a_manual');
  if (!data.length) return { text: t(ctx, 'admin.manualNone'), kb: backTo(ctx, 'a_pricing') };
  const body = data.map((p) => { const d = Number(p.price_override) - Number(p.sell_price);
    return t(ctx, 'admin.manualRow', { name: esc(p.name), manual: money(p.price_override), auto: money(p.sell_price), diff: `${d >= 0 ? '+' : ''}${d.toFixed(2)}` }); }).join('\n');
  const k = kb();
  for (const p of data) k.text(`✏️ ${trim(p.name, 24)}`, to('a_prod', p.slug)).row();
  k.text(t(ctx, 'btn.back'), to('a_pricing'));
  return { text: t(ctx, 'admin.manualTitle', { rule: RULE, rows: body }), kb: k.build() };
});

adminScreen('a_clearmanual', async (ctx, [step]) => {
  const n = await cnt(db.from('products').select('slug', { count: 'exact', head: true }).not('price_override', 'is', null));
  if (step !== 'yes') {
    return { text: t(ctx, 'admin.clearManualConfirm', { rule: RULE, n }),
      kb: kb().add({ text: t(ctx, 'btn.yes'), data: to('a_clearmanual', 'yes'), style: 'danger' })
              .text(t(ctx, 'btn.no'), to('a_pricing')).build() };
  }
  await q(db.from('products').update({ price_override: null }).not('price_override', 'is', null), 'a_clearmanual');
  return { text: t(ctx, 'admin.clearManualDone', { n }),
    kb: kb().add({ text: t(ctx, 'admin.btn.sync'), data: to('a_sync'), style: 'primary' }).row().text(t(ctx, 'btn.back'), to('a_pricing')).build() };
});
