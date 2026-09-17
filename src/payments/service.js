// ============================================================
//  Shared payment layer — every gateway goes through here
//  create intent → (gateway does its thing) → atomic credit
// ============================================================
import crypto from 'node:crypto';
import { db, rpc, q, one } from '../lib/db.js';
import { Snum } from '../lib/settings.js';

export const newOrderId = (method, tgId) =>
  `${method.toLowerCase()}-${tgId}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

export const depositLimits = () => ({ min: Snum('deposit_min', 1), max: Snum('deposit_max', 10000) });

/** Create a PENDING payment intent */
export async function openPayment({ tgId, method, amountUsd, stars = null, minutes = 60, extra = {} }) {
  const u = await one(db.from('users').select('id').eq('tg_id', tgId).single(), 'pay.user');
  return one(db.from('payments').insert({
    user_id: u.id, method, amount_usd: amountUsd, stars,
    order_id: newOrderId(method, tgId),
    expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
    payload: extra,
  }).select().single(), 'pay.open');
}

export const setPayment = (orderId, patch) =>
  q(db.from('payments').update({ ...patch, updated_at: new Date().toISOString() }).eq('order_id', orderId), 'pay.set');

export const getPaymentRow = (orderId) =>
  one(db.from('payments').select('*, users!inner(tg_id, lang, first_name)').eq('order_id', orderId).maybeSingle(), 'pay.get');

/**
 * Credit the user's wallet. Fully idempotent — webhook may arrive
 * twice, admin may tap approve twice: credited exactly once.
 * @returns {{credited:boolean, new_balance:number, amount:number}}
 */
export async function creditPayment(orderId, externalId = null) {
  const [row] = await rpc('credit_payment', { p_order_id: orderId, p_external: externalId });
  return {
    credited:    row?.out_credited === true,
    new_balance: Number(row?.out_balance ?? 0),
    amount:      Number(row?.out_amount ?? 0),
  };
}

/** Expire stale intents. Manual-review payments with a TxID are kept. */
export async function expireStale() {
  const { data } = await q(db.from('payments')
    .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
    .eq('status', 'PENDING').lt('expires_at', new Date().toISOString())
    .is('external_id', null).select('order_id'), 'pay.expire');
  return data?.length || 0;
}
