// ============================================================
//  GGSoma health state (in-memory)
//
//  Kept in its own file to avoid a circular import
//  (purchase → reconciler → purchase). purchase.js reads it
//  before debiting a customer; the health job updates it.
// ============================================================
let healthy = true;
let reason  = null;
let since   = Date.now();

export const isHealthy    = () => healthy;
export const healthReason = () => reason;
export const healthSince  = () => since;

/** @returns previous state so the caller knows if it changed */
export function setHealth(ok, why = null) {
  const was = healthy;
  if (was !== !!ok) since = Date.now();
  healthy = !!ok;
  reason  = ok ? null : why;
  return was;
}
