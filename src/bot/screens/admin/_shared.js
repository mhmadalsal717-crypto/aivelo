// ============================================================
//  Admin shared helpers: guard, denied view, common keyboards
//  Every admin screen: `const a = adminScreen('name', async (ctx, args) => …)`
// ============================================================
import { isAdmin } from '../../../config/index.js';
import { screen, to } from '../../ui/nav.js';
import { kb } from '../../ui/kb.js';
import { t } from '../../../i18n/index.js';

const denied = (ctx) => ({ text: t(ctx, 'sys.denied'), kb: kb().text(t(ctx, 'btn.home'), to('home')).build() });

/** screen() wrapper that enforces admin */
export const adminScreen = (name, fn) =>
  screen(name, async (ctx, args) => (isAdmin(ctx.from.id) ? fn(ctx, args) : denied(ctx)));

export const backTo = (ctx, name, ...args) => kb().text(t(ctx, 'btn.back'), to(name, ...args)).build();

export const onOff = (ctx, v) => t(ctx, v ? 'sys.on' : 'sys.off');

export const badge = (n) => (n ? ` (${n})` : '');
