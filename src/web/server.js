// ============================================================
//  HTTP server: health, Telegram webhook, payment webhooks
//
//  Security:
//    · Telegram webhook path contains the secret AND we verify the
//      X-Telegram-Bot-Api-Secret-Token header Telegram sends.
//    · Payment webhook paths contain the secret; each gateway verifies
//      its own signature inside onWebhook().
// ============================================================
import express from 'express';
import { webhookCallback } from 'grammy';
import { cfg } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { GATEWAYS } from '../payments/index.js';
import { isHealthy } from '../core/health.js';

const log = logger('web');

export function createServer({ bot, notifyAdmin }) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/', (_, res) => res.type('text').send('ok'));
  app.get('/health', (_, res) => res.json({ ok: true, ggsoma: isHealthy(), ts: Date.now() }));

  // ---------- payment webhooks: /hooks/<gateway>/<secret> ----------
  const hooks = express.Router();
  for (const gw of GATEWAYS) {
    if (typeof gw.onWebhook !== 'function') continue;
    const path = `/${gw.id.toLowerCase()}/${cfg.bot.secret}`;
    hooks.post(path, express.json({ limit: '256kb' }), async (req, res) => {
      res.status(200).json({ ok: true });   // ack fast; providers retry on delay
      try {
        const r = await gw.onWebhook(req.body || {}, { bot, notifyAdmin });
        if (!r?.ok) log.warn(`${gw.id} webhook rejected`, { reason: r?.reason });
      } catch (e) { log.error(`${gw.id} webhook error`, e); }
    });
    log.info('webhook mounted', { gateway: gw.id, path: `/hooks/${gw.id.toLowerCase()}/***` });
  }
  app.use('/hooks', hooks);

  // ---------- Telegram webhook ----------
  if (cfg.bot.webhookUrl) {
    app.post(`/tg/${cfg.bot.secret}`, express.json({ limit: '1mb' }),
      webhookCallback(bot, 'express', { secretToken: cfg.bot.secret }));
  }

  app.use((_, res) => res.status(404).type('text').send('not found'));
  return app;
}

export const telegramWebhookUrl = () => `${cfg.bot.webhookUrl}/tg/${cfg.bot.secret}`;
