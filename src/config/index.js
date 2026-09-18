// ============================================================
//  Environment configuration — the ONLY place that reads process.env
//
//  Everything else imports `cfg` from here. Validation happens once
//  at boot so a missing variable fails fast with a clear message
//  instead of a cryptic error hours later.
// ============================================================
import 'dotenv/config';

const missing = [];
const need = (name) => {
  const v = process.env[name];
  if (!v) missing.push(name);
  return v || '';
};
const opt  = (name, fallback = '') => process.env[name] || fallback;
const list = (name) => String(opt(name)).split(',').map((s) => s.trim()).filter(Boolean);

export const cfg = {
  env: opt('NODE_ENV', 'production'),
  port: Number(opt('PORT', 3000)),

  bot: {
    token:      need('BOT_TOKEN'),
    adminIds:   list('ADMIN_IDS').map(Number),
    webhookUrl: opt('WEBHOOK_URL').replace(/\/+$/, '') || null,   // strip trailing slash
    secret:     opt('WEBHOOK_SECRET'),
  },

  gg: {
    baseUrl: opt('GG_BASE_URL', 'https://ggsoma.store/api/partner/v1'),
    apiKey:  need('GG_API_KEY'),
  },

  db: {
    url: need('SUPABASE_URL'),
    key: need('SUPABASE_SERVICE_KEY'),
  },

  cryptomus: {
    merchant:   opt('CRYPTOMUS_MERCHANT_ID'),
    apiKey:     opt('CRYPTOMUS_API_KEY'),
    paymentKey: opt('CRYPTOMUS_PAYMENT_KEY') || opt('CRYPTOMUS_API_KEY'),
  },

  nowpayments: {
    apiKey:    opt('NOWPAYMENTS_API_KEY'),
    ipnSecret: opt('NOWPAYMENTS_IPN_SECRET'),
  },

  binance: {
    // Personal account API key — "Enable Reading" permission ONLY.
    // Used to auto-verify Binance Pay transfers (GET /sapi/v1/pay/transactions).
    // Leave empty to keep the manual admin-approval flow.
    apiKey:    opt('BINANCE_API_KEY'),
    secretKey: opt('BINANCE_SECRET_KEY'),
  },

  log: {
    level: opt('LOG_LEVEL', 'info'),   // debug | info | warn | error
  },
};

// ---------- validation ----------
if (missing.length) {
  console.error('✖ Missing required environment variables:\n  - ' + missing.join('\n  - '));
  console.error('\nCopy .env.example to .env and fill them in.');
  process.exit(1);
}

if (!cfg.bot.adminIds.length) {
  console.error('✖ ADMIN_IDS is empty — nobody would be able to open the admin panel.');
  process.exit(1);
}

// A weak webhook secret means anyone who guesses the URL can push fake
// Telegram updates or fake payment callbacks. Refuse to start.
if (cfg.bot.webhookUrl && (!cfg.bot.secret || cfg.bot.secret.length < 16 || cfg.bot.secret === 'change-me')) {
  console.error('✖ WEBHOOK_SECRET must be a random string of at least 16 characters when WEBHOOK_URL is set.');
  process.exit(1);
}
if (!cfg.bot.secret) cfg.bot.secret = 'local-dev-only-' + Math.random().toString(36).slice(2);

export const isAdmin = (id) => cfg.bot.adminIds.includes(Number(id));
