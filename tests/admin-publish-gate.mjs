import test from 'node:test';
import assert from 'node:assert/strict';
import { canPublishReviewedDraft, publishReviewedDraft } from '../src/lib/admin-publish-gate.mjs';

const saved = {
  role: 'admin', kind: 'event', id: 'event-1', expectedRevision: 7,
  draft: { kind: 'event', id: 'event-1', revision: 7, payload: { id: 'event-1', title: 'Library meeting', sourceUrl: 'https://example.test/event' } },
};
const text = payload => JSON.stringify(payload, null, 2);

test('an unchanged saved payload and matching composite identity can be published', () => {
  assert.equal(canPublishReviewedDraft({ ...saved, payloadText: text(saved.draft.payload) }), true);
});

test('edit-after-load and edit-after-save cannot publish the displayed unsaved payload', async () => {
  const publishCalls = [];
  const mockPublish = async (...args) => { publishCalls.push(args); };
  // First state is the unchanged server row loaded into the editor, then edited locally.
  await publishReviewedDraft({ ...saved, payloadText: text({ ...saved.draft.payload, title: 'Unsaved title' }) }, mockPublish);
  // Saving a new value moves the immutable baseline; another edit after save is still dirty.
  const afterSave = { ...saved, expectedRevision: 8, draft: { ...saved.draft, revision: 8, payload: { ...saved.draft.payload, title: 'Reviewed title' } } };
  await publishReviewedDraft({ ...afterSave, payloadText: text({ ...afterSave.draft.payload, title: 'Later unsaved edit' }) }, mockPublish);
  await publishReviewedDraft({ ...saved, payloadText: '{"id":"event-1","title":"not valid json"' }, mockPublish);
  assert.deepEqual(publishCalls, []);
});

test('conflicts, mismatched kind/id/revision, and in-flight state reject publication', () => {
  const payloadText = text(saved.draft.payload);
  assert.equal(canPublishReviewedDraft({ ...saved, payloadText, conflicted: true }), false);
  assert.equal(canPublishReviewedDraft({ ...saved, role: 'editor', payloadText }), false);
  assert.equal(canPublishReviewedDraft({ ...saved, id: 'event-2', payloadText }), false);
  assert.equal(canPublishReviewedDraft({ ...saved, kind: 'calendar', payloadText }), false);
  assert.equal(canPublishReviewedDraft({ ...saved, expectedRevision: 8, payloadText }), false);
  assert.equal(canPublishReviewedDraft({ ...saved, payloadText, busy: true }), false);
  assert.equal(canPublishReviewedDraft({ ...saved, payloadText, alreadyPublished: true }), false);
});

test('JSON object key order does not make the reviewed payload dirty', () => {
  assert.equal(canPublishReviewedDraft({ ...saved, payloadText: '{"sourceUrl":"https://example.test/event","title":"Library meeting","id":"event-1"}' }), true);
});

test('the guarded publish invokes only the saved composite identity and revision', async () => {
  const calls = [];
  const invoked = await publishReviewedDraft({ ...saved, payloadText: text(saved.draft.payload) }, async (...args) => calls.push(args));
  assert.equal(invoked, true);
  assert.deepEqual(calls, [['event', 'event-1', 7]]);
});
