// ============================================================
//  Render delivery content — shared by purchase result, reconciler
//  notifications and order history. Localized.
// ============================================================
import { esc, RULE } from '../../lib/fmt.js';
import { E } from '../../lib/settings.js';
import { t } from '../../i18n/index.js';

export function renderDelivery(lang, d) {
  if (!d) return '';
  if (d.lines?.length) {
    return d.lines.map((l, i) => `${i + 1}. <code>${esc(l.code || l.link || l.content || '')}</code>`).join('\n');
  }
  const notes = d.instructions ? `\n\n${t(lang, 'delivery.notes', { text: esc(d.instructions) })}` : '';
  if (d.link)    return `${t(lang, 'delivery.link')}\n<code>${esc(d.link)}</code>${notes}`;
  if (d.code)    return `${t(lang, 'delivery.code')}\n<code>${esc(d.code)}</code>${notes}`;
  if (d.content) return `${t(lang, 'delivery.account')}\n<code>${esc(d.content)}</code>\n\n${t(lang, 'delivery.warnAcc')}`;
  return '';
}

/** Full purchase result message */
export function renderResult(lang, r) {
  if (r.state === 'DELIVERED') {
    return `${t(lang, 'order.done')}\n${RULE}\n` +
           t(lang, 'delivery.orderRef', { emoji: E('receipt'), code: esc(r.order?.orderCode || r.ext || '') }) + '\n\n' +
           renderDelivery(lang, r.delivery);
  }
  if (r.state === 'PENDING') return t(lang, 'order.pending', { rule: RULE });
  return t(lang, 'order.failed', { rule: RULE, reason: esc(r.message || '') });
}

export const deliveryLabel = (lang, type) =>
  ({ LINK: t(lang, 'deliv.link'), COUPON: t(lang, 'deliv.coupon'), READY_ACCOUNT: t(lang, 'deliv.account') }[type] || type || '—');
