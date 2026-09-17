// ============================================================
//  GGSoma monitoring: health check + wallet balance
//  Alerts fire on STATE CHANGE only, never every cycle.
// ============================================================
import { gg } from '../services/ggsoma.js';
import { Snum } from '../lib/settings.js';
import { money } from '../lib/fmt.js';
import { setHealth } from './health.js';
import { t } from '../i18n/index.js';

export async function checkHealth({ notifyAdmin }) {
  let ok = true, reason = null;
  try {
    const h = await gg.health();
    ok = !h.maintenance;
    if (h.maintenance) reason = 'MAINTENANCE';
  } catch (e) {
    ok = false; reason = e.code || e.message;
  }
  const was = setHealth(ok, reason);
  if (was && !ok) {
    notifyAdmin?.(reason === 'MAINTENANCE'
      ? t('ar', 'admin.alert.maintenance')
      : t('ar', 'admin.alert.unreachable', { reason }));
  } else if (!was && ok) {
    notifyAdmin?.(t('ar', 'admin.alert.recovered'));
  }
  return ok;
}

let lastWalletAlert = 0;
let lastReadFailAlert = 0;

/** Read our GGSoma wallet. Alerts at most once per 6h for low balance / read failure. */
export async function checkWallet({ notifyAdmin }) {
  const threshold = Snum('low_wallet_alert', 20);
  const SIX_H = 6 * 3600_000;
  try {
    const b = await gg.balance();
    const bal = Number(b.balance);
    if (bal < threshold && Date.now() - lastWalletAlert > SIX_H) {
      lastWalletAlert = Date.now();
      notifyAdmin?.(t('ar', 'admin.alert.lowWallet', { balance: money(bal) }));
    }
    return bal;
  } catch (e) {
    if (Date.now() - lastReadFailAlert > SIX_H) {
      lastReadFailAlert = Date.now();
      notifyAdmin?.(t('ar', 'admin.alert.walletReadFail', { err: e.code || e.message }));
    }
    return null;
  }
}
