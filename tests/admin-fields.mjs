import test from 'node:test';
import assert from 'node:assert/strict';
import { editPayloadField, editableFieldValue, fieldsByKind, parseEditorPayload } from '../src/lib/admin-fields.mjs';
import { CmsJsonValueError } from '../src/lib/admin-json.mjs';
import { canPublishReviewedDraft } from '../src/lib/admin-publish-gate.mjs';

test('editing one field retains nested unknown metadata, source bytes, geometry and special own keys', () => {
  const text = '{"id":"x","name":"Old","sourceUrl":"https://example.org/a%250A","importProvenance":{"hash":"abc","rows":[1,null,true]},"geojson":{"features":[]},"__proto__":{"keep":true}}';
  for (const kind of ['organization', 'calendar', 'layer', 'map']) {
    const edited = parseEditorPayload(editPayloadField(text, kind, 'name', 'New'));
    assert.deepEqual(edited, { ...JSON.parse(text), name: 'New' });
    assert.equal(Object.hasOwn(edited, '__proto__'), true);
    assert.equal(edited.sourceUrl, 'https://example.org/a%250A');
  }
});

test('date offsets and ordered IDs are not normalized; absent/null/unsupported fields are not coerced', () => {
  const text = '{"id":"x","title":"Title","start":"2026-10-17T12:00:00-04:00","addressPrivate":null,"calendarIds":["z","a"],"extra":7}';
  const changed = editPayloadField(text, 'event', 'title', 'Revised');
  assert.equal(parseEditorPayload(changed).start, '2026-10-17T12:00:00-04:00');
  assert.deepEqual(parseEditorPayload(changed).calendarIds, ['z', 'a']);
  assert.equal(parseEditorPayload(changed).addressPrivate, null);
  assert.throws(() => editPayloadField(changed, 'event', 'addressPrivate', 'false'), /preserve its type/);
  const field = fieldsByKind.event.find(x => x.key === 'addressPrivate');
  assert.deepEqual(editableFieldValue({}, field), { editable: true, value: 'unset' });
  assert.equal(Object.hasOwn(parseEditorPayload(editPayloadField('{"id":"x"}', 'event', 'addressPrivate', 'unset')), 'addressPrivate'), false);
  assert.throws(() => editPayloadField('{bad', 'event', 'title', 'New'));
  assert.throws(() => editPayloadField('{"id":"x","extra":1e1000}', 'event', 'title', 'New'), CmsJsonValueError);
});

test('private flag never silently sanitizes fields, and structured edits require explicit save before publishing', () => {
  const payload = { id: 'x', title: 'Saved', address: 'Synthetic fixture', coordinates: [1, 2] };
  const text = JSON.stringify(payload);
  const privateText = editPayloadField(text, 'event', 'addressPrivate', 'true');
  assert.deepEqual(parseEditorPayload(privateText), { ...payload, addressPrivate: true });
  const state = { role: 'admin', kind: 'event', id: 'x', expectedRevision: 1, draft: { kind: 'event', id: 'x', revision: 1, payload }, payloadText: privateText };
  assert.equal(canPublishReviewedDraft(state), false);
  assert.equal(canPublishReviewedDraft({ ...state, payloadText: text }), true);
});
