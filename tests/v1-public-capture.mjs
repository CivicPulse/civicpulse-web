// Test-only v1 cutover capture fixtures. No hosted API, credentials or writes.
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureV1PublicContent, loadV1Capture, loadV1Inventory, sourceIdentityDigest } from '../scripts/v1-public-capture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = path.join(root, 'data/cms-v1-cutover/v1-935-00c472b8.json');
const sourceSha = 'a'.repeat(40);
const vendorSha = 'b'.repeat(64);
const inventory = await loadV1Inventory(inventoryPath);
const kinds = ['organization', 'calendar', 'event', 'layer', 'map'];
const eventIds = inventory.records.filter((row) => row.kind === 'event').map((row) => row.id).sort();
const privateIds = new Set(eventIds.slice(0, inventory.expected_private_events));
const mappedIds = new Set(eventIds.slice(inventory.expected_private_events, inventory.expected_private_events + inventory.expected_features.event_locations));
const layerMeta = new Map(inventory.layers.map((layer) => [layer.id, layer]));
const storedLayers = new Map();
let featureOrdinal = 0;
for (const layer of inventory.layers.filter((entry) => entry.mode === 'stored')) {
  const features = Array.from({ length: layer.feature_count }, (_, index) => ({
    type: 'Feature', id: `feature-${featureOrdinal++}`,
    geometry: { type: 'Point', coordinates: [-83.6 + index / 10000, 32.8] },
    properties: { name: `${layer.id}-${index}` },
  }));
  storedLayers.set(layer.id, { type: 'FeatureCollection', features });
}
let coordinateOrdinal = 0;
function eventPayload(id) {
  const privateEvent = privateIds.has(id);
  const mapped = mappedIds.has(id);
  const payload = {
    id, title: `Event ${id}`, start: '2026-10-20T18:00:00-04:00', end: '2026-10-20T19:00:00-04:00',
    category: 'community', location: privateEvent ? 'Private location — see organizer for details' : 'Test venue',
    address: privateEvent ? 'Private location — see organizer for details' : '1 Test Way, Macon, GA',
    sample: false, sourceUrl: `https://example.test/events/${encodeURIComponent(id)}`, sourceChecked: '2026-10-18',
    organizer: 'Test', organizationId: 'org-test', calendarIds: ['cal-test'], addressPrivate: privateEvent,
    isVirtual: false,
  };
  if (mapped) payload.coordinates = [-83.6 + coordinateOrdinal++ / 1000, 32.8];
  return payload;
}
function baseRows() {
  const rows = [];
  for (const row of inventory.records) {
    let payload;
    if (row.kind === 'event') payload = eventPayload(row.id);
    else if (row.kind === 'layer') payload = { id: row.id, name: row.id, ...(layerMeta.get(row.id).mode === 'events' ? { dynamic: 'events' } : {}) };
    else if (row.kind === 'organization') payload = { id: row.id, name: row.id };
    else if (row.kind === 'calendar') payload = { id: row.id, name: row.id, organizationId: 'org-test' };
    else payload = { id: row.id, name: row.id, layers: [] };
    rows.push({ kind: row.kind, id: row.id, revision: 1, payload });
  }
  for (const row of inventory.synthetic_exclusions) rows.push({ kind: row.kind, id: row.id, revision: 1, payload: { id: row.id, name: row.id } });
  return rows;
}
function fixture({ omit, extra, mutateFence, mutatePayload, privateViolation, incompletePage, layerDefect } = {}) {
  let rows = baseRows();
  if (omit) rows = rows.filter((row) => !(row.kind === omit.kind && row.id === omit.id));
  if (extra) rows.push(extra);
  if (privateViolation) {
    const row = rows.find((entry) => entry.kind === 'event' && privateIds.has(entry.id));
    row.payload = { ...row.payload, address: 'raw private address' };
  }
  let mutated = false;
  let layerReads = 0;
  return {
    rows,
    async listPublished(kind, { limit = 100, offset = 0 } = {}) {
      const source = rows.filter((row) => row.kind === kind).sort((a, b) => a.id.localeCompare(b.id));
      let page = source.slice(offset, offset + limit);
      if (incompletePage && kind === 'event' && offset === 0) return page.slice(0, 99);
      if ((mutateFence || mutatePayload) && mutated && kind === 'event') {
        const index = page.findIndex((row) => !privateIds.has(row.id));
        if (index >= 0) page = page.map((row, i) => i === index ? (mutatePayload ? { ...row, payload: { ...row.payload, title: 'changed after layer read' } } : { ...row, revision: row.revision + 1 }) : row);
      }
      return page;
    },
    async layerGeoJSON(id, { limit = 500, offset = 0 } = {}) {
      layerReads += 1;
      if ((mutateFence || mutatePayload) && layerReads === 1) mutated = true;
      const collection = storedLayers.get(id);
      if (!collection) return { type: 'FeatureCollection', features: [], nextOffset: null };
      const features = collection.features.slice(offset, offset + limit);
      let nextOffset = offset + features.length < collection.features.length ? offset + features.length : null;
      if (layerDefect === 'short' && offset === 0) return { type: 'FeatureCollection', features: features.slice(0, 5), nextOffset: null };
      if (layerDefect === 'no-advance' && offset === 0) return { type: 'FeatureCollection', features, nextOffset: 0 };
      if (layerDefect === 'missing-cursor' && offset === 0) return { type: 'FeatureCollection', features };
      return { type: 'FeatureCollection', features, nextOffset };
    },
  };
}
async function rejectsCapture(options, pattern) {
  const dir = await mkdtemp(path.join(tmpdir(), 'civicpulse-v1-capture-'));
  try {
    await assert.rejects(captureV1PublicContent({
      api: fixture(options), snapshotsDir: dir, inventoryPath, sourceSha, vendorManifestSha256: vendorSha,
    }), pattern);
    const entries = await readdir(dir);
    assert.deepEqual(entries, [], 'failed capture left a candidate or lock');
  } finally { await rm(dir, { recursive: true, force: true }); }
}

const captureDir = await mkdtemp(path.join(tmpdir(), 'civicpulse-v1-capture-'));
try {
  const capture = await captureV1PublicContent({
    api: fixture(), snapshotsDir: captureDir, inventoryPath, sourceSha, vendorManifestSha256: vendorSha,
  });
  const loaded = await loadV1Capture(capture.directory);
  assert.equal(loaded.manifest.format, 'civicpulse-v1-direct-capture');
  assert.equal(loaded.manifest.records.length, 935);
  assert.equal(loaded.manifest.content_fence.full_rows, 938);
  assert.equal(loaded.manifest.content_fence.selected_rows, 935);
  assert.equal(loaded.manifest.content_fence.excluded_rows, 3);
  assert.equal(loaded.manifest.content_fence.initial_identity_sha256, loaded.manifest.content_fence.final_identity_sha256);
  assert.equal(loaded.manifest.counts.organization, 7);
  assert.equal(loaded.manifest.counts.calendar, 20);
  assert.equal(loaded.manifest.counts.event, 867);
  assert.equal(loaded.manifest.counts.layer, 24);
  assert.equal(loaded.manifest.counts.map, 17);
  assert.equal(sourceIdentityDigest(loaded.manifest.records), inventory.expected_identity_sha256);
  assert.equal(loaded.manifest.layers.filter((layer) => layer.mode === 'stored').reduce((sum, layer) => sum + layer.feature_count, 0), 1311);
  assert.equal(loaded.manifest.layers.find((layer) => layer.mode === 'events').feature_count, 608);
  assert.equal(loaded.manifest.layers.find((layer) => layer.mode === 'events').id, 'event-locations');
  assert.equal('dataset_epoch' in loaded.manifest, false);
  assert.equal('generation' in loaded.manifest, false);
  assert.equal('bootstrap_complete' in loaded.manifest, false);
  assert.equal(loaded.records.event.length, 867);
  assert.equal(loaded.records.event.filter((row) => row.payload.addressPrivate === true).length, 81);
  assert.equal(loaded.manifest.inventory.synthetic_exclusions.length, 3);
  console.log('V1 capture positive: 935 selected, 3 explicit exclusions, 1311 stored + 608 event features, honest provenance.');
} finally { await rm(captureDir, { recursive: true, force: true }); }

await rejectsCapture({ omit: { kind: 'event', id: eventIds[0] } }, /missing expected records/);
await rejectsCapture({ extra: { kind: 'map', id: 'unknown-row', revision: 1, payload: { id: 'unknown-row' } } }, /Unknown published row/);
await rejectsCapture({ omit: inventory.synthetic_exclusions[0] }, /missing an explicit synthetic exclusion/);
await rejectsCapture({ privateViolation: true }, /failed public policy/);
await rejectsCapture({ mutateFence: true }, /changed during capture/);
await rejectsCapture({ mutatePayload: true }, /changed during capture/);
await rejectsCapture({ incompletePage: true }, /missing expected records/);
await rejectsCapture({ layerDefect: 'short' }, /feature count differs/);
await rejectsCapture({ layerDefect: 'no-advance' }, /pagination did not advance/);
await rejectsCapture({ layerDefect: 'missing-cursor' }, /invalid nextOffset/);
console.log('V1 capture negatives: missing/unknown/synthetic/privacy/revision+payload fence/incomplete page/layer cursor+count all fail closed without a candidate.');
