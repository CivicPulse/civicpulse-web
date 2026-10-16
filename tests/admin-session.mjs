import test from 'node:test';
import assert from 'node:assert/strict';
import { deferredAuthRefresh, changesEditorSession } from '../src/lib/admin-session.mjs';

test('auth callback finishes before any lock-acquiring membership work', async () => {
  const queue = []; const calls = []; let insideCallback = true;
  const callback = deferredAuthRefresh(async session => {
    assert.equal(insideCallback, false);
    calls.push(session.user.id);
  }, work => queue.push(work));
  assert.equal(callback('TOKEN_REFRESHED', { user: { id: 'staff-1' } }), undefined);
  assert.deepEqual(calls, []);
  insideCallback = false;
  queue.shift()();
  assert.deepEqual(calls, ['staff-1']);
});

test('same-user refresh preserves the editor; signout and identity replacement invalidate it', () => {
  assert.equal(changesEditorSession('staff-1', 'staff-1'), false);
  assert.equal(changesEditorSession('staff-1', null), true);
  assert.equal(changesEditorSession('staff-1', 'staff-2'), true);
  assert.equal(changesEditorSession(null, 'staff-1'), true);
});
