// ============================================================
//  Free-text input dispatcher
//  take() pops the pending input kind; the matching handler runs.
//  Handlers are split: user.js (customer flows) / admin.js
// ============================================================
import { take } from '../ui/input.js';
import { t } from '../../i18n/index.js';
import { logger } from '../../lib/logger.js';
import { isAdmin } from '../../config/index.js';
import userHandlers from './user.js';
import adminHandlers from './admin.js';

const log = logger('input');

/** @returns {boolean} handled? */
export async function handleInput(ctx, deps) {
  const p = await take(ctx.from.id);
  if (!p) return false;
  if (p.expired) { await ctx.reply(t(ctx, 'sys.inputExpired')); return true; }

  const body = (ctx.message.text || ctx.message.caption || '').trim();
  const H = userHandlers[p.kind] || (isAdmin(ctx.from.id) ? adminHandlers[p.kind] : null);
  if (!H) return false;

  try { await H(ctx, body, p.payload || {}, deps); }
  catch (e) {
    log.error(`handler ${p.kind} failed`, e);
    await ctx.reply(e.code === 'INSUFFICIENT_BALANCE' ? t(ctx, 'wd.noBalance') : t(ctx, 'sys.error')).catch(() => {});
  }
  return true;
}
