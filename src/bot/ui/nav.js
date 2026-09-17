// ============================================================
//  Screen router — edits the same message instead of sending new
//  ones, so the bot feels like an app, not a chat log.
//
//  screen('name', async (ctx, args) => ({ text, kb }))
//  to('name', ...args)      → callback_data  "n:name:arg1:arg2"
//  go(ctx, 'name', args)    → render
//
//  A screen may return:
//    { text, kb }           render
//    { goto, args }         redirect to another screen
//    null / undefined       it handled output itself
// ============================================================
import { logger } from '../../lib/logger.js';

const log = logger('nav');
const screens = new Map();

export const screen = (name, fn) => {
  if (screens.has(name)) log.warn('screen redefined', { name });
  screens.set(name, fn);
};
export const hasScreen = (name) => screens.has(name);
export const to = (name, ...args) => ['n', name, ...args].join(':');

const MAX_REDIRECTS = 5;

export async function go(ctx, name, args = [], { forceNew = false, _depth = 0 } = {}) {
  if (name === 'close') {
    try { await ctx.deleteMessage(); } catch { await ctx.editMessageText('✔️').catch(() => {}); }
    return;
  }
  const fn = screens.get(name);
  if (!fn) { log.error('unknown screen', { name }); return; }

  const view = await fn(ctx, args);

  if (view?.goto) {
    if (_depth >= MAX_REDIRECTS) { log.error('redirect loop', { name, goto: view.goto }); return; }
    return go(ctx, view.goto, view.args || [], { forceNew, _depth: _depth + 1 });
  }
  if (!view?.text) return;

  const opts = { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: view.kb };

  if (ctx.callbackQuery && !forceNew) {
    try { await ctx.editMessageText(view.text, opts); return; }
    catch (e) {
      const d = e.description || e.message || '';
      if (/not modified/i.test(d)) return;          // same button tapped twice
      if (!/message to edit not found|can't be edited/i.test(d)) log.debug('edit failed, sending new', { d });
    }
  }
  await ctx.reply(view.text, opts);
}

/** Show a loading state while a long task runs */
export async function withLoading(ctx, loadingText, task) {
  if (ctx.callbackQuery) await ctx.editMessageText(loadingText, { parse_mode: 'HTML' }).catch(() => {});
  else await ctx.replyWithChatAction('typing').catch(() => {});
  return task();
}

/** Send a fresh message (used when the reply keyboard must be re-sent) */
export const sendFresh = (ctx, text, reply_markup) =>
  ctx.reply(text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup });
