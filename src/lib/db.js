// ============================================================
//  Supabase access layer
//
//  Two rules that fix the #1 source of silent bugs in v1:
//
//    1. `q()` — wrap every query. It THROWS on error instead of
//       returning { data: null }. A missing column now crashes the
//       screen with a readable message instead of showing an empty list.
//
//    2. `rpc()` — call a Postgres function and translate known
//       business exceptions (INSUFFICIENT_BALANCE…) into e.code.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { cfg } from '../config/index.js';
import { logger } from './logger.js';

const log = logger('db');

export const db = createClient(cfg.db.url, cfg.db.key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export class DbError extends Error {
  constructor(message, code = 'DB_ERROR', details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * Await a Supabase query builder and throw if it failed.
 * @template T
 * @param {PromiseLike<{data:T, error:any, count?:number}>} builder
 * @param {string} [what]  label for logs
 * @returns {Promise<{data:T, count:number|null}>}
 */
export async function q(builder, what = 'query') {
  const { data, error, count } = await builder;
  if (error) {
    log.error(`${what} failed`, { message: error.message, code: error.code, hint: error.hint });
    throw new DbError(error.message, error.code || 'DB_ERROR', error);
  }
  return { data, count: count ?? null };
}

/** Same as q() but returns only data — most common case */
export const rows = async (builder, what) => (await q(builder, what)).data ?? [];
export const one  = async (builder, what) => (await q(builder, what)).data ?? null;

// Business codes raised by our plpgsql functions via `raise exception`
const KNOWN = /(INSUFFICIENT_BALANCE|USER_NOT_FOUND|ORDER_NOT_FOUND|VOUCHER_INVALID|NO_BINANCE_ID|PAYMENT_NOT_FOUND|REF_CAP_REACHED|NOT_ENOUGH_REFERRALS)/;

/** Call a Postgres function. Throws Error with .code on failure. */
export async function rpc(fn, args = {}) {
  const { data, error } = await db.rpc(fn, args);
  if (error) {
    const m = KNOWN.exec(error.message || '');
    const code = m ? m[1] : 'DB_ERROR';
    if (!m) log.error(`rpc ${fn} failed`, { message: error.message });
    const e = new Error(m ? m[1] : error.message);
    e.code = code;
    throw e;
  }
  return data;
}

// ============================================================
//  Users
// ============================================================

/** Fetch or create the user row for a Telegram `from` object. */
export async function ensureUser(from) {
  const existing = await one(
    db.from('users').select('*').eq('tg_id', from.id).maybeSingle(), 'users.get');
  if (existing) {
    // keep username/first_name fresh — cheap and useful for admin search
    if (existing.username !== (from.username || null) || existing.first_name !== (from.first_name || null)) {
      db.from('users').update({ username: from.username || null, first_name: from.first_name || null })
        .eq('id', existing.id).then(() => {}, () => {});
    }
    return existing;
  }
  return one(db.from('users').insert({
    tg_id: from.id,
    username: from.username || null,
    first_name: from.first_name || null,
    ref_code: 'r' + Number(from.id).toString(36),
    lang: from.language_code?.startsWith('ar') ? 'ar' : null,   // null = must pick in onboarding
  }).select().single(), 'users.create');
}

export const getUserByTg = (tgId) =>
  one(db.from('users').select('*').eq('tg_id', tgId).maybeSingle(), 'users.byTg');

export const updateUser = (tgId, patch) =>
  q(db.from('users').update(patch).eq('tg_id', tgId), 'users.update');
