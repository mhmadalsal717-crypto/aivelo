// ============================================================
//  Structured logger — tag + level + timestamp
//
//  Usage:  const log = logger('sync');  log.info('done', { added: 3 });
//  Output: 2026-09-16T10:00:00.000Z INFO  [sync] done {"added":3}
//
//  Never log secrets or delivery content (READY_ACCOUNT credentials).
// ============================================================
import { cfg } from '../config/index.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[cfg.log.level] ?? LEVELS.info;

function emit(level, tag, msg, meta) {
  if (LEVELS[level] < threshold) return;
  const ts = new Date().toISOString();
  const extra = meta === undefined ? '' : ' ' + safeJson(meta);
  const line = `${ts} ${level.toUpperCase().padEnd(5)} [${tag}] ${msg}${extra}`;
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

function safeJson(v) {
  try {
    if (v instanceof Error) return JSON.stringify({ error: v.message, code: v.code });
    return JSON.stringify(v);
  } catch { return String(v); }
}

export const logger = (tag) => ({
  debug: (m, meta) => emit('debug', tag, m, meta),
  info:  (m, meta) => emit('info',  tag, m, meta),
  warn:  (m, meta) => emit('warn',  tag, m, meta),
  error: (m, meta) => emit('error', tag, m, meta),
});
