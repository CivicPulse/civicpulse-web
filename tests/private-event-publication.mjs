import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  assertPublicPrivateEvent,
  isPublicMapEvent,
  PRIVATE_LOCATION,
  publicIcsLocation,
} from '../src/lib/private-event-policy.mjs';
import { assertLocalContentSource, prepareReviewedMobilize, REVIEWED_MOBILIZE_SHA256 } from '../scripts/prepare-public-mobilize.mjs';

const sourcePath = new URL('../src/data/mobilize-events.json', import.meta.url);
const basePrivate = {
  id: 'fixture-private-event', title: 'Synthetic event', start: '2026-11-01T15:00:00-05:00',
  end: '2026-11-01T16:00:00-05:00', category: 'Community', location: PRIVATE_LOCATION,
  address: PRIVATE_LOCATION, description: 'Public event details', note: '', sample: false,
  sourceUrl: 'https://example.test/events/123', addressPrivate: true, isVirtual: false,
  calendarIds: ['community'],
};

test('normalizes only the reviewed source snapshot, keeps source IDs, and omits private side fields', async () => {
  const before = await readFile(sourcePath);
  const prepared = prepareReviewedMobilize(before);
  const after = await readFile(sourcePath);
  assert.equal(prepared.sourceSha256, REVIEWED_MOBILIZE_SHA256);
  assert.equal(prepared.recordCount, 119);
  assert.equal(prepared.privateCount, 81);
  assert.deepEqual(after, before);
  const privateRecords = prepared.records.filter(record => record.addressPrivate === true);
  assert.equal(privateRecords.length, 81);
  for (const record of privateRecords) {
    assert.equal(record.location, PRIVATE_LOCATION);
    assert.equal(record.address, PRIVATE_LOCATION);
    assert.equal(Object.hasOwn(record, 'sourceCity'), false);
    assert.equal(Object.hasOwn(record, 'coordinates'), false);
    assert.equal(typeof record.id, 'string');
    assertPublicPrivateEvent(record);
  }
  assert.deepEqual(
    privateRecords.map(record => record.id),
    JSON.parse(before.toString()).filter(record => record.addressPrivate).map(record => record.id),
  );
});

test('rejects edited source bytes rather than normalizing an unreviewed snapshot', async () => {
  const source = await readFile(sourcePath);
  const edited = Buffer.from(`${source.toString()} `);
  assert.throws(() => prepareReviewedMobilize(edited), /hash is not the reviewed version/);
});

test('keeps live Supabase snapshot mode fail-closed until the reviewed consumer is complete', () => {
  assert.doesNotThrow(() => assertLocalContentSource('local'));
  assert.throws(() => assertLocalContentSource('supabase'), /gated/);
});

test('rejects sentinel address, coordinates, unknown fields, and unsafe source URLs before publication', () => {
  const sentinel = 'PRIVATE_ADDRESS_SENTINEL_9F42';
  const invalidCases = [
    { ...basePrivate, address: sentinel },
    { ...basePrivate, location: sentinel },
    { ...basePrivate, coordinates: [-83.6, 32.8] },
    { ...basePrivate, sourceCity: 'Example' },
    { ...basePrivate, unexpected: { sentinel } },
    { ...basePrivate, sourceUrl: 'https://user:secret@example.test/event' },
    { ...basePrivate, sourceUrl: 'https://example.test/with whitespace' },
  ];
  for (const event of invalidCases) {
    assert.throws(() => assertPublicPrivateEvent(event), error => !error.message.includes(sentinel));
  }
  assert.throws(() => isPublicMapEvent(invalidCases[0]), error => !error.message.includes(sentinel));
  const output = [];
  assert.throws(() => {
    const event = invalidCases[0];
    assertPublicPrivateEvent(event);
    output.push(JSON.stringify(event));
  });
  assert.deepEqual(output, []);
});

test('permits only the placeholder in ICS location and excludes private or virtual geometry', () => {
  const privateEvent = { ...basePrivate, coordinates: null };
  assert.equal(assertPublicPrivateEvent(privateEvent), privateEvent);
  assert.equal(publicIcsLocation(privateEvent), PRIVATE_LOCATION);
  assert.equal(isPublicMapEvent(privateEvent), false);
  assert.equal(isPublicMapEvent({ ...basePrivate, addressPrivate: false, isVirtual: true, coordinates: [-83.6, 32.8] }), false);
  assert.equal(isPublicMapEvent({ ...basePrivate, addressPrivate: false, isVirtual: false, coordinates: [-83.6, 32.8] }), true);
});
