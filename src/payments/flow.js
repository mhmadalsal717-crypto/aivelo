// ============================================================
//  Shared payment flow helpers used by gateways and screens
// ============================================================
import { kb } from '../bot/ui/kb.js';
import { to } from '../bot/ui/nav.js';
import { ask } from '../bot/ui/input.js';
import { money } from '../lib/fmt.js';
import { t } from '../i18n/index.js';
import { depositLimits } from './service.js';

/** Standard "enter amount" screen. Input is routed to gateway.onAmount(). */
export async function askAmount(ctx, gw) {
  const { min, max } = depositLimits();
  await ask(ctx.from.id, 'pay_amount', { method: gw.id });
  return {
    text: [
      t(ctx, 'topup.amountTitle'), '',
      t(ctx, 'topup.amountMin', { min }), t(ctx, 'topup.amountMax', { max }), '',
      t(ctx, 'topup.amountHint'),
    ].join('\n'),
    kb: cancelKb(ctx),
  };
}

export const cancelKb = (ctx) =>
  kb().add({ text: t(ctx, 'btn.cancel'), data: to('topup'), style: 'danger' }).build();

export const backKb = (ctx) => kb().text(t(ctx, 'btn.back'), to('topup')).build();

/** Validate amount against deposit limits; replies with error and returns false if invalid */
export async function checkAmount(ctx, amountUsd) {
  const { min, max } = depositLimits();
  if (!(amountUsd >= min && amountUsd <= max)) {
    await ctx.reply(t(ctx, 'topup.amountRange', { min: money(min), max: money(max) }));
    return false;
  }
  return true;
}

/** Message + keyboard sent to the customer after a successful credit */
export const creditedKb = (ctx) =>
  kb().text(t(ctx, 'menu.products'), to('providers')).row()
      .text(t(ctx, 'btn.close'), to('close')).build();
