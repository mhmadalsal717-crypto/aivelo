// ============================================================
//  GATEWAY TEMPLATE — copy this file to add a new payment method
//
//  Steps:
//    1. cp _template.js mygateway.js
//    2. Fill in the methods below
//    3. Add `pay_mygateway` to config/settings.registry.js (bool, grp payments)
//    4. Add texts under `pay.mygateway.*` in i18n/locales/{ar,en}.js
//    5. Import + add to GATEWAYS in payments/index.js
//    6. (webhook gateways) add a route in web/webhooks.js calling onWebhook()
//
//  Two shapes exist:
//    · MANUAL   — customer transfers, pastes a reference, admin approves
//                 (Binance Pay, USDT TRC20, bank transfer, Vodafone Cash…)
//    · AUTOMATIC — provider calls our webhook / Telegram confirms
//                 (Cryptomus, Stars, NowPayments, Paymob…)
// ============================================================
import { Sbool } from '../../lib/settings.js';
import { t } from '../../i18n/index.js';

export default {
  /** Unique id — also the `payments.method` value in DB. UPPER_SNAKE. */
  id: 'MY_GATEWAY',

  /** Emoji shown on buttons */
  icon: '💠',

  /** Inline-button color on the top-up screen: 'success' green · 'primary' blue · 'danger' red */
  style: 'success',

  /** true → admin must approve each payment (shows in admin review list) */
  manualReview: false,

  /** Localized name / button */
  label: (lang) => t(lang, 'pay.mygateway.name'),
  button: (lang) => `${'💠'} ${t(lang, 'pay.mygateway.btn')}`,

  /** Admin toggle from settings */
  isEnabled: () => Sbool('pay_mygateway', true),

  /** Are credentials / ids present? (env vars or texts table) */
  isConfigured: () => true,

  /**
   * Called when the customer picks this gateway on the top-up screen.
   * Return a screen view { text, kb } or ask for input via `ask()`.
   * For amount-based gateways use the shared helper:
   *   return askAmount(ctx, this)   // from ../flow.js
   */
  async start(ctx) { throw new Error('not implemented'); },

  /**
   * Called after the customer entered an amount (if you used askAmount).
   * Create the payment intent with openPayment() and show instructions.
   */
  async onAmount(ctx, amountUsd, { notifyAdmin }) { throw new Error('not implemented'); },

  /**
   * MANUAL gateways: called when the customer pastes a reference/TxID.
   * Validate, dedupe, then notifyAdmin with approve/reject buttons.
   */
  async onReference(ctx, orderId, text, { notifyAdmin }) {},

  /**
   * AUTOMATIC gateways: called by web/webhooks.js with the raw body.
   * Verify signature, find payment by order_id, call creditPayment().
   * Return { ok:true } or { ok:false, reason }.
   */
  async onWebhook(body, { bot, notifyAdmin }) { return { ok: false, reason: 'not implemented' }; },
};
