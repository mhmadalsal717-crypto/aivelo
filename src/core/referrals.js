// ============================================================
//  Referral system — ONE unified model
//
//  Two income streams for the referrer, both configurable:
//    A) Milestone reward:  every `ref_per_reward` QUALIFIED invitees
//       → `ref_reward_usd` (paid via pay_referral_rewards SQL, which
//       enforces ref_daily_cap / ref_total_cap).
//    B) Commission: `referral_pct` % of every purchase by an invitee
//       (paid inside complete_order SQL).
//
//  An invitee becomes QUALIFIED only after:
//    1. onboarding done (language + join gate)      → onboard_step = DONE
//    2. human check passed                          → ref_verified
//    3. a real action in the bot (opened products)  → ref_active
//
//  The old instant "join bonus" (referral_join) is removed: it was
//  the easiest thing to farm with fake accounts.
// ============================================================
import { db, one, q, updateUser } from '../lib/db.js';
import { Snum } from '../lib/settings.js';
import { E } from '../lib/settings.js';
import { t } from '../i18n/index.js';
import { logger } from '../lib/logger.js';

const log = logger('ref');

export const perReward = () => Math.max(1, Snum('ref_per_reward', 15));
export const rewardUsd = () => Snum('ref_reward_usd', 1);

/**
 * Attach a new user to a referrer via /start payload.
 * Safe to call multiple times — only the first link sticks.
 */
export async function applyReferral(api, user, payload) {
  if (!payload || !user || user.referred_by) return false;
  const ref = await one(db.from('users').select('id, tg_id, lang').eq('ref_code', payload).maybeSingle(), 'ref.lookup');
  if (!ref || ref.tg_id === user.tg_id) return false;

  await q(db.from('users').update({ referred_by: ref.id }).eq('id', user.id), 'ref.attach');
  log.info('referral attached', { user: user.tg_id, by: ref.tg_id });

  api.sendMessage(ref.tg_id, t(ref.lang || 'ar', 'inv.newJoin', { emoji: E('gift') }), { parse_mode: 'HTML' })
    .catch(() => {});
  return true;
}

/** Mark invitee as active on first real action (single write) */
export async function markActive(user) {
  if (!user || user.ref_active || !user.referred_by) return;
  await q(db.from('users').update({ ref_active: true }).eq('id', user.id), 'ref.active');
}

/** Funnel stats for a referrer */
export async function stats(userId) {
  const { data } = await q(db.from('users')
    .select('onboard_step, ref_verified, ref_active, ref_rewarded').eq('referred_by', userId), 'ref.stats');
  const s = { total: data.length, join: 0, human: 0, active: 0, ready: 0, paid: 0 };
  for (const r of data) {
    if (r.ref_rewarded)            { s.paid++;   continue; }
    if ((r.onboard_step ?? 0) < 3) { s.join++;   continue; }
    if (!r.ref_verified)           { s.human++;  continue; }
    if (!r.ref_active)             { s.active++; continue; }
    s.ready++;
  }
  return s;
}

/** Pay milestone rewards. Returns {batches, paid, balance} or throws REF_CAP_REACHED */
export async function claim(tgId) {
  const { rpc } = await import('../lib/db.js');
  const [row] = await rpc('pay_referral_rewards', {
    p_referrer_tg: tgId, p_per_reward: perReward(), p_reward_usd: rewardUsd(),
    p_total_cap: Snum('ref_total_cap', 100), p_daily_cap: Snum('ref_daily_cap', 10),
  });
  return { batches: row?.out_batches ?? 0, paid: Number(row?.out_paid ?? 0), balance: Number(row?.out_balance ?? 0) };
}
