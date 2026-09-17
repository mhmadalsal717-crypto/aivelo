// ============================================================
//  Notifications: stock alerts + generic broadcast
//
//  Stock alerts are localized PER RECIPIENT (users are grouped by
//  language so we render each text once per language).
// ============================================================
import { db, rows, q, one } from '../lib/db.js';
import { esc, sleep } from '../lib/fmt.js';
import { Sbool, Snum } from '../lib/settings.js';
import { kb } from '../bot/ui/kb.js';
import { to } from '../bot/ui/nav.js';
import { t, LANGS, defaultLang } from '../i18n/index.js';
import { logger } from '../lib/logger.js';

const log = logger('notify');

/** Recipients grouped by language: { ar: [ids], en: [ids] } */
async function targetsByLang() {
  const users = await rows(db.from('users').select('tg_id, lang')
    .eq('banned', false).eq('notify_stock', true), 'notify.targets');
  const out = Object.fromEntries(LANGS.map((l) => [l, []]));
  for (const u of users) (out[u.lang] || out[defaultLang()]).push(u.tg_id);
  return out;
}

/**
 * Send one message to many users, ~25/sec, disabling alerts for
 * users who blocked the bot.
 */
export async function broadcast(api, text, ids, extra = {}) {
  let sent = 0, failed = 0;
  for (const id of ids) {
    try {
      await api.sendMessage(id, text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });
      sent++;
    } catch (e) {
      failed++;
      if (/blocked|deactivated|chat not found/i.test(e.description || '')) {
        db.from('users').update({ notify_stock: false }).eq('tg_id', id).then(() => {}, () => {});
      }
    }
    if ((sent + failed) % 25 === 0) await sleep(1100);
  }
  return { sent, failed };
}

export function stockAlertText(lang, product, alert) {
  const emo = product.emoji || '📦';
  const head = alert.kind === 'NEW' ? t(lang, 'stock.newHead') : t(lang, 'stock.restockHead');
  return [
    `<blockquote>${emo} ${head}</blockquote>`, '',
    t(lang, 'stock.added', { n: alert.delta }),
    t(lang, 'stock.now', { n: alert.stock_now }), '',
    t(lang, 'stock.hurry'), '',
    `<blockquote>${emo} ${esc(product.name)}</blockquote>`,
  ].join('\n');
}

/** Process the stock alert queue (called by the scheduler) */
export async function flushStockAlerts(api) {
  const queued = await rows(db.from('stock_alerts').select('*').eq('status', 'QUEUED')
    .order('created_at').limit(Snum('max_stock_alerts', 3)), 'notify.queue');
  if (!queued.length) return { alerts: 0, sent: 0 };

  const groups = await targetsByLang();
  let totalSent = 0, alerts = 0;

  for (const a of queued) {
    const p = await one(db.from('products')
      .select('slug, name, emoji, custom_emoji_id, visible, in_stock, paused').eq('slug', a.slug).maybeSingle(), 'notify.product');
    const allowed = a.kind === 'NEW' ? Sbool('notify_new', true) : Sbool('notify_restock', true);

    if (!p || !p.visible || !p.in_stock || p.paused || !allowed) {
      await q(db.from('stock_alerts').update({ status: 'SKIPPED' }).eq('id', a.id), 'notify.skip');
      continue;
    }

    let sent = 0, failed = 0;
    for (const lang of LANGS) {
      const ids = groups[lang];
      if (!ids?.length) continue;
      const markup = kb().add({
        text: `${p.emoji || ''} ${t(lang, 'stock.buyNow')}`.trim(),
        data: to('item', p.slug), style: 'primary', icon: p.custom_emoji_id || undefined,
      }).build();
      const r = await broadcast(api, stockAlertText(lang, p, a), ids, { reply_markup: markup });
      sent += r.sent; failed += r.failed;
    }

    await q(db.from('stock_alerts').update({ status: 'SENT', sent, failed }).eq('id', a.id), 'notify.sent');
    totalSent += sent; alerts++;
    log.info('stock alert sent', { slug: p.slug, sent, failed });
    await sleep(4000);
  }
  return { alerts, sent: totalSent };
}
