// ============================================================
//  Admin: products (list with filters + search) / product detail / edit
// ============================================================
import { adminScreen, backTo } from './_shared.js';
import { to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { ask } from '../../ui/input.js';
import { db, q, one } from '../../../lib/db.js';
import { esc, money, RULE, fmtDate, trim } from '../../../lib/fmt.js';
import { t } from '../../../i18n/index.js';
import { listPrice } from '../../../core/pricing.js';
import { pullDetails } from '../../../core/catalog.js';

const PER = 10;
const FILTERS = ['all', 'paused', 'manual', 'hidden', 'out'];

function applyFilter(b, f) {
  switch (f) {
    case 'paused': return b.eq('paused', true).is('deleted_at', null);
    case 'manual': return b.not('price_override', 'is', null).is('deleted_at', null);
    case 'hidden': return b.eq('visible', false);
    case 'out':    return b.eq('in_stock', false).is('deleted_at', null);
    default:       return b;
  }
}

const flagOf = (p) => (p.deleted_at ? '🗑' : p.paused ? '⏸' : p.visible ? '👁' : '🚫');

/** a_prods:<filter>:<page>  or  a_prods:q:<page>:<query>  */
adminScreen('a_prods', async (ctx, [filter = 'all', pageStr = '1', ...rest]) => {
  const page = Math.max(1, Number(pageStr)), from = (page - 1) * PER;
  const query = filter === 'q' ? rest.join(':') : null;

  let b = db.from('products').select('slug, name, cost_price, sell_price, price_override, visible, in_stock, deleted_at, paused', { count: 'exact' });
  b = query ? b.ilike('name', `%${query}%`) : applyFilter(b, filter);
  const { data, count } = await q(b.order('provider_key').order('sort_order').range(from, from + PER - 1), 'a_prods');
  const pages = Math.max(1, Math.ceil((count || 0) / PER));

  const k = kb();
  // filter tabs
  for (const f of FILTERS) k.add({ text: t(ctx, `admin.prodFilter.${f}`), data: to('a_prods', f, '1'), style: f === filter ? 'primary' : undefined });
  k.row().text(t(ctx, 'admin.prodSearch'), to('a_psearch')).row();

  if (!data?.length) k.text(t(ctx, 'admin.prodSearchNone'), 'noop').row();
  for (const p of data || []) {
    const margin = listPrice(p) - Number(p.cost_price);
    k.text(`${flagOf(p)}${p.in_stock ? '' : '·'} ${trim(p.name, 22)} ${money(listPrice(p))} (${margin >= 0 ? '+' : ''}${margin.toFixed(2)})`, to('a_prod', p.slug)).row();
  }
  k.pager({ page, totalPages: pages, make: (n) => (query ? to('a_prods', 'q', String(n), query) : to('a_prods', filter, String(n))), lang: ctx.lang });
  k.text(t(ctx, 'btn.back'), to('admin'));
  return { text: t(ctx, 'admin.prodsTitle', { rule: RULE }) + (query ? `\n🔍 <i>${esc(query)}</i> · ${count ?? 0}` : ''), kb: k.build() };
});

adminScreen('a_psearch', async (ctx) => {
  await ask(ctx.from.id, 'prod_search');
  return { text: t(ctx, 'admin.prodSearchPrompt'), kb: backTo(ctx, 'a_prods', 'all', '1') };
});

adminScreen('a_prod', async (ctx, [slug]) => {
  const p = await one(db.from('products').select('*').eq('slug', slug).maybeSingle(), 'a_prod');
  if (!p) return { text: t(ctx, 'admin.prodNotFound'), kb: backTo(ctx, 'a_prods', 'all', '1') };

  const price = listPrice(p), margin = price - Number(p.cost_price), cost = Number(p.cost_price);
  const A = (k, v) => t(ctx, `admin.${k}`, v);
  const text = [
    A('prodTitle', { name: esc(p.name) }), RULE,
    A('prodBody', {
      slug: esc(p.slug), cost: money(cost),
      catalog: p.catalog_price ? A('prodCatalog', { price: money(p.catalog_price) }) : '',
      price: money(price), manual: p.price_override != null ? A('prodManual') : '',
      profit: money(margin), pct: cost > 0 ? ((margin / cost) * 100).toFixed(0) : '0',
      markup: p.markup_pct != null ? p.markup_pct + '%' : A('prodMarkupGlobal'),
      stock: p.in_stock ? A('prodStockIn', { n: p.stock_count }) : A('prodStockOut'),
      visibility: p.visible ? A('prodVisible') : A('prodHidden'),
      deleted: p.deleted_at ? A('prodDeleted') : '',
      paused: p.paused ? A('prodPaused', { reason: esc(p.paused_reason || (p.paused_manual ? 'manual' : '')) }) : '',
    }).replace(/\n+$/, ''),
    A('prodDetails', {
      rule: RULE,
      desc:  p.desc_override ? A('prodOverride') : p.description ? A('prodFromGG') : '—',
      instr: p.instr_override ? A('prodOverride') : p.instructions ? A('prodFromGG') : '—',
      synced: p.details_synced_at ? fmtDate(p.details_synced_at, ctx.lang) : A('prodNever'),
    }),
  ].join('\n');

  const B = (k) => t(ctx, `admin.prodBtn.${k}`);
  const k = kb()
    .text(B('price'), to('a_pset', slug, 'price')).text(B('markup'), to('a_pset', slug, 'markup')).row()
    .text(B('desc') + (p.desc_override ? ' ✏️' : ''), to('a_pset', slug, 'desc'))
    .text(B('instr') + (p.instr_override ? ' ✏️' : ''), to('a_pset', slug, 'instr')).row()
    .text(p.visible ? B('hide') : B('show'), to('a_ptoggle', slug, 'visible'))
    .add(p.paused ? { text: B('resume'), data: to('a_ptoggle', slug, 'paused'), style: 'success' }
                  : { text: B('pause'),  data: to('a_ptoggle', slug, 'paused'), style: 'danger' }).row()
    .text(B('pullDetails'), to('a_pdetails', slug)).text(B('view'), to('item', slug)).row()
    .text(t(ctx, 'btn.back'), to('a_prods', 'all', '1'));
  return { text, kb: k.build() };
});

adminScreen('a_ptoggle', async (ctx, [slug, what]) => {
  const p = await one(db.from('products').select('visible, paused, name').eq('slug', slug).maybeSingle(), 'a_ptoggle');
  if (!p) return { goto: 'a_prods', args: ['all', '1'] };
  if (what === 'paused') {
    const next = !p.paused;
    await q(db.from('products').update({ paused: next, paused_manual: next, paused_reason: next ? 'manual' : null }).eq('slug', slug), 'a_ptoggle.paused');
    await ctx.answerCallbackQuery?.({ text: t(ctx, next ? 'admin.prodPausedManual' : 'admin.prodResumed').replace(/<[^>]+>/g, '') }).catch(() => {});
  } else {
    await q(db.from('products').update({ visible: !p.visible }).eq('slug', slug), 'a_ptoggle.visible');
  }
  return { goto: 'a_prod', args: [slug] };
});

adminScreen('a_pdetails', async (ctx, [slug]) => {
  const ok = await pullDetails(slug);
  await ctx.answerCallbackQuery?.({ text: ok === true ? t(ctx, 'admin.prodDetailsPulled') : t(ctx, 'sys.error') }).catch(() => {});
  return { goto: 'a_prod', args: [slug] };
});

adminScreen('a_pset', async (ctx, [slug, field]) => {
  await ask(ctx.from.id, 'product', { slug, field });
  return { text: `✏️ ${t(ctx, `admin.prodSet.${field}`)}\n${RULE}`, kb: backTo(ctx, 'a_prod', slug) };
});
