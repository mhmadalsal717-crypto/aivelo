// ============================================================
//  Customer text-input handlers
// ============================================================
import { db, rpc, q } from '../../lib/db.js';
import { money } from '../../lib/fmt.js';
import { Snum } from '../../lib/settings.js';
import { parseNum } from '../../lib/fmt.js';
import { go } from '../ui/nav.js';
import { ask } from '../ui/input.js';
import { t } from '../../i18n/index.js';
import { gateway } from '../../payments/index.js';

export default {
  // ---------- payments (gateway-agnostic) ----------
  async pay_amount(ctx, body, { method }, deps) {
    const gw = gateway(method);
    if (!gw) return ctx.reply(t(ctx, 'topup.unknownMethod'));
    const amt = parseNum(body);
    if (amt === null || amt <= 0) {
      await ask(ctx.from.id, 'pay_amount', { method });
      return ctx.reply(t(ctx, 'sys.notNumber', { ex: method === 'STARS' ? '250' : '20' }), { parse_mode: 'HTML' });
    }
    await gw.onAmount(ctx, amt, deps);
  },

  async pay_reference(ctx, body, { method, orderId }, deps) {
    const gw = gateway(method);
    if (!gw?.onReference) return ctx.reply(t(ctx, 'topup.unknownMethod'));
    await gw.onReference(ctx, orderId, body, deps);
  },

  // ---------- voucher ----------
  async voucher(ctx, code) {
    try {
      const [row] = await rpc('redeem_voucher', { p_tg_id: ctx.from.id, p_code: code.trim() });
      await ctx.reply(t(ctx, 'voucher.ok', { amount: money(row.amount), balance: money(row.new_balance) }), { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(e.code === 'VOUCHER_INVALID' ? t(ctx, 'voucher.invalid') : t(ctx, 'sys.error'));
    }
  },

  // ---------- withdrawals ----------
  async binance_id(ctx, body) {
    const id = body.replace(/\D/g, '');
    if (id.length < 5) { await ask(ctx.from.id, 'binance_id'); return ctx.reply(t(ctx, 'wd.badId')); }
    await q(db.from('users').update({ binance_id: id }).eq('tg_id', ctx.from.id), 'wd.saveId');
    await ctx.reply(t(ctx, 'wd.savedId', { id }), { parse_mode: 'HTML' });
    await go(ctx, 'wd_profile', [], { forceNew: true });
  },

  async withdraw(ctx, body, _p, { notifyAdmin }) {
    const amt = parseNum(body), min = Snum('min_withdraw', 5);
    if (amt === null || amt < min) { await ask(ctx.from.id, 'withdraw'); return ctx.reply(t(ctx, 'wd.tooLow', { min: money(min) })); }
    try {
      const id = await rpc('open_withdrawal', { p_tg_id: ctx.from.id, p_amount: amt });
      notifyAdmin(t('ar', 'admin.wdNew', { id, name: ctx.from.first_name || '', tg: ctx.from.id, amount: money(amt), binance: ctx.user?.binance_id || '—' }));
      await ctx.reply(t(ctx, 'wd.created', { amount: money(amt) }), { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(e.code === 'INSUFFICIENT_BALANCE' ? t(ctx, 'wd.noBalance') : e.code === 'NO_BINANCE_ID' ? t(ctx, 'wd.needId') : t(ctx, 'sys.error'));
    }
    await go(ctx, 'profile', [], { forceNew: true });
  },
};
