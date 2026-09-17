// ============================================================
//  Persistent reply keyboard (main menu) — per language
//
//  Reply-keyboard buttons send plain text, not callbacks. MENU maps
//  every translation of every button to its screen so a user whose
//  keyboard is still in the old language keeps working.
// ============================================================
import { Keyboard } from 'grammy';
import { isAdmin } from '../../config/index.js';
import { t, LANGS } from '../../i18n/index.js';

const ITEMS = [
  ['menu.products', 'providers'],
  ['menu.profile',  'profile'],
  ['menu.invites',  'invites'],
  ['menu.voucher',  'voucher'],
  ['menu.topup',    'topup'],
  ['menu.help',     'help'],
  ['menu.policy',   'policy'],
  ['menu.lang',     'lang'],
  ['menu.admin',    'admin'],
];

/** button text (any language) → screen name */
export const MENU = {};
for (const [key, screenName] of ITEMS) for (const lang of LANGS) MENU[t(lang, key)] = screenName;

export function mainMenu(tgId, lang = 'ar') {
  const k = new Keyboard();
  k.add({ text: t(lang, 'menu.products'), style: 'success' }).row()
   .text(t(lang, 'menu.profile')).text(t(lang, 'menu.topup')).row()
   .text(t(lang, 'menu.invites')).text(t(lang, 'menu.voucher')).row()
   .text(t(lang, 'menu.help')).text(t(lang, 'menu.policy')).row()
   .text(t(lang, 'menu.lang'));
  if (isAdmin(tgId)) k.text(t(lang, 'menu.admin'));
  k.row();
  return k.resized().persistent();
}
