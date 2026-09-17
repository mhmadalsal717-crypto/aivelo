// ============================================================
//  Formatting helpers (locale-aware where it matters)
// ============================================================

/** Escape text for Telegram parse_mode: 'HTML' */
export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const money = (n) => `${Number(n || 0).toFixed(2)}$`;
export const RULE  = '━━━━━━━━━━━━━━━';

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Expandable quote block (collapsed by default in Telegram) */
export const quote = (title, body) =>
  `<blockquote expandable><b>${title}</b>\n${body}</blockquote>`;

/** Text progress bar */
export function bar(pct, len = 12) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const f = Math.round((p / 100) * len);
  return '█'.repeat(f) + '░'.repeat(len - f);
}

export const trim = (s, n = 24) => {
  const v = String(s || '');
  return v.length > n ? v.slice(0, n - 1) + '…' : v;
};

const LOCALE = { ar: 'ar-EG', en: 'en-GB' };
export const fmtDate = (d, lang = 'ar') => new Date(d).toLocaleDateString(LOCALE[lang] || 'en-GB');
export const fmtTime = (d, lang = 'ar') => new Date(d).toLocaleString(LOCALE[lang] || 'en-GB');

export const statusIcon = (s) =>
  ({ COMPLETED: '✅', PENDING: '⏳', FAILED: '❌', REFUNDED: '↩️', NEEDS_REVIEW: '🔴',
     APPROVED: '✅', REJECTED: '❌', PAID: '✅', EXPIRED: '⌛', CANCELLED: '🚫' }[s] || '•');

/** Parse a user-typed number ("12,5" → 12.5). Returns null if invalid. */
export const parseNum = (s) => {
  const clean = String(s ?? '').trim().replace(',', '.').replace(/[^\d.\-]/g, '');
  if (!clean || !/\d/.test(clean)) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

/** "-" or "—" means "clear this value" in admin inputs */
export const isClear = (s) => ['-', '—', 'none', 'null'].includes(String(s ?? '').trim().toLowerCase());

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
