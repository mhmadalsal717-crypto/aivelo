// ============================================================
//  Payment gateway registry
//
//  Each gateway is ONE file in ./gateways that exports an object
//  implementing the Gateway interface (see ./gateways/_template.js).
//  Register it here — that's the only wiring needed. The top-up
//  screen, input handlers, webhooks and admin review pull from
//  this list automatically.
// ============================================================
import binance     from './gateways/binance.js';
import nowpayments from './gateways/nowpayments.js';
import stars       from './gateways/stars.js';
// import cryptomus from './gateways/cryptomus.js';   // kept on disk, unregistered — not usable from Syria

/** Order = order of buttons on the top-up screen */
export const GATEWAYS = [binance, nowpayments, stars];

const byId = Object.fromEntries(GATEWAYS.map((g) => [g.id, g]));

export const gateway = (id) => byId[id] || null;

/** Gateways the customer can use right now (enabled + configured) */
export const activeGateways = () => GATEWAYS.filter((g) => g.isEnabled() && g.isConfigured());

/** Gateways that need a manual admin review step */
export const manualGateways = () => GATEWAYS.filter((g) => g.manualReview);

/** Bilingual label for payment log */
export const methodLabel = (lang, id) => byId[id]?.label(lang) || id;
