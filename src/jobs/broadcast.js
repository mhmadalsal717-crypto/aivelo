// ============================================================
//  Broadcast queue
//
//  v1 sent all messages inside the Telegram update handler, which
//  blocked for minutes on large user bases and caused Telegram to
//  redeliver the update (→ duplicate broadcasts). Now: enqueue a row,
//  a background job drains it in batches and reports to the admin.
// ============================================================
import { db, q, rows, one } from '../lib/db.js';
import { broadcast } from '../core/notify.js';
import { t } from '../i18n/index.js';
import { logger } from '../lib/logger.js';

const log = logger('broadcast');

export async function enqueueBroadcast({ text, createdBy, target = 'all' }) {
  const { count } = await q(db.from('users').select('id', { count: 'exact', head: true }).eq('banned', false), 'bc.count');
  await q(db.from('broadcasts').insert({ text, created_by: createdBy, target, total: count ?? 0 }), 'bc.enqueue');
  return count ?? 0;
}

let running = false;

export async function processBroadcasts(api, notifyAdmin) {
  if (running) return;
  running = true;
  try {
    const job = await one(db.from('broadcasts').select('*').eq('status', 'QUEUED').order('created_at').limit(1).maybeSingle(), 'bc.next');
    if (!job) return;
    await q(db.from('broadcasts').update({ status: 'RUNNING', started_at: new Date().toISOString() }).eq('id', job.id), 'bc.start');

    const users = await rows(db.from('users').select('tg_id').eq('banned', false), 'bc.users');
    const r = await broadcast(api, job.text, users.map((u) => u.tg_id));

    await q(db.from('broadcasts').update({ status: 'DONE', sent: r.sent, failed: r.failed, finished_at: new Date().toISOString() }).eq('id', job.id), 'bc.done');
    log.info('broadcast done', { id: job.id, ...r });
    notifyAdmin?.(t('ar', 'admin.bcDone', r), undefined, job.created_by);
  } catch (e) {
    log.error('broadcast failed', e);
  } finally { running = false; }
}
