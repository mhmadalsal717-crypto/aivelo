// ============================================================
//  Binance personal account API — signed requests (HMAC-SHA256)
//
//  Uses a REGULAR account API key (not a Merchant account). The key
//  only needs "Enable Reading" — no trading/withdrawal permission —
//  since we only ever call GET /sapi/v1/pay/transactions to read the
//  Binance Pay transaction history and match it against pending
//  BINANCE_PAY orders in our own DB.
//
//  Docs: https://developers.binance.com/docs/pay/rest-api
// ============================================================
import crypto from 'node:crypto';
import { cfg } from '../config/index.js';

const BASE = 'https://api.binance.com';

function sign(query) {
  return crypto.createHmac('sha256', cfg.binance.secretKey).update(query).digest('hex');
}

async function signedGet(path, params = {}) {
  const qs = new URLSearchParams({ ...params, timestamp: Date.now(), recvWindow: 10000 });
  qs.append('signature', sign(qs.toString()));

  const res = await fetch(`${BASE}${path}?${qs.toString()}`, {
    headers: { 'X-MBX-APIKEY': cfg.binance.apiKey },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    const e = new Error(json?.msg || `BINANCE_HTTP_${res.status}`);
    e.code = 'BINANCE_API_ERROR';
    throw e;
  }
  return json;
}

/**
 * Get recent Binance Pay transaction history for OUR account.
 * @param {{startTime?:number, endTime?:number, limit?:number}} opts
 * @returns {Promise<{code:string, data:Array, success:boolean}>}
 */
export const getPayTransactions = ({ startTime, endTime, limit = 100 } = {}) =>
  signedGet('/sapi/v1/pay/transactions', {
    ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}),
    limit,
  });
