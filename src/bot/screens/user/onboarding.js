// ============================================================
//  Onboarding gate — once per user
//    0 LANG   → pick language
//    1 JOIN   → join channel/group (if force_join on)
//    2 HUMAN  → pick the right number (if ref_human_check on)
//    3 DONE
//
//  Membership is checked once at verification, not on every message
//  (getChatMember is a network call). Bot must be admin in the chats;
//  if the check fails we let the user through rather than lock everyone out.
// ============================================================
import { screen, to, sendFresh } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { db, q } from '../../../lib/db.js';
import { S, Sbool, T } from '../../../lib/settings.js';
import { t, LANGS, LANG_META } from '../../../i18n/index.js';
import { mainMenu } from '../../ui/menu.js';
import { logger } from '../../../lib/logger.js';

const log = logger('onboard');

export const STEP_LANG = 0, STEP_JOIN = 1, STEP_HUMAN = 2, STEP_DONE = 3;
export const screenForStep = (s) => ['ob_lang', 'ob_join', 'ob_human'][s] || 'ob_lang';

const MEMBER = new Set(['member', 'administrator', 'creator']);
const setStep = (tgId, step) => q(db.from('users').update({ onboard_step: step }).eq('tg_id', tgId), 'ob.step');

export function requiredChats() {
  const out = [];
  const c = S('join_channel_id').trim(), g = S('join_group_id').trim();
  if (c) out.push({ id: c, url: S('join_channel_url').trim(), key: 'join.channel' });
  if (g) out.push({ id: g, url: S('join_group_url').trim(),   key: 'join.group' });
  return out;
}
export const joinRequired = () => Sbool('force_join', false) && requiredChats().length > 0;

export async function isJoined(api, tgId) {
  if (!joinRequired()) return true;
  for (const chat of requiredChats()) {
    try {
      const m = await api.getChatMember(chat.id, tgId);
      if (!MEMBER.has(m.status)) return false;
    } catch (e) {
      log.error('membership check failed — is the bot admin there?', { chat: chat.id, err: e.message });
      return true;
    }
  }
  return true;
}

export const welcomeText = (lang) => T('welcome', lang, t(lang, 'welcome.default'));

async function afterJoin(ctx) {
  if (Sbool('ref_human_check', true)) {
    await setStep(ctx.from.id, STEP_HUMAN);
    return { goto: 'ob_human' };
  }
  await finish(ctx);
  return null;
}

async function finish(ctx) {
  await q(db.from('users').update({ onboard_step: STEP_DONE, ref_verified: true }).eq('tg_id', ctx.from.id), 'ob.finish');
  await ctx.deleteMessage().catch(() => {});
  await sendFresh(ctx, welcomeText(ctx.lang), mainMenu(ctx.from.id, ctx.lang)).catch(() => {});
}

// ---------- step 0: language ----------
screen('ob_lang', async () => {
  const k = kb();
  for (const l of LANGS) k.text(`${LANG_META[l].flag} ${LANG_META[l].name}`, to('ob_set', l));
  return { text: t('ar', 'lang.pickFirst'), kb: k.row().build() };
});

screen('ob_set', async (ctx, [code]) => {
  const lang = LANGS.includes(code) ? code : 'ar';
  await q(db.from('users').update({ lang }).eq('tg_id', ctx.from.id), 'ob.lang');
  ctx.lang = lang;
  if (!joinRequired() || await isJoined(ctx.api, ctx.from.id)) return afterJoin(ctx);
  await setStep(ctx.from.id, STEP_JOIN);
  return { goto: 'ob_join' };
});

// ---------- step 1: join ----------
screen('ob_join', async (ctx) => {
  const k = kb();
  for (const c of requiredChats()) if (c.url) k.url(t(ctx, c.key), c.url).row();
  k.add({ text: t(ctx, 'join.verify'), data: to('ob_check'), style: 'success' }).row();
  return { text: t(ctx, 'join.text'), kb: k.build() };
});

screen('ob_check', async (ctx) => {
  if (await isJoined(ctx.api, ctx.from.id)) return afterJoin(ctx);
  await ctx.answerCallbackQuery?.({ text: t(ctx, 'join.missing'), show_alert: true }).catch(() => {});
  return null;
});

// ---------- step 2: human check ----------
// Number derived from user id — no state to store. Goal is stopping
// scripts that mass-create accounts, not cryptographic security.
const NUMS = [3, 7, 5, 9];
const challengeFor = (tgId) => Number(tgId) % NUMS.length;

screen('ob_human', async (ctx) => {
  const want = NUMS[challengeFor(ctx.from.id)];
  const k = kb();
  // shuffle button order per user so position isn't constant
  const order = [...NUMS.keys()].sort((a, b) => ((a * 7 + ctx.from.id) % 4) - ((b * 7 + ctx.from.id) % 4));
  for (const i of order) k.text(String(NUMS[i]), to('ob_hv', String(i)));
  return { text: t(ctx, 'hv.title', { n: want }), kb: k.row().build() };
});

screen('ob_hv', async (ctx, [pick]) => {
  if (Number(pick) !== challengeFor(ctx.from.id)) {
    await ctx.answerCallbackQuery?.({ text: t(ctx, 'hv.wrong'), show_alert: true }).catch(() => {});
    return null;
  }
  await finish(ctx);
  return null;
});
