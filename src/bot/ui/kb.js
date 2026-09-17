// ============================================================
//  Inline keyboard builder
//  style: 'success' green · 'danger' red · 'primary' blue (Bot API 9.4)
//  icon:  icon_custom_emoji_id (premium)
// ============================================================
import { Sbool } from '../../lib/settings.js';
import { logger } from '../../lib/logger.js';
import { t } from '../../i18n/index.js';

const log = logger('kb');

export class KB {
  constructor() { this.rows = []; this.cur = []; }

  /** @param {{text, data?, url?, style?, icon?, switchInline?}} b */
  add(b) {
    const btn = { text: String(b.text) };
    if (b.data) {
      if (Buffer.byteLength(b.data, 'utf8') > 64) log.error('callback_data > 64 bytes (button will be dead)', { data: b.data });
      btn.callback_data = b.data;
    }
    if (b.url) btn.url = b.url;
    if (b.switchInline !== undefined) btn.switch_inline_query_current_chat = b.switchInline;
    if (b.style && Sbool('button_colors', true)) btn.style = b.style;
    if (b.icon && Sbool('premium_emoji', false)) btn.icon_custom_emoji_id = b.icon;
    this.cur.push(btn);
    return this;
  }

  text(text, data, style) { return this.add({ text, data, style }); }
  url(text, url)          { return this.add({ text, url }); }

  row() { if (this.cur.length) { this.rows.push(this.cur); this.cur = []; } return this; }

  /** Grid of N columns */
  grid(items, { cols = 2, label, data, style, icon } = {}) {
    items.forEach((it, i) => {
      this.add({ text: label(it), data: data(it), style: style?.(it), icon: icon?.(it) });
      if ((i + 1) % cols === 0) this.row();
    });
    return this.row();
  }

  /** Pagination row */
  pager({ page, totalPages, make, lang = 'ar' }) {
    if (totalPages <= 1) return this;
    this.row();
    if (page > 1) this.add({ text: t(lang, 'btn.prev'), data: make(page - 1) });
    this.add({ text: `${page}/${totalPages}`, data: 'noop' });
    if (page < totalPages) this.add({ text: t(lang, 'btn.next'), data: make(page + 1) });
    return this.row();
  }

  /** Convenience: back button row */
  back(lang, data) { return this.text(t(lang, 'btn.back'), data).row(); }

  get isEmpty() { return !this.rows.length && !this.cur.length; }

  build() { this.row(); return { inline_keyboard: this.rows }; }
}

export const kb = () => new KB();

/** Product button color by stock */
export const stockStyle = (p) => (p.in_stock ? 'success' : 'danger');
