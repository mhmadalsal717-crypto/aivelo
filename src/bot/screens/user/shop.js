// ============================================================
//  Shop: home / providers / available / plans / item / confirm
// ============================================================
import { screen, to } from '../../ui/nav.js';
import { kb, stockStyle } from '../../ui/kb.js';
import { deliveryLabel } from '../../ui/delivery.js';
import { E, Snum, Sbool } from '../../../lib/settings.js';
import { esc, money, RULE, quote } from '../../../lib/fmt.js';
import { clip } from '../../../lib/html.js';
import { listProviders, listProducts, getProduct, listAvailable, provName, stockedProviders,
         productDesc, productInstr } from '../../../core/catalog.js';
import { finalPrice, listPrice } from '../../../core/pricing.js';
import { markActive } from '../../../core/referrals.js';
import { t } from '../../../i18n/index.js';
import { isAdmin } from '../../../config/index.js';
import { welcomeText } from './onboarding.js';

screen('home', async (ctx) => ({ text: welcomeText(ctx.lang), kb: kb().build() }));

// ---------- providers ----------
screen('providers', async (ctx) => {
  markActive(ctx.user).catch(() => {});
  const [provs, stocked] = await Promise.all([listProviders(), stockedProviders()]);
  if (!provs.length) return { text: t(ctx, 'shop.empty'), kb: kb().text(t(ctx, 'btn.close'), to('close')).build() };

  // two columns; a provider flagged full_width takes its own row
  const k = kb();
  let pair = [];
  const flush = () => { if (pair.length) { pair.forEach((b) => k.add(b)); k.row(); pair = []; } };
  for (const p of provs) {
    const btn = {
      text: `${p.emoji || ''} ${provName(p)}`.trim(), data: to('plans', p.key, '1'),
      icon: p.custom_emoji_id || undefined, style: stocked.has(p.key) ? 'success' : 'danger',
    };
    if (p.full_width) { flush(); k.add(btn); k.row(); }
    else { pair.push(btn); if (pair.length === 2) flush(); }
  }
  flush();
  k.add({ text: t(ctx, 'shop.available'), data: to('avail', '1'), style: 'primary' }).row();
  k.text(t(ctx, 'btn.close'), to('close'));
  return { text: t(ctx, 'shop.pick'), kb: k.build() };
});

// ---------- available now ----------
screen('avail', async (ctx, [pageStr]) => {
  const page = Math.max(1, Number(pageStr || 1)), per = 18;
  const all = await listAvailable();
  if (!all.length) return { text: t(ctx, 'shop.availNone'), kb: kb().text(t(ctx, 'btn.services'), to('providers')).build() };

  const pages = Math.max(1, Math.ceil(all.length / per));
  const slice = all.slice((page - 1) * per, page * per);
  const lines = []; let last = null;
  for (const r of slice) {
    const pv = r.providers || {};
    if (r.provider_key !== last) { lines.push(`\n${pv.emoji || '▫️'} <b>${esc(provName(pv))}</b>`); last = r.provider_key; }
    const n = Number(r.stock_count || 0);
    lines.push(`· ${esc(r.name)} — ${money(finalPrice(r, ctx.user))} <i>(${n >= 9999 ? '∞' : n})</i>`);
  }
  const k = kb().pager({ page, totalPages: pages, make: (n) => to('avail', String(n)), lang: ctx.lang });
  k.text(t(ctx, 'btn.services'), to('providers'));
  return { text: `${t(ctx, 'shop.availTitle', { count: all.length })}\n${lines.join('\n')}`, kb: k.build() };
});

// ---------- plans of a provider ----------
screen('plans', async (ctx, [providerKey, pageStr]) => {
  const per = Snum('products_per_page', 8), page = Math.max(1, Number(pageStr || 1));
  const all = await listProducts(providerKey);
  const pages = Math.max(1, Math.ceil(all.length / per));
  const items = all.slice((page - 1) * per, page * per);
  const head = `${t(ctx, 'shop.plans')}\n${RULE}`;
  if (!items.length) return { text: `${head}\n${t(ctx, 'shop.noPlans')}`, kb: kb().text(t(ctx, 'btn.services'), to('providers')).build() };

  const showCount = Sbool('show_stock_count', true);
  const k = kb();
  for (const p of items) {
    const count = showCount ? ` (${p.stock_count || 0})` : '';
    k.add({ text: `${p.emoji || ''} ${p.name} · ${money(finalPrice(p, ctx.user))}${count}`.trim(),
            data: to('item', p.slug), style: stockStyle(p), icon: p.custom_emoji_id || undefined }).row();
  }
  k.pager({ page, totalPages: pages, make: (n) => to('plans', providerKey, String(n)), lang: ctx.lang });
  k.text(t(ctx, 'btn.services'), to('providers'));
  return { text: head, kb: k.build() };
});

// ---------- product page ----------
screen('item', async (ctx, [slug]) => {
  const p = await getProduct(slug);
  if (!p || p.deleted_at || !p.visible) return { text: t(ctx, 'shop.gone'), kb: kb().text(t(ctx, 'btn.services'), to('providers')).build() };

  const price = finalPrice(p, ctx.user), base = listPrice(p);
  const stock = !p.in_stock ? t(ctx, 'item.out') : p.stock_count > 10 ? t(ctx, 'item.inStock') : t(ctx, 'item.low', { n: p.stock_count });

  const head = [
    `${E('box')} <b>${esc(p.name)}</b>`, RULE,
    t(ctx, 'item.price', { emoji: E('money'), price: money(price) }) + (price < base ? `  <s>${money(base)}</s>` : ''),
    p.duration_days ? t(ctx, 'item.duration', { emoji: E('clock'), days: p.duration_days }) : null,
    p.warranty_days ? t(ctx, 'item.warranty', { emoji: E('shield'), days: p.warranty_days }) : null,
    t(ctx, 'item.delivery', { type: deliveryLabel(ctx.lang, p.delivery_type) }),
    stock,
  ].filter(Boolean).join('\n');

  // Telegram limit 4096 — distribute the remaining room, instructions first
  const LIMIT = 3900;
  const instr = productInstr(p), desc = productDesc(p);
  const instrRoom = Math.max(0, LIMIT - head.length - 80);
  const block = instr ? quote(t(ctx, 'item.instr'), clip(instr, Math.min(instrRoom, 2500))) : '';
  const descRoom = Math.max(0, LIMIT - head.length - block.length - 40);
  const descPart = desc && descRoom > 120 ? `\n\n${clip(desc, descRoom)}` : '';

  const k = kb();
  if (p.in_stock && !p.paused) k.add({ text: t(ctx, 'item.buy'), data: to('confirm', slug, '1'), style: 'success' }).row();
  if (isAdmin(ctx.from.id)) k.text(t(ctx, 'item.adminEdit'), to('a_prod', slug)).row();
  k.text(t(ctx, 'btn.plans'), to('plans', p.provider_key, '1'));
  return { text: head + descPart + (block ? '\n\n' + block : ''), kb: k.build() };
});

// ---------- order summary ----------
screen('confirm', async (ctx, [slug, qtyStr]) => {
  const p = await getProduct(slug);
  if (!p) return { text: t(ctx, 'confirm.notFound'), kb: kb().text(t(ctx, 'btn.services'), to('providers')).build() };
  const u = ctx.user;
  const maxQ = Math.max(1, Number(p.max_quantity || 1));
  const qty = Math.min(maxQ, Math.max(1, Number(qtyStr || 1)));
  const unit = finalPrice(p, u), total = Math.round(unit * qty * 100) / 100;
  const enough = Number(u.balance) >= total;

  const text = [
    t(ctx, 'confirm.title'), RULE,
    t(ctx, 'confirm.product', { name: esc(p.name) }),
    t(ctx, 'confirm.qty', { n: qty }),
    t(ctx, 'confirm.unit', { price: money(unit) }),
    t(ctx, 'confirm.total', { price: money(total) }),
    t(ctx, 'item.delivery', { type: deliveryLabel(ctx.lang, p.delivery_type) }),
    RULE,
    t(ctx, 'confirm.balance', { emoji: E('balance'), balance: money(u.balance) }),
    enough ? t(ctx, 'confirm.after', { balance: money(Number(u.balance) - total) })
           : t(ctx, 'confirm.short', { missing: money(total - Number(u.balance)) }),
  ].join('\n');

  const k = kb();
  if (maxQ > 1) {
    // quantity stepper
    k.text('−', qty > 1 ? to('confirm', slug, String(qty - 1)) : 'noop');
    k.text(`${qty}`, 'noop');
    k.text('+', qty < maxQ ? to('confirm', slug, String(qty + 1)) : 'noop').row();
  }
  if (enough) k.add({ text: t(ctx, 'confirm.yes'), data: to('buy', slug, String(qty)), style: 'success' }).row();
  else        k.add({ text: t(ctx, 'btn.topup'),   data: to('topup'), style: 'primary' }).row();
  k.text(t(ctx, 'btn.cancel'), to('item', slug));
  return { text, kb: k.build() };
});
