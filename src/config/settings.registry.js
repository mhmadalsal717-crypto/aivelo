// ============================================================
//  SETTINGS REGISTRY — single source of truth
//
//  Every runtime setting the bot reads is declared here with its
//  default, type, group and bilingual label.
//
//  Used by:
//    · lib/settings.js   → defaults when the DB row is missing
//    · admin panel       → renders groups/labels, knows the type
//    · scripts/gen-seed  → generates sql/03_seed.sql
//    · scripts/check     → fails if code reads an undeclared key
//
//  To add a setting: add ONE line here. Nothing else.
// ============================================================

/** @typedef {'number'|'bool'|'text'} Kind */

/**
 * @type {Record<string, {def:string, kind:Kind, grp:string, ar:string, en:string, hint?:string}>}
 */
export const SETTINGS = {
  // ---------- pricing ----------
  margin_mode:            { def: 'flat',  kind: 'text',   grp: 'pricing', ar: 'وضع الهامش (flat / percent)',        en: 'Margin mode (flat / percent)' },
  markup_pct:             { def: '40',    kind: 'number', grp: 'pricing', ar: 'الهامش العام % (وضع percent)',         en: 'Global markup % (percent mode)' },
  flat_add_default:       { def: '1',     kind: 'number', grp: 'pricing', ar: 'ربح ثابت افتراضي $ (بدون شرائح)',      en: 'Default flat profit $ (no tiers)' },
  round_to:               { def: '0.25',  kind: 'number', grp: 'pricing', ar: 'التقريب لأعلى بمضاعفات',               en: 'Round up to multiples of' },
  min_price:              { def: '0',     kind: 'number', grp: 'pricing', ar: 'أدنى سعر بيع $ (0 = بدون)',            en: 'Minimum sell price $ (0 = none)' },
  margin_after_discount:  { def: 'on',    kind: 'bool',   grp: 'pricing', ar: 'ضمان الهامش بعد خصم المستوى',          en: 'Protect margin after tier discount' },
  min_margin_pct:         { def: '5',     kind: 'number', grp: 'pricing', ar: 'أقل هامش % قبل الإيقاف (percent)',     en: 'Min margin % before pause (percent)' },
  min_margin_usd:         { def: '0.5',   kind: 'number', grp: 'pricing', ar: 'أقل ربح $ قبل الإيقاف (flat)',         en: 'Min profit $ before pause (flat)' },
  auto_pause_on_loss:     { def: 'on',    kind: 'bool',   grp: 'pricing', ar: 'إيقاف البيع تلقائياً عند الخسارة',     en: 'Auto-pause products selling at a loss' },
  price_move_alert_pct:   { def: '10',    kind: 'number', grp: 'pricing', ar: 'نبّهني لو تحرّكت التكلفة %',           en: 'Alert me when cost moves by %' },

  // ---------- referrals ----------
  referral_pct:           { def: '3',     kind: 'number', grp: 'referral', ar: 'عمولة الإحالة % من كل شراء',          en: 'Referral commission % per purchase' },
  ref_per_reward:         { def: '15',    kind: 'number', grp: 'referral', ar: 'دعوات مؤهّلة لكل مكافأة',              en: 'Qualified invites per reward' },
  ref_reward_usd:         { def: '1',     kind: 'number', grp: 'referral', ar: 'قيمة المكافأة $',                      en: 'Reward amount $' },
  ref_daily_cap:          { def: '10',    kind: 'number', grp: 'referral', ar: 'أقصى دعوات صالحة يومياً',              en: 'Max valid invites per day' },
  ref_total_cap:          { def: '100',   kind: 'number', grp: 'referral', ar: 'أقصى دعوات صالحة إجمالاً',             en: 'Max valid invites total' },
  ref_human_check:        { def: 'on',    kind: 'bool',   grp: 'referral', ar: 'تحقق بشري قبل احتساب الدعوة',          en: 'Human check before counting invite' },

  // ---------- payments ----------
  pay_binance:            { def: 'on',    kind: 'bool',   grp: 'payments', ar: 'Binance Pay مفعّل',                    en: 'Binance Pay enabled' },
  pay_cryptomus:          { def: 'on',    kind: 'bool',   grp: 'payments', ar: 'Cryptomus مفعّل',                      en: 'Cryptomus enabled' },
  pay_nowpayments:        { def: 'on',    kind: 'bool',   grp: 'payments', ar: 'NOWPayments مفعّل',                    en: 'NOWPayments enabled' },
  pay_stars:              { def: 'on',    kind: 'bool',   grp: 'payments', ar: 'Telegram Stars مفعّل',                 en: 'Telegram Stars enabled' },
  deposit_min:            { def: '1',     kind: 'number', grp: 'payments', ar: 'أقل مبلغ إيداع $',                     en: 'Min deposit $' },
  deposit_max:            { def: '10000', kind: 'number', grp: 'payments', ar: 'أقصى مبلغ إيداع $',                    en: 'Max deposit $' },
  stars_rate:             { def: '0.009', kind: 'number', grp: 'payments', ar: 'قيمة النجمة بالدولار',                 en: 'USD value of one star' },
  stars_packs:            { def: '50,100,250,500,1000', kind: 'text', grp: 'payments', ar: 'باقات النجوم',           en: 'Star packs' },
  stars_min:              { def: '50',    kind: 'number', grp: 'payments', ar: 'أقل عدد نجوم',                         en: 'Min stars' },
  stars_max:              { def: '100000',kind: 'number', grp: 'payments', ar: 'أقصى عدد نجوم',                        en: 'Max stars' },
  binance_session_min:    { def: '30',    kind: 'number', grp: 'payments', ar: 'مهلة جلسة Binance (دقيقة)',            en: 'Binance session timeout (min)' },
  cryptomus_lifetime_min: { def: '60',    kind: 'number', grp: 'payments', ar: 'مهلة فاتورة Cryptomus (دقيقة)',        en: 'Cryptomus invoice lifetime (min)' },
  nowpayments_lifetime_min: { def: '60', kind: 'number', grp: 'payments', ar: 'مهلة فاتورة NOWPayments (دقيقة)',       en: 'NOWPayments invoice lifetime (min)' },
  min_withdraw:           { def: '5',     kind: 'number', grp: 'payments', ar: 'أقل مبلغ سحب $',                       en: 'Min withdrawal $' },

  // ---------- appearance ----------
  premium_emoji:          { def: 'off',   kind: 'bool',   grp: 'appearance', ar: 'إيموجي بريميوم مفعّل',               en: 'Premium emoji enabled' },
  button_colors:          { def: 'on',    kind: 'bool',   grp: 'appearance', ar: 'ألوان الأزرار',                      en: 'Button colors' },
  show_stock_count:       { def: 'on',    kind: 'bool',   grp: 'appearance', ar: 'إظهار عدد المخزون بالأزرار',         en: 'Show stock count on buttons' },
  products_per_page:      { def: '8',     kind: 'number', grp: 'appearance', ar: 'منتجات لكل صفحة',                    en: 'Products per page' },

  // ---------- notifications ----------
  notify_restock:         { def: 'on',    kind: 'bool',   grp: 'notify', ar: 'إشعار عند إضافة مخزون',                  en: 'Notify on restock' },
  notify_new:             { def: 'on',    kind: 'bool',   grp: 'notify', ar: 'إشعار عند منتج جديد',                    en: 'Notify on new product' },
  min_stock_delta:        { def: '1',     kind: 'number', grp: 'notify', ar: 'أقل زيادة مخزون تستحق إشعار',            en: 'Min stock increase worth an alert' },
  max_stock_alerts:       { def: '3',     kind: 'number', grp: 'notify', ar: 'أقصى إشعارات بالدورة',                   en: 'Max alerts per cycle' },
  alert_cooldown_min:     { def: '90',    kind: 'number', grp: 'notify', ar: 'تهدئة إشعار نفس المنتج (دقيقة)',         en: 'Same-product alert cooldown (min)' },
  low_wallet_alert:       { def: '20',    kind: 'number', grp: 'notify', ar: 'تنبيه رصيد GGSoma تحت $',                en: 'GGSoma wallet low alert under $' },
  daily_report:           { def: 'on',    kind: 'bool',   grp: 'notify', ar: 'تقرير يومي للأدمن',                      en: 'Daily admin report' },

  // ---------- gate (forced join) ----------
  force_join:             { def: 'off',   kind: 'bool',   grp: 'gate', ar: 'إجبار الاشتراك بالقناة/المجموعة',          en: 'Force channel/group join' },
  join_channel_id:        { def: '',      kind: 'text',   grp: 'gate', ar: 'معرّف القناة (-100…)',                     en: 'Channel ID (-100…)' },
  join_channel_url:       { def: '',      kind: 'text',   grp: 'gate', ar: 'رابط القناة',                              en: 'Channel URL' },
  join_group_id:          { def: '',      kind: 'text',   grp: 'gate', ar: 'معرّف المجموعة (-100…)',                   en: 'Group ID (-100…)' },
  join_group_url:         { def: '',      kind: 'text',   grp: 'gate', ar: 'رابط المجموعة',                            en: 'Group URL' },

  // ---------- system ----------
  maintenance:            { def: 'off',   kind: 'bool',   grp: 'system', ar: 'وضع الصيانة',                            en: 'Maintenance mode' },
  support_user:           { def: '',      kind: 'text',   grp: 'system', ar: 'يوزر الدعم (بدون @)',                    en: 'Support username (without @)' },
  default_lang:           { def: 'ar',    kind: 'text',   grp: 'system', ar: 'اللغة الافتراضية (ar / en)',             en: 'Default language (ar / en)' },
  sync_minutes:           { def: '10',    kind: 'number', grp: 'system', ar: 'مزامنة الكتالوج كل (دقيقة)',             en: 'Catalog sync every (min)' },
  details_per_sync:       { def: '15',    kind: 'number', grp: 'system', ar: 'منتجات تُسحب تفاصيلها كل مزامنة',        en: 'Product details pulled per sync' },
  details_refresh_hrs:    { def: '12',    kind: 'number', grp: 'system', ar: 'تجديد التفاصيل كل (ساعة)',               en: 'Refresh details every (hours)' },
  health_check_min:       { def: '5',     kind: 'number', grp: 'system', ar: 'فحص صحة GGSoma كل (دقيقة)',              en: 'GGSoma health check every (min)' },
  recon_max_attempts:     { def: '6',     kind: 'number', grp: 'system', ar: 'محاولات المُصالح قبل المراجعة اليدوية', en: 'Reconciler attempts before manual review' },
};

/** Group metadata — order + bilingual title + icon */
export const SETTING_GROUPS = [
  { key: 'pricing',    icon: '💵', ar: 'التسعير',      en: 'Pricing' },
  { key: 'payments',   icon: '💳', ar: 'الدفع',        en: 'Payments' },
  { key: 'referral',   icon: '🎁', ar: 'الإحالات',     en: 'Referrals' },
  { key: 'notify',     icon: '🔔', ar: 'الإشعارات',    en: 'Notifications' },
  { key: 'appearance', icon: '🎨', ar: 'المظهر',       en: 'Appearance' },
  { key: 'gate',       icon: '🚪', ar: 'بوابة الدخول', en: 'Join gate' },
  { key: 'system',     icon: '⚙️', ar: 'النظام',       en: 'System' },
];

/**
 * Long editable texts (welcome, policy, help…). Stored in `texts` table
 * with key suffix per language: welcome_ar / welcome_en.
 */
export const TEXTS = {
  welcome:         { ar: 'رسالة الترحيب',        en: 'Welcome message' },
  policy:          { ar: 'سياسة البوت',           en: 'Bot policy' },
  help:            { ar: 'نص المساعدة',           en: 'Help text' },
  binance_pay_id:  { ar: 'معرّف Binance Pay',     en: 'Binance Pay ID', single: true },
};

/** UI emoji slots (fallback + optional premium custom id) */
export const EMOJI = {
  shop: '🛒', profile: '👤', balance: '💰', gift: '🎁', card: '💳', money: '💵',
  help: '❓', policy: '📜', box: '📦', clock: '⏳', shield: '🛡', check: '✅',
  cross: '❌', star: '⭐️', receipt: '🧾', admin: '⚙️', bell: '🔔', lang: '🌐',
};
