// ============================================================
//  Admin text-input handlers
// ============================================================
import crypto from 'node:crypto';
import { db, rpc, q, one } from '../../lib/db.js';
import { money, RULE, esc, parseNum, isClear } from '../../lib/fmt.js';
import { setSetting, setText, setEmoji, loadAll, Snum } from '../../lib/settings.js';
import { SETTINGS } from '../../config/settings.registry.js';
import { go } from '../ui/nav.js';
import { ask } from '../ui/input.js';
import { t } from '../../i18n/index.js';
import { basePrice, effMarkup, maxTierDiscount } from '../../core/pricing.js';
import { enqueueBroadcast } from '../../jobs/broadcast.js';

const back = (ctx, screen, args = []) => go(ctx, screen, args, { forceNew: true });

export default {
  // ---------- settings ----------
  async setting(ctx, body, { key, grp }) {
    const def = SETTINGS[key];
    const val = isClear(body) ? def?.def ?? '' : body.trim();
    if (def?.kind === 'number' && parseNum(val) === null) {
      await ask(ctx.from.id, 'setting', { key, grp });
      return ctx.reply(t(ctx, 'sys.notNumber', { ex: def.def }), { parse_mode: 'HTML' });
    }
    await setSetting(key, val);
    await loadAll(true);
    await ctx.reply(t(ctx, 'sys.updated'));
    await back(ctx, 'a_set', [grp]);
  },

  async text(ctx, body, { key }) {
    await setText(key, isClear(body) ? null : body);
    await ctx.reply(t(ctx, 'sys.saved'));
    await back(ctx, 'a_texts');
  },

  async emoji(ctx, body, { key }) {
    const val = isClear(body) ? null : body.replace(/\D/g, '');
    await setEmoji(key, val || null);
    await ctx.reply(t(ctx, val ? 'admin.emojiSaved' : 'admin.emojiCleared'));
    await back(ctx, 'a_emoji');
  },

  // ---------- products ----------
  async prod_search(ctx, body) {
    const qq = body.trim().slice(0, 30).replace(/:/g, ' ');
    await back(ctx, 'a_prods', ['q', '1', qq]);
  },

  async product(ctx, body, { slug, field }) {
    const clear = isClear(body);
    const map = {
      price:  ['price_override', clear ? null : parseNum(body)],
      markup: ['markup_pct',     clear ? null : parseNum(body)],
      desc:   ['desc_override',  clear ? null : body],
      instr:  ['instr_override', clear ? null : body],
    };
    const [col, val] = map[field] || [];
    if (!col) return back(ctx, 'a_prod', [slug]);
    if (['price', 'markup'].includes(field) && !clear && val === null) {
      await ask(ctx.from.id, 'product', { slug, field });
      return ctx.reply(t(ctx, 'sys.notNumber', { ex: '5' }), { parse_mode: 'HTML' });
    }
    const patch = { [col]: val };
    if (field === 'markup') {
      const p = await one(db.from('products').select('cost_price').eq('slug', slug).single(), 'prod.cost');
      patch.sell_price = basePrice(p.cost_price, val ?? Snum('markup_pct', 40));
    }
    await q(db.from('products').update(patch).eq('slug', slug), 'prod.set');
    await ctx.reply(t(ctx, 'sys.updated'));
    await back(ctx, 'a_prod', [slug]);
  },

  // ---------- providers ----------
  async provider(ctx, body, { key, field }) {
    const v = body.trim(), clear = isClear(v) || v === '';
    if (field === 'name') {
      if (!clear && v.length > 40) { await ask(ctx.from.id, 'provider', { key, field }); return ctx.reply(t(ctx, 'admin.provNameLong')); }
      await q(db.from('providers').update({ name_override: clear ? null : v }).eq('key', key), 'prov.name');
    } else if (field === 'order') {
      const n = parseInt(v.replace(/[^\d-]/g, ''), 10);
      if (!Number.isFinite(n)) { await ask(ctx.from.id, 'provider', { key, field }); return ctx.reply(t(ctx, 'sys.notNumber', { ex: '10' }), { parse_mode: 'HTML' }); }
      await q(db.from('providers').update({ sort_order: n }).eq('key', key), 'prov.order');
    } else {
      if (!clear && ([...v].length > 4 || /^[\x00-\x7F]+$/.test(v))) { await ask(ctx.from.id, 'provider', { key, field }); return ctx.reply(t(ctx, 'admin.provBadEmoji'), { parse_mode: 'HTML' }); }
      await q(db.from('providers').update({ emoji: clear ? null : v }).eq('key', key), 'prov.emoji');
    }
    await back(ctx, 'a_prov', [key]);
  },

  // ---------- tiers:  "name emoji min pct"  |  "delete" ----------
  async tier(ctx, body, { id }) {
    const v = body.trim();
    if (/^(delete|حذف)$/i.test(v) && id !== 'new') {
      await q(db.from('tiers').delete().eq('id', Number(id)), 'tier.del');
      await loadAll(true);
      await ctx.reply(t(ctx, 'admin.tierDeleted'));
      return back(ctx, 'a_tiers');
    }
    const parts = v.split(/\s+/);
    if (parts.length < 4) { await ask(ctx.from.id, 'tier', { id }); return ctx.reply(t(ctx, 'admin.tierBadFormat'), { parse_mode: 'HTML' }); }
    const pct = parseNum(parts.pop()), min = parseNum(parts.pop()), emoji = parts.pop(), name = parts.join(' ');
    if (pct === null || min === null || !name) { await ask(ctx.from.id, 'tier', { id }); return ctx.reply(t(ctx, 'admin.tierBadFormat'), { parse_mode: 'HTML' }); }
    const row = { name, emoji, min_spent: min, discount_pct: pct, sort_order: Math.round(min) };
    if (id === 'new') await q(db.from('tiers').insert(row), 'tier.add');
    else await q(db.from('tiers').update(row).eq('id', Number(id)), 'tier.upd');
    await loadAll(true);
    if (pct >= 10) await ctx.reply(t(ctx, 'admin.tierWarnDiscount', { pct }));
    await ctx.reply(t(ctx, 'sys.saved'));
    await back(ctx, 'a_tiers');
  },

  // ---------- margin tiers:  "15:1, 25:1.5, *:2" ----------
  async margins(ctx, body) {
    const items = body.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((s) => {
      const [up, add] = s.split(':').map((x) => x.trim());
      return { up_to: up === '*' ? null : parseNum(up), add_usd: parseNum(add) };
    });
    const bad = !items.length || items.some((m) => m.add_usd === null || (m.up_to === null && m !== items[items.length - 1]));
    if (bad) { await ask(ctx.from.id, 'margins'); return ctx.reply(t(ctx, 'admin.marginBadFormat'), { parse_mode: 'HTML' }); }
    items.sort((a, b) => (a.up_to ?? Infinity) - (b.up_to ?? Infinity));
    await q(db.from('margin_tiers').delete().gte('id', 0), 'margins.clear');
    await q(db.from('margin_tiers').insert(items.map((m, i) => ({ ...m, sort_order: i + 1 }))), 'margins.insert');
    await loadAll(true);
    await ctx.reply(t(ctx, 'admin.marginSaved', { n: items.length }));
    await back(ctx, 'a_margins');
  },

  // ---------- users ----------
  async find_user(ctx, body) {
    const qq = body.trim().replace(/^@/, '');
    const u = /^\d+$/.test(qq)
      ? await one(db.from('users').select('tg_id').eq('tg_id', qq).maybeSingle(), 'find.id')
      : await one(db.from('users').select('tg_id').ilike('username', qq).maybeSingle(), 'find.name');
    if (!u) { await ctx.reply(t(ctx, 'admin.userNotFound')); return back(ctx, 'admin'); }
    await back(ctx, 'a_user', [String(u.tg_id)]);
  },

  async adj_balance(ctx, body, { tgId }, { bot }) {
    const amt = parseNum(body);
    if (amt === null || amt === 0) { await ask(ctx.from.id, 'adj_balance', { tgId }); return ctx.reply(t(ctx, 'admin.balZero')); }
    try {
      const bal = await rpc('credit_user', { p_tg_id: Number(tgId), p_amount: amt, p_type: 'ADJUST', p_ref: 'admin:' + ctx.from.id });
      const target = await one(db.from('users').select('lang').eq('tg_id', tgId).maybeSingle(), 'adj.lang');
      const L = target?.lang || 'ar';
      bot.api.sendMessage(Number(tgId), amt > 0 ? t(L, 'admin.balUserCredit', { amount: money(amt) }) : t(L, 'admin.balUserDebit', { amount: money(-amt) }), { parse_mode: 'HTML' }).catch(() => {});
      await ctx.reply(t(ctx, 'admin.balDone', { balance: money(bal) }));
    } catch (e) {
      await ctx.reply(e.code === 'INSUFFICIENT_BALANCE' ? t(ctx, 'admin.balTooMuch') : t(ctx, 'sys.error'));
    }
    await back(ctx, 'a_user', [String(tgId)]);
  },

  async user_msg(ctx, body, { tgId }, { bot }) {
    try { await bot.api.sendMessage(Number(tgId), body, { parse_mode: 'HTML' }); await ctx.reply(t(ctx, 'admin.msgSent')); }
    catch { await ctx.reply(t(ctx, 'admin.msgFail')); }
    await back(ctx, 'a_user', [String(tgId)]);
  },

  // ---------- vouchers ----------
  async voucher_new(ctx, body) {
    const [aStr, cStr] = body.trim().split(/\s+/);
    const amount = parseNum(aStr), count = Math.min(50, Math.max(1, parseInt(cStr || '1', 10) || 1));
    if (amount === null || amount <= 0) { await ask(ctx.from.id, 'voucher_new'); return ctx.reply(t(ctx, 'admin.voucherBad'), { parse_mode: 'HTML' }); }
    const codes = Array.from({ length: count }, () => 'GC-' + crypto.randomBytes(4).toString('hex').toUpperCase());
    await q(db.from('vouchers').insert(codes.map((code) => ({ code, amount, created_by: ctx.from.id }))), 'voucher.insert');
    await ctx.reply(t(ctx, 'admin.voucherDone', { n: count, amount: money(amount), rule: RULE, codes: codes.map((c) => `<code>${c}</code>`).join('\n') }), { parse_mode: 'HTML' });
    await back(ctx, 'admin');
  },

  // ---------- broadcast (queued, processed by jobs/broadcast.js) ----------
  async broadcast(ctx, body) {
    const n = await enqueueBroadcast({ text: body, createdBy: ctx.from.id });
    await ctx.reply(t(ctx, 'admin.bcQueued', { n }));
    await back(ctx, 'admin');
  },
};
