import test from 'node:test';
import assert from 'node:assert/strict';
import { CmsOutcomeUnknown, withCmsDeadline } from '../src/lib/admin-request.mjs';

test('success/error clear deadline without retrying the mutation', async () => {
  let calls = 0; let clears = 0;
  const timers = { setTimeout: () => 1, clearTimeout: () => clears++ };
  assert.equal(await withCmsDeadline((calls++, Promise.resolve(7)), 20, timers), 7);
  await assert.rejects(withCmsDeadline((calls++, Promise.reject(new Error('40001'))), 20, timers), /40001/);
  assert.equal(calls, 2);
  assert.equal(clears, 2);
});

test('late success after deadline remains unknown and never retries', async () => {
  let fire; let finish; let calls = 0;
  const request = new Promise(resolve => { calls++; finish = resolve; });
  const outcome = withCmsDeadline(request, 20, { setTimeout: callback => { fire = callback; }, clearTimeout() {} });
  fire();
  await assert.rejects(outcome, CmsOutcomeUnknown);
  finish(8);
  await Promise.resolve();
  assert.equal(calls, 1);
  await assert.rejects(outcome, CmsOutcomeUnknown);
});
