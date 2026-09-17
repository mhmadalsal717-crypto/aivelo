// ============================================================
//  Bot wiring: middleware → commands → callbacks → text input
// ============================================================
import { Bot } from 'grammy';
import { cfg, isAdmin } from '../config/index.js';
import { ensureUser } from '../lib/db.js';
import { esc, money, RULE } from '../lib/fmt.js';
import { logger } from '../lib/logger.js';
import { t, defaultLang } from '../i18n/index.js';
import { go, to, withLoading, sendFresh } from './ui/nav.js';
import { kb } from './ui/kb.js';
import { MENU, mainMenu } from './ui/menu.js';
import { clear } from './ui/input.js';
import { renderResult } from './ui/delivery.js';
import { guardMiddleware } from './middleware/guard.js';
import { handleInput } from './handlers/index.js';
import { purchase } from '../core/purchase.js';
import { applyReferral } from '../core/referrals.js';
import { welcomeText } from './screens/user/onboarding.js';
import { wireStars, startStars } from '../payments/gateways/stars.js';

// register all screens (side-effect imports)
import './screens/user/onboarding.js';
import './screens/user/shop.js';
import './screens/user/account.js';
import './screens/user/wallet.js';
import './screens/user/misc.js';
import './screens/admin/dashboard.js';
import './screens/admin/settings.js';
import './screens/admin/products.js';
import './screens/admin/providers.js';
import './screens/admin/pricing.js';
import './screens/admin/finance.js';
import './screens/admin/users.js';

const log = logger('bot');
export const bot = new Bot(cfg.bot.token);

/** Send an HTML message to all admins (or one specific admin) */
export const notifyAdmin = (text, replyMarkup = undefined, onlyId = null) => {
  const ids = onlyId ? [onlyId] : cfg.bot.adminIds;
  for (const id of ids) {
    bot.api.sendMessage(id, text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: replyMarkup })
      .catch((e) => log.warn('notifyAdmin failed', { id, err: e.description }));
  }
};

/** Used by the reconciler to deliver results later */
export const sendResult = (chatId, result, lang = 'ar') =>
  bot.api.sendMessage(chatId, renderResult(lang, result), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } }).catch(() => {});

const deps = { bot, notifyAdmin };

// ---------- middleware ----------
bot.use(guardMiddleware(bot));

// ---------- commands ----------
bot.command('start', async (ctx) => {
  const payload = ctx.match?.trim();
  if (payload) await applyReferral(bot.api, ctx.user, payload).catch(() => {});
  await clear(ctx.from.id);
  await sendFresh(ctx, welcomeText(ctx.lang), mainMenu(ctx.from.id, ctx.lang));
});
bot.command('menu',  (ctx) => sendFresh(ctx, welcomeText(ctx.lang), mainMenu(ctx.from.id, ctx.lang)));
bot.command('lang',  (ctx) => go(ctx, 'lang', [], { forceNew: true }));
bot.command('admin', (ctx) => isAdmin(ctx.from.id) && go(ctx, 'admin', [], { forceNew: true }));

// ---------- reply-keyboard buttons (any language) ----------
for (const [label, screenName] of Object.entries(MENU)) {
  bot.hears(label, async (ctx) => { await clear(ctx.from.id); await go(ctx, screenName, [], { forceNew: true }); });
}

// ---------- purchase (before the generic router) ----------
bot.callbackQuery(/^n:buy:([^:]+):?(\d+)?$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: t(ctx, 'sys.working') }).catch(() => {});
  const slug = ctx.match[1], qty = Number(ctx.match[2] || 1);
  const user = await ensureUser(ctx.from);

  const result = await withLoading(ctx, t(ctx, 'order.working', { rule: RULE }),
    () => purchase({ tgId: ctx.from.id, slug, quantity: qty, user, lang: ctx.lang, notifyAdmin }));

  const markup = kb().text(t(ctx, 'btn.orders'), to('orders', '1')).row().text(t(ctx, 'btn.close'), to('close')).build();
  const text = renderResult(ctx.lang, result);
  await ctx.editMessageText(text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: markup })
    .catch(() => ctx.reply(text, { parse_mode: 'HTML', reply_markup: markup }));

  if (result.state === 'DELIVERED') {
    const o = result.order || {};
    const cost = Number(o.totalCharged || 0), charged = Number(o.charged ?? 0);
    notifyAdmin(t('ar', 'admin.alert.sale', {
      name: esc(o.product?.name || slug), tg: ctx.from.id,
      charged: charged ? money(charged) : '—', cost: money(cost), profit: charged ? money(charged - cost) : '—',
    }));
  }
});

// ---------- stars pack ----------
bot.callbackQuery(/^n:st_buy:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await startStars(ctx, parseInt(ctx.match[1], 10));
});

// ---------- generic screen router ----------
bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery().catch(() => {}));
bot.callbackQuery(/^n:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const [name, ...args] = ctx.match[1].split(':');
  await go(ctx, name, args);
});

// ---------- stars payments ----------
wireStars(bot, deps);

// ---------- free text ----------
bot.on('message:text', async (ctx, next) => {
  const done = await handleInput(ctx, deps);
  if (!done) return next();
});
bot.on('message:text', (ctx) => ctx.reply(t(ctx, 'sys.unknown'), { reply_markup: mainMenu(ctx.from.id, ctx.lang) }));
// other message types (stickers, photos…) — ignore quietly

bot.catch((err) => log.error('unhandled', { err: err.error?.description || err.error?.message || String(err.error), update: err.ctx?.update?.update_id }));

// ---------- bot profile (commands, descriptions) per language ----------
export async function setupBotUI() {
  const cmds = (lang) => [
    { command: 'start', description: t(lang, 'welcome.cmdStart') },
    { command: 'menu',  description: t(lang, 'welcome.cmdMenu') },
    { command: 'lang',  description: t(lang, 'welcome.cmdLang') },
  ];
  await bot.api.setMyCommands(cmds(defaultLang())).catch(() => {});
  await bot.api.setMyCommands(cmds('en'), { language_code: 'en' }).catch(() => {});
  await bot.api.setMyCommands(cmds('ar'), { language_code: 'ar' }).catch(() => {});
  await bot.api.setChatMenuButton({ menu_button: { type: 'commands' } }).catch(() => {});
  await bot.api.setMyShortDescription(t('ar', 'welcome.shortDesc')).catch(() => {});
  await bot.api.setMyShortDescription(t('en', 'welcome.shortDesc'), { language_code: 'en' }).catch(() => {});
  await bot.api.setMyDescription(t('ar', 'welcome.longDesc')).catch(() => {});
  await bot.api.setMyDescription(t('en', 'welcome.longDesc'), { language_code: 'en' }).catch(() => {});
}
