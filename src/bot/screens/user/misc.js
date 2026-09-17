// ============================================================
//  Misc: language / help / policy / invites
// ============================================================
import { screen, to, sendFresh } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { mainMenu } from '../../ui/menu.js';
import { db, q, ensureUser } from '../../../lib/db.js';
import { E, S, T, Snum } from '../../../lib/settings.js';
import { money } from '../../../lib/fmt.js';
import { t, LANGS, LANG_META } from '../../../i18n/index.js';
import * as ref from '../../../core/referrals.js';
import { welcomeText } from './onboarding.js';

// ---------- language ----------
screen('lang', async (ctx) => {
  const k = kb();
  for (const l of LANGS) k.add({ text: `${LANG_META[l].flag} ${LANG_META[l].name}`, data: to('lang_set', l), style: l === ctx.lang ? 'success' : undefined });
  k.row().text(t(ctx, 'btn.close'), to('close'));
  return { text: `${t(ctx, 'lang.title')}\n${t(ctx, 'lang.current', { name: LANG_META[ctx.lang].name })}\n\n${t(ctx, 'lang.pick')}`, kb: k.build() };
});

screen('lang_set', async (ctx, [code]) => {
  const lang = LANGS.includes(code) ? code : 'ar';
  await q(db.from('users').update({ lang }).eq('tg_id', ctx.from.id), 'lang.set');
  ctx.lang = lang;
  await ctx.deleteMessage().catch(() => {});
  // reply keyboard can only change via a fresh message
  await sendFresh(ctx, `${t(lang, 'lang.done')}\n\n${welcomeText(lang)}`, mainMenu(ctx.from.id, lang)).catch(() => {});
  return null;
});

// ---------- help / policy ----------
const supportUser = () => { const s = S('support_user').replace(/^@/, ''); return s ? '@' + s : ''; };

screen('help', async (ctx) => {
  const su = supportUser();
  const body = T('help', ctx.lang, t(ctx, 'help.default')).replaceAll('{user}', su || '—');
  const k = kb();
  if (su) k.url(t(ctx, 'help.contact'), `https://t.me/${su.slice(1)}`).row();
  k.text(t(ctx, 'btn.close'), to('close'));
  return { text: `<blockquote>${E('help')} <b>${t(ctx, 'help.title')}</b></blockquote>\n\n${body}`, kb: k.build() };
});

screen('policy', async (ctx) => ({
  text: `<blockquote>${E('policy')} <b>${t(ctx, 'policy.title')}</b></blockquote>\n\n${T('policy', ctx.lang, t(ctx, 'policy.default'))}`,
  kb: kb().text(t(ctx, 'btn.close'), to('close')).build(),
}));

// ---------- invites ----------
screen('invites', async (ctx) => ({
  text: t(ctx, 'inv.menu'),
  kb: kb().text(t(ctx, 'inv.btnLink'), to('inv_link')).text(t(ctx, 'inv.btnStats'), to('inv_stats')).row()
          .text(t(ctx, 'btn.close'), to('close')).build(),
}));

screen('inv_link', async (ctx) => {
  const u = await ensureUser(ctx.from);
  const me = await ctx.api.getMe();
  const link = `https://t.me/${me.username}?start=${u.ref_code}`;
  const text = [
    t(ctx, 'inv.linkTitle'), `<blockquote><code>${link}</code></blockquote>`, '',
    t(ctx, 'inv.linkPitch', { reward: ref.rewardUsd(), per: ref.perReward(), pct: Snum('referral_pct', 0) }), '',
    t(ctx, 'inv.rules', { daily: Snum('ref_daily_cap', 10), total: Snum('ref_total_cap', 100), support: supportUser() || '—' }),
  ].join('\n');
  return { text, kb: kb().url(t(ctx, 'inv.btnShare'), `https://t.me/share/url?url=${encodeURIComponent(link)}`).row()
    .text(t(ctx, 'btn.back'), to('invites')).build() };
});

screen('inv_stats', async (ctx) => {
  const u = await ensureUser(ctx.from);
  const s = await ref.stats(u.id);
  const per = ref.perReward();
  const text = [
    t(ctx, 'inv.statsTitle'), '',
    t(ctx, 'inv.stTotal', { n: s.total }), t(ctx, 'inv.stJoin', { n: s.join }), t(ctx, 'inv.stHuman', { n: s.human }),
    t(ctx, 'inv.stActive', { n: s.active }), t(ctx, 'inv.stReady', { n: s.ready }), t(ctx, 'inv.stPaid', { n: s.paid }),
    t(ctx, 'inv.stEarned', { amount: money(u.ref_earned) }), '',
    t(ctx, 'inv.stFoot', { per, reward: ref.rewardUsd() }),
  ].join('\n');
  const k = kb();
  if (s.ready >= per) k.add({ text: t(ctx, 'inv.btnClaim'), data: to('inv_claim'), style: 'success' }).row();
  k.text(t(ctx, 'btn.back'), to('invites'));
  return { text, kb: k.build() };
});

screen('inv_claim', async (ctx) => {
  try {
    const r = await ref.claim(ctx.from.id);
    if (r.batches < 1) {
      const s = await ref.stats(ctx.user.id);
      await ctx.answerCallbackQuery?.({ text: t(ctx, 'inv.claimNone', { need: ref.perReward() - (s.ready % ref.perReward()) }).replace(/<[^>]+>/g, ''), show_alert: true }).catch(() => {});
      return { goto: 'inv_stats' };
    }
    return { text: t(ctx, 'inv.claimOk', { amount: money(r.paid), n: r.batches * ref.perReward(), balance: money(r.balance) }),
             kb: kb().text(t(ctx, 'btn.back'), to('invites')).build() };
  } catch (e) {
    const msg = e.code === 'REF_CAP_REACHED' ? t(ctx, 'inv.claimCap') : t(ctx, 'sys.error');
    await ctx.answerCallbackQuery?.({ text: msg, show_alert: true }).catch(() => {});
    return { goto: 'inv_stats' };
  }
});
