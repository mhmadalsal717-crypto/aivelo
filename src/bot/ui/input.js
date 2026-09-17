// ============================================================
//  Input state machine — PERSISTED in `input_state` table
//
//  v1 kept this in a Map; every deploy/restart made customers who
//  were mid-payment paste their TxID into the void. Now a restart
//  is invisible to them.
//
//  A small in-memory cache avoids a DB read on every text message
//  for users who are not in an input flow (the common case).
// ============================================================
import { db, q, one } from '../../lib/db.js';

const DEFAULT_TTL = 15 * 60_000;
const memo = new Map();   // tgId -> row | null (negative cache)

/** Ask the user for input. Next text message goes to handler `kind`. */
export async function ask(tgId, kind, payload = null, ttlMs = DEFAULT_TTL) {
  const row = { tg_id: tgId, kind, payload: payload || {}, expires_at: new Date(Date.now() + ttlMs).toISOString() };
  await q(db.from('input_state').upsert(row, { onConflict: 'tg_id' }), 'input.ask');
  memo.set(Number(tgId), row);
}

export async function clear(tgId) {
  memo.set(Number(tgId), null);
  await q(db.from('input_state').delete().eq('tg_id', tgId), 'input.clear');
}

/** Pop the pending input (if any and not expired) */
export async function take(tgId) {
  const id = Number(tgId);
  let row = memo.has(id) ? memo.get(id)
          : await one(db.from('input_state').select('*').eq('tg_id', id).maybeSingle(), 'input.take');
  if (!row) { memo.set(id, null); return null; }
  await clear(id);
  if (new Date(row.expires_at) < new Date()) return { expired: true, kind: row.kind };
  return { kind: row.kind, payload: row.payload || {} };
}

/** Peek without consuming */
export async function peek(tgId) {
  const id = Number(tgId);
  if (memo.has(id)) return memo.get(id);
  const row = await one(db.from('input_state').select('*').eq('tg_id', id).maybeSingle(), 'input.peek');
  memo.set(id, row);
  return row;
}

/** Periodic cleanup */
export const purgeExpired = () =>
  q(db.from('input_state').delete().lt('expires_at', new Date().toISOString()), 'input.purge');
