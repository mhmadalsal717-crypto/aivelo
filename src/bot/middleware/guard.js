// ============================================================
//  Global guard middleware — runs on every update
//    1. load settings cache
//    2. ensure user row, attach ctx.user + ctx.lang
//    3. maintenance mode (admins pass)
//    4. banned users
//    5. onboarding gate (language → join → human check)
// ============================================================
import { isAdmin } from '../../config/index.js';
import { ensureUser } from '../../lib/db.js';
import { loadAll, Sbool } from '../../lib/settings.js';
import { defaultLang, t } from '../../i18n/index.js';
import { go } from '../ui/nav.js';
import { STEP_DONE, screenForStep } from '../screens/user/onboarding.js';
import { applyReferral } from '../../core/referrals.js';
import { logger } from '../../lib/logger.js';

const log = logger('guard');

export function guardMiddleware(bot) {
  return async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) return;
    if (ctx.chat && ctx.chat.type !== 'private') return;   // groups: ignore silently
    await loadAll();

    let u = null;
    try { u = await ensureUser(ctx.from); }
    catch (e) { log.error('ensureUser failed', e); }

    ctx.user = u;
    ctx.lang = u?.lang || defaultLang();
    const admin = isAdmin(ctx.from.id);

    // maintenance
    if (Sbool('maintenance') && !admin) {
      const msg = t(ctx, 'sys.maintenance');
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: msg, show_alert: true }).catch(() => {});
      else await ctx.reply(msg).catch(() => {});
      return;
    }

    // banned
    if (u?.banned) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: t(ctx, 'sys.banned'), show_alert: true }).catch(() => {});
      return;
    }

    // onboarding gate — admins exempt, gate screens themselves exempt
    const step = u?.onboard_step ?? STEP_DONE;
    const inGate = (ctx.callbackQuery?.data || '').startsWith('n:ob_');
    if (u && step < STEP_DONE && !admin && !inGate) {
      // referral must be recorded BEFORE we stop them — /start won't be reached
      const m = /^\/start\s+(\S+)/.exec(ctx.message?.text || '');
      if (m) await applyReferral(bot.api, u, m[1]).catch(() => {});
      await go(ctx, screenForStep(step), [], { forceNew: !ctx.callbackQuery });
      return;
    }

    return next();
  };
}
