// ============================================================
//  Entry point
//    1. load settings           4. set webhook / start polling
//    2. create HTTP server      5. configure bot profile
//    3. listen                  6. start background jobs
// ============================================================
import { cfg } from './config/index.js';
import { logger } from './lib/logger.js';
import { loadAll } from './lib/settings.js';
import { bot, notifyAdmin, sendResult, setupBotUI } from './bot/index.js';
import { createServer, telegramWebhookUrl } from './web/server.js';
import { startJobs } from './jobs/scheduler.js';

const log = logger('app');
const ALLOWED = ['message', 'callback_query', 'pre_checkout_query'];

async function main() {
  await loadAll(true);
  log.info('settings loaded');

  const app = createServer({ bot, notifyAdmin });

  // Open the port BEFORE telling Telegram to send — otherwise the first
  // update hits a closed port and is lost.
  await new Promise((resolve) => app.listen(cfg.port, () => { log.info('listening', { port: cfg.port }); resolve(); }));

  await bot.init();
  if (cfg.bot.webhookUrl) {
    await bot.api.setWebhook(telegramWebhookUrl(), {
      drop_pending_updates: true, allowed_updates: ALLOWED, secret_token: cfg.bot.secret,
    });
    log.info('webhook set', { url: cfg.bot.webhookUrl + '/tg/***' });
  } else {
    await bot.api.deleteWebhook({ drop_pending_updates: true }).catch(() => {});
    bot.start({ allowed_updates: ALLOWED, onStart: () => log.info('long polling') });
  }

  await setupBotUI();
  startJobs({ bot, notifyAdmin, notifyUser: sendResult });
  log.info(`✔ ${bot.botInfo.username} is up`);
}

// ---------- graceful shutdown ----------
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.once(sig, async () => {
    log.info('shutting down', { sig });
    try { await bot.stop(); } catch {}
    process.exit(0);
  });
}
process.on('unhandledRejection', (e) => log.error('unhandledRejection', e));

main().catch((e) => { log.error('fatal', e); process.exit(1); });
