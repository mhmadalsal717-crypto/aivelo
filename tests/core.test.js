
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTgHtml, clip } from '../src/lib/html.js';
import { t, dictKeys } from '../src/i18n/index.js';
import { verifyWebhook } from '../src/payments/gateways/cryptomus.js';
import { parseNum, isClear, round2 } from '../src/lib/fmt.js';

test('html sanitizer strips unsupported tags and balances', () => {
  const out = sanitizeTgHtml('<div><b>Hi</b><ul><li>a</li></ul><script>x</script><i>open', 'HTML');
  assert.ok(!out.includes('<div'));
  assert.ok(!out.includes('script'));
  assert.ok(out.endsWith('</i>'));
});

test('clip never cuts inside a tag', () => {
  const s = '<b>' + 'x'.repeat(50) + '</b>';
  const c = clip(s, 20);
  assert.ok(c.endsWith('</b>…') || c.endsWith('…'));
});

test('i18n fallback and vars', () => {
  assert.equal(t('en', 'btn.back'), '« Back');
  assert.equal(t('ar', 'item.low', { n: 3 }), '🟡 متبقّي 3 فقط');
  assert.equal(t('en', 'nonexistent.key'), 'nonexistent.key');
  assert.deepEqual(dictKeys('ar').sort(), dictKeys('en').sort());
});

test('cryptomus signature rejects tampered payload', () => {
  assert.equal(verifyWebhook({ order_id: 'x', status: 'paid', sign: 'deadbeef' }), false);
  assert.equal(verifyWebhook(null), false);
});

test('fmt helpers', () => {
  assert.equal(parseNum('12,5'), 12.5);
  assert.equal(parseNum('abc'), null);
  assert.equal(isClear('-'), true);
  assert.equal(round2(1.2345), 1.23);
});
