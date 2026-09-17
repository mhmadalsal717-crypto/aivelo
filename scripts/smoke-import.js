// Import every module with fake env to catch syntax/import errors without touching the network.
process.env.BOT_TOKEN ||= '1:x';
process.env.ADMIN_IDS ||= '1';
process.env.GG_API_KEY ||= 'x';
process.env.SUPABASE_URL ||= 'https://x.supabase.co';
process.env.SUPABASE_SERVICE_KEY ||= 'x';
process.env.WEBHOOK_SECRET ||= 'smoke-test-secret-0123456789';

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js') && f !== 'app.js' && !f.startsWith('_template')) files.push(p);
  }
})('src');

let failed = 0;
for (const f of files) {
  try { await import('../' + f); }
  catch (e) { failed++; console.error(`✖ ${f}\n   ${e.message.split('\n')[0]}`); }
}
console.log(failed ? `\n${failed}/${files.length} modules failed` : `✔ ${files.length} modules import cleanly`);
process.exit(failed ? 1 : 0);
