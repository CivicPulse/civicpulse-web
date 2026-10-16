import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rename as fsRename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { exportPublishedSnapshot } from '../scripts/export-published-content.mjs';
import { loadPinnedSnapshot } from '../scripts/read-pinned-snapshot.mjs';
import { materializePinnedSnapshot } from '../scripts/materialize-pinned-snapshot.mjs';
import { PRIVATE_LOCATION } from '../src/lib/private-event-policy.mjs';
import urlCorpus from './fixtures/cp-source-url-v1.json' with { type: 'json' };

const epoch = 'a68c5e45-98fa-4b78-b7e3-ef7da3123456';
const vendorHash = 'a'.repeat(64);
const sourceSha = 'b'.repeat(40);
const sentinel = 'HOSTILE_PRIVATE_SENTINEL_123_MAIN_ST';

function row(kind, id, payload, revision = 1) {
  return { kind, id, payload: { id, ...payload }, revision };
}

function manifest({ generation = '1', records = [], layers = [], bootstrap = true } = {}) {
  const counts = Object.fromEntries(['organization', 'calendar', 'event', 'layer', 'map'].map(kind => [kind, 0]));
  for (const item of records) counts[item.kind] += 1;
  return {
    schema_version: 1, dataset_epoch: epoch, generation, bootstrap_complete: bootstrap,
    counts,
    records: records.map(item => ({ kind: item.kind, id: item.id, revision: String(item.revision) }))
      .sort((a, b) => a.kind.localeCompare(b.kind, 'en') || a.id.localeCompare(b.id, 'en')),
    layers: layers.map(item => ({ id: item.id, revision: String(item.revision), mode: item.mode, feature_count: item.feature_count }))
      .sort((a, b) => a.id.localeCompare(b.id, 'en')),
  };
}

function clientFor(snapshot) {
  return {
    publicationManifest: async () => structuredClone(snapshot.manifest),
    listPublished: async (kind, { offset = 0, limit = 100 } = {}) =>
      structuredClone(snapshot.records.filter(item => item.kind === kind).slice(offset, offset + limit)),
    layerGeoJSON: async (id, { offset = 0 } = {}) => {
      if (snapshot.layerError) throw new Error('injected layer failure');
      const all = snapshot.layers.get(id) || [];
      const features = all.slice(offset, offset + 500);
      const nextOffset = offset + features.length < all.length ? offset + features.length : null;
      return { type: 'FeatureCollection', features: structuredClone(features), nextOffset };
    },
  };
}

function privateEvent(overrides = {}) {
  return {
    id: 'private-1', title: 'Neighborhood meeting', start: '2026-11-01T10:00:00-04:00',
    location: PRIVATE_LOCATION, address: PRIVATE_LOCATION, sourceUrl: 'https://example.org/events/1', sample: false, addressPrivate: true,
    calendarIds: ['calendar-1'], isVirtual: false, ...overrides,
  };
}

function fixture({ event = privateEvent(), generation = '1', layerMode = 'events', layerError = false, layerId = 'event-locations', storedLayerFeatures } = {}) {
  const records = event ? [row('event', 'private-1', event)] : [];
  const layers = new Map();
  const manifestLayers = [];
  if (layerMode) {
    records.push(row('layer', layerId, { name: 'Events' }));
    manifestLayers.push({ id: layerId, revision: 1, mode: layerMode, feature_count: 0 });
    if (layerMode === 'stored') layers.set(layerId, storedLayerFeatures || [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-83.6, 32.8] }, properties: {} }]);
  }
  const sortedRecords = [...records].sort((a, b) => a.kind.localeCompare(b.kind, 'en') || a.id.localeCompare(b.id, 'en'));
  return {
    records: sortedRecords,
    layers,
    layerError,
    manifest: manifest({ generation, records: sortedRecords, layers: manifestLayers }),
  };
}

async function allFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await allFiles(file));
    else files.push(file);
  }
  return files;
}

test('real export boundary activates valid private placeholder and explicit empty kinds', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerBytes = await readFile(path.join(dir, 'active-snapshot.json'));
  assert.equal(JSON.parse(pointerBytes).directory, path.basename(result.directory));
  const records = JSON.parse(await readFile(path.join(result.directory, 'records.json'), 'utf8'));
  assert.equal(records.organization.length, 0);
  assert.equal(records.calendar.length, 0);
  assert.equal(records.event[0].payload.address, PRIVATE_LOCATION);
  assert.equal(records.event[0].payload.location, PRIVATE_LOCATION);
  assert.equal(result.manifest.counts.map, 0);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
});

test('malicious private input reaches record serialization and fails before activation or output', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const prior = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const priorFiles = await allFiles(prior.directory);
  const priorBytes = await Promise.all(priorFiles.map(file => readFile(file)));

  const invalidCases = [
    { importProvenance: { originalAddress: sentinel } },
    { address: sentinel },
    { location: sentinel },
    { coordinates: [-83.6, 32.8] },
    { sourceUrl: 'https://123.456.7.8/' },
  ];
  const expectedErrors = [
    /non-allowlisted field/, /placeholder/, /placeholder/, /coordinates/, /cp-source-url-v1/,
  ];
  for (const [index, invalid] of invalidCases.entries()) {
    const hostile = fixture({ generation: '2', layerMode: null, event: privateEvent(invalid) });
    await assert.rejects(exportPublishedSnapshot({
      api: clientFor(hostile), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    }), expectedErrors[index]);
    assert.deepEqual(await readFile(pointerPath), pointerBefore);
    assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
    const afterFiles = await allFiles(dir);
    for (let i = 0; i < priorFiles.length; i += 1) assert.deepEqual(await readFile(priorFiles[i]), priorBytes[i]);
    for (const file of afterFiles) assert.equal((await readFile(file)).includes(sentinel), false);
  }
});

test('a later layer failure removes staging and preserves the active snapshot', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const prior = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const failing = fixture({ generation: '2', layerMode: 'stored', layerError: true });
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(failing), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /injected layer failure/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  await stat(prior.directory);
});

test('export requires explicit Supabase mode and refuses incomplete bootstrap', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await assert.rejects(exportPublishedSnapshot({ api: clientFor(fixture()), snapshotsDir: dir, vendorManifestSha256: vendorHash, sourceSha }), /explicit PUBLIC_CONTENT_SOURCE=supabase/);
  const unbootstrapped = fixture();
  unbootstrapped.manifest.bootstrap_complete = false;
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(unbootstrapped), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /bootstrap is incomplete/);
});

test('stored-layer pages enforce requested and cumulative bounds before accumulation', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await exportPublishedSnapshot({ api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const feature = { type: 'Feature', geometry: null, properties: {} };
  const page = (count, nextOffset) => ({ type: 'FeatureCollection', features: Array.from({ length: count }, () => feature), nextOffset });
  const cases = [
    { count: 501, pages: [page(501, null)], error: /page exceeds requested limit/ },
    { count: 1001, pages: [page(500, 500), page(501, null)], error: /page exceeds requested limit/ },
    { count: 500, pages: [page(500, 500), page(1, null)], error: /running count exceeds manifest/ },
  ];
  for (const [index, vector] of cases.entries()) {
    const candidate = fixture({ generation: String(index + 2), layerMode: 'stored', storedLayerFeatures: [] });
    candidate.manifest.layers[0].feature_count = vector.count;
    const api = clientFor(candidate);
    let reads = 0;
    api.layerGeoJSON = async () => vector.pages[reads++];
    await assert.rejects(exportPublishedSnapshot({ api, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha }), vector.error);
    assert.equal(reads, vector.pages.length);
    assert.deepEqual(await readFile(pointerPath), pointerBefore);
    assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  }
  for (const [index, count] of [0, 500].entries()) {
    const candidate = fixture({ generation: String(index + 10), layerMode: 'stored', storedLayerFeatures: Array.from({ length: count }, () => feature) });
    candidate.manifest.layers[0].feature_count = count;
    const result = await exportPublishedSnapshot({ api: clientFor(candidate), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha });
    assert.equal((await loadPinnedSnapshot(result.directory)).layers['event-locations'].features.length, count);
  }
});

test('all-empty inventory is refused and preserves the last active snapshot', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const prior = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const empty = fixture({ event: null, layerMode: null, generation: '2' });
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(empty), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /All-empty snapshot requires an exact operator approval contract/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  await stat(prior.directory);
});

test('snapshot activation requires an explicit full source SHA', async () => {
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: '/tmp/civicpulse-no-source-sha', sourceMode: 'supabase', vendorManifestSha256: vendorHash,
  }), /full commit hash/);
});

test('pinned reader uses the exact directory and rejects symlink inputs', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const secondFixture = fixture({ generation: '2' });
  const second = await exportPublishedSnapshot({
    api: clientFor(secondFixture), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pinned = await loadPinnedSnapshot(first.directory);
  assert.equal(pinned.manifest.generation, '1');
  assert.equal(JSON.parse(await readFile(path.join(dir, 'active-snapshot.json'), 'utf8')).directory, path.basename(second.directory));
  await assert.rejects(loadPinnedSnapshot(undefined), /must explicitly pin/);

  const recordsPath = path.join(second.directory, 'records.json');
  const outside = path.join(dir, 'outside.json');
  await writeFile(outside, '{}');
  await rm(recordsPath);
  await symlink(outside, recordsPath);
  await assert.rejects(loadPinnedSnapshot(second.directory), /symlinks/);
});

test('export refuses symlink roots and busy locks, and validates orphan reuse', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const realRoot = path.join(dir, 'real-root');
  const aliasRoot = path.join(dir, 'alias-root');
  await mkdir(realRoot);
  await symlink(realRoot, aliasRoot);
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: aliasRoot, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /symbolic links|real directory/);
  const nestedAlias = path.join(dir, 'nested-alias');
  const nestedTarget = path.join(realRoot, 'through-link');
  await symlink(realRoot, nestedAlias);
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: path.join(nestedAlias, 'through-link'), sourceMode: 'supabase',
    vendorManifestSha256: vendorHash, sourceSha,
  }), /symbolic links/);
  await assert.rejects(stat(nestedTarget), { code: 'ENOENT' });

  const first = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: realRoot, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(realRoot, 'active-snapshot.json');
  const firstPointer = await readFile(pointerPath);
  const secondApi = clientFor(fixture({ generation: '2' }));
  const second = await exportPublishedSnapshot({
    api: secondApi, snapshotsDir: realRoot, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  await writeFile(pointerPath, firstPointer);
  const reused = await exportPublishedSnapshot({
    api: secondApi, snapshotsDir: realRoot, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  assert.equal(reused.directory, second.directory);
  assert.equal(JSON.parse(await readFile(pointerPath)).directory, path.basename(second.directory));
  await stat(first.directory);
  await stat(second.directory);

  await writeFile(pointerPath, firstPointer);
  await writeFile(path.join(second.directory, 'records.json'), 'corrupt orphan');
  await assert.rejects(exportPublishedSnapshot({
    api: secondApi, snapshotsDir: realRoot, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /Pinned records checksum mismatch/);
  assert.deepEqual(await readFile(pointerPath), firstPointer);
  assert.equal(await readFile(path.join(second.directory, 'records.json'), 'utf8'), 'corrupt orphan');

  await writeFile(path.join(realRoot, '.export.lock'), 'stale lock');
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(fixture({ generation: '3' })), snapshotsDir: realRoot, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /Another snapshot export is active or requires lock recovery/);
});

test('same API generation supports source-only releases and exact retries without deleting reused artifacts', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const options = { api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha };
  const first = await exportPublishedSnapshot(options);
  const firstBytes = await readFile(path.join(first.directory, 'manifest.json'));
  const nextOptions = { ...options, sourceSha: 'c'.repeat(40) };
  const second = await exportPublishedSnapshot(nextOptions);
  assert.notEqual(second.directory, first.directory);
  assert.equal(second.manifest.generation, first.manifest.generation);
  assert.equal((await loadPinnedSnapshot(second.directory)).manifest.source_sha, nextOptions.sourceSha);
  const secondBytes = await readFile(path.join(second.directory, 'manifest.json'));
  const retry = await exportPublishedSnapshot(nextOptions);
  assert.equal(retry.directory, second.directory);
  assert.deepEqual(await readFile(path.join(first.directory, 'manifest.json')), firstBytes);
  assert.deepEqual(await readFile(path.join(second.directory, 'manifest.json')), secondBytes);
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  await assert.rejects(exportPublishedSnapshot({ ...nextOptions, renameImpl: async () => { throw new Error('reused pointer failure'); } }), /reused pointer failure/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.deepEqual(await readFile(path.join(second.directory, 'manifest.json')), secondBytes);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  const reformatted = `${JSON.stringify(JSON.parse(secondBytes), null, 2)}\n`;
  await writeFile(path.join(second.directory, 'manifest.json'), reformatted);
  await loadPinnedSnapshot(second.directory); // Semantically valid, but not byte-identical.
  await assert.rejects(exportPublishedSnapshot(nextOptions), /Existing immutable snapshot bytes differ: manifest.json/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.equal(await readFile(path.join(second.directory, 'manifest.json'), 'utf8'), reformatted);
});

test('prototype-named layer IDs survive export and pinned loading as own keys', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [index, layerId] of ['__proto__', 'constructor', 'toString'].entries()) {
    const result = await exportPublishedSnapshot({
      api: clientFor(fixture({ generation: String(index + 1), layerId, layerMode: 'stored', storedLayerFeatures: [] })),
      snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    });
    const storedManifest = JSON.parse(await readFile(path.join(result.directory, 'manifest.json'), 'utf8'));
    assert.equal(Object.hasOwn(storedManifest.layer_files, layerId), true);
    const loaded = await loadPinnedSnapshot(result.directory);
    assert.equal(Object.hasOwn(loaded.layers, layerId), true);
    assert.deepEqual(loaded.layers[layerId], { type: 'FeatureCollection', features: [] });
  }
});

test('pointer activation failure removes only its new generation and same-generation retry succeeds', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const candidate = clientFor(fixture({ generation: '2' }));
  let injectFailure = true;
  const failPointerRenameOnce = async (from, to) => {
    if (path.basename(to) === 'active-snapshot.json' && injectFailure) {
      injectFailure = false;
      const error = new Error('injected pointer activation failure');
      error.code = 'EISDIR';
      throw error;
    }
    return fsRename(from, to);
  };
  await assert.rejects(exportPublishedSnapshot({
    api: candidate, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    renameImpl: failPointerRenameOnce,
  }), /injected pointer activation failure/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  assert.equal((await readdir(dir)).some(name => name.startsWith(`${epoch}-2-`)), false);
  await stat(first.directory);

  const retry = await exportPublishedSnapshot({
    api: candidate, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  assert.equal(retry.manifest.generation, '2');
  assert.equal(JSON.parse(await readFile(pointerPath, 'utf8')).directory, path.basename(retry.directory));
  await stat(first.directory);
});

test('pinned-reader rejection happens before pointer swap and retry can reuse the candidate identity', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const candidate = clientFor(fixture({ generation: '2', layerId: '__proto__', layerMode: 'stored', storedLayerFeatures: [] }));
  const rejectAfterActualRead = async (directory, options) => {
    await loadPinnedSnapshot(directory, options);
    throw new Error('injected pinned-reader rejection');
  };
  await assert.rejects(exportPublishedSnapshot({
    api: candidate, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    validateSnapshotImpl: rejectAfterActualRead,
  }), /injected pinned-reader rejection/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  assert.equal((await readdir(dir)).some(name => name.startsWith(`${epoch}-2-`)), false);
  await stat(first.directory);

  const retry = await exportPublishedSnapshot({
    api: candidate, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const readBack = await loadPinnedSnapshot(retry.directory);
  assert.equal(Object.hasOwn(readBack.layers, '__proto__'), true);
  assert.deepEqual(await readFile(pointerPath).then(bytes => JSON.parse(bytes).directory), path.basename(retry.directory));
});

test('an unreadable assembled candidate cannot replace the active pointer or prior artifact', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = await exportPublishedSnapshot({
    api: clientFor(fixture()), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const pointerPath = path.join(dir, 'active-snapshot.json');
  const pointerBefore = await readFile(pointerPath);
  const priorManifest = await readFile(path.join(first.directory, 'manifest.json'));
  const candidate = clientFor(fixture({ generation: '2', layerId: '__proto__', layerMode: 'stored', storedLayerFeatures: [] }));
  const corruptFinalThenRead = async (directory, options) => {
    if (!options?.allowStagingDirectory) await writeFile(path.join(directory, 'records.json'), '{ unreadable final candidate');
    return loadPinnedSnapshot(directory, options);
  };
  await assert.rejects(exportPublishedSnapshot({
    api: candidate, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    validateSnapshotImpl: corruptFinalThenRead,
  }), /Pinned records checksum mismatch/);
  assert.deepEqual(await readFile(pointerPath), pointerBefore);
  assert.deepEqual(await readFile(path.join(first.directory, 'manifest.json')), priorManifest);
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  assert.equal((await readdir(dir)).some(name => name.startsWith(`${epoch}-2-`)), false);

  const retry = await exportPublishedSnapshot({
    api: candidate, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  assert.equal((await loadPinnedSnapshot(retry.directory)).manifest.generation, '2');
});

test('export-read-materialize-Astro-build roundtrips prototype-named layer IDs', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-build-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const layerIds = ['__proto__', 'constructor', 'toString'];
  const records = [
    ...layerIds.map(id => row('layer', id, { name: `Layer ${id}`, description: 'Fixture layer', color: '#26726b', kind: 'point' })),
    row('map', 'fixture-map', { name: 'Fixture map', description: 'Snapshot build regression fixture', layers: layerIds }),
  ];
  const snapshot = {
    records,
    layers: new Map(layerIds.map(id => [id, []])),
    manifest: manifest({ records, layers: layerIds.map(id => ({ id, revision: 1, mode: 'stored', feature_count: 0 })) }),
  };
  const exported = await exportPublishedSnapshot({
    api: clientFor(snapshot), snapshotsDir: path.join(dir, 'snapshots'), sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  const read = await loadPinnedSnapshot(exported.directory);
  for (const id of layerIds) assert.equal(Object.hasOwn(read.layers, id), true);

  const app = path.join(dir, 'app');
  const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await cp(repository, app, { recursive: true, filter(source) {
    const relative = path.relative(repository, source);
    if (!relative) return true;
    if (relative === 'src/data/mobilize-events.public.json') return false;
    const first = relative.split(path.sep)[0];
    return !['.git', 'node_modules', 'dist', '.astro', '.civicpulse', '.impeccable'].includes(first) && !relative.startsWith('.env');
  } });
  await symlink(path.join(repository, 'node_modules'), path.join(app, 'node_modules'), 'dir');
  // Static imports must resolve even when the selected CMS branch excludes
  // local events. Generate this ignored input from reviewed bytes in the
  // disposable app rather than inheriting a prepared shared checkout.
  execFileSync(process.execPath, [path.join(app, 'scripts/prepare-public-mobilize.mjs')], {
    cwd: app, env: { ...process.env, PUBLIC_CONTENT_SOURCE: 'local' }, stdio: 'pipe', timeout: 30_000,
  });
  const materialized = await materializePinnedSnapshot(exported.directory, {
    dataDirectory: path.join(app, 'src/data'), publicDirectory: path.join(app, 'public'),
  });
  assert.equal(materialized.snapshot.manifest.generation, '1');
  const env = { ...process.env, PUBLIC_CONTENT_SOURCE: 'supabase', CIVICPULSE_SNAPSHOT_DIR: exported.directory };
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  execFileSync(process.execPath, [path.join(app, 'node_modules/astro/bin/astro.mjs'), 'build'], {
    cwd: app, env, stdio: 'pipe', timeout: 120_000,
  });
  const output = path.join(app, 'dist/data/cms');
  for (const id of layerIds) {
    const bytes = await readFile(path.join(output, `${encodeURIComponent(id)}.geojson`), 'utf8');
    assert.deepEqual(JSON.parse(bytes), { type: 'FeatureCollection', features: [] });
  }
  assert.equal(JSON.parse(await readFile(path.join(app, 'dist/data/cms-snapshot.json'), 'utf8')).manifest_sha256, exported.manifest.sha256);
});

test('actual snapshot serialization matches every cp-source-url-v1 corpus and boundary vector', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let generation = 1;
  for (const sourceUrl of urlCorpus.accept) {
    const result = await exportPublishedSnapshot({
      api: clientFor(fixture({ generation: String(generation++), layerMode: null, event: privateEvent({ sourceUrl }) })),
      snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    });
    const data = JSON.parse(await readFile(path.join(result.directory, 'records.json'), 'utf8'));
    assert.equal(data.event[0].payload.sourceUrl, sourceUrl);
  }
  const lastAcceptedPointer = await readFile(path.join(dir, 'active-snapshot.json'));
  for (const sourceUrl of urlCorpus.reject) {
    const hostile = fixture({ generation: String(generation++), layerMode: null, event: privateEvent({ sourceUrl }) });
    await assert.rejects(exportPublishedSnapshot({
      api: clientFor(hostile), snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    }), typeof sourceUrl === 'string' ? /cp-source-url-v1/ : /field must be a string/);
    assert.deepEqual(await readFile(path.join(dir, 'active-snapshot.json')), lastAcceptedPointer);
    assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
  }
  const repeat = (character, count) => character.repeat(count);
  const maxLabel = `https://${repeat('a', 63)}.${repeat('b', 63)}.${repeat('c', 63)}.${repeat('d', 61)}/`;
  const longLabel = `https://${repeat('a', 64)}.test/`;
  const maxHost = `https://${repeat('a', 63)}.${repeat('b', 63)}.${repeat('c', 63)}.${repeat('d', 62)}/`;
  for (const sourceUrl of [maxLabel]) {
    const result = await exportPublishedSnapshot({
      api: clientFor(fixture({ generation: String(generation++), layerMode: null, event: privateEvent({ sourceUrl }) })),
      snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    });
    const data = JSON.parse(await readFile(path.join(result.directory, 'records.json'), 'utf8'));
    assert.equal(data.event[0].payload.sourceUrl, sourceUrl);
  }
  for (const sourceUrl of [longLabel, maxHost]) {
    await assert.rejects(exportPublishedSnapshot({
      api: clientFor(fixture({ generation: String(generation++), layerMode: null, event: privateEvent({ sourceUrl }) })),
      snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
    }), /cp-source-url-v1/);
  }
  const noUrl = privateEvent();
  delete noUrl.sourceUrl;
  await assert.rejects(exportPublishedSnapshot({
    api: clientFor(fixture({ generation: String(generation), layerMode: null, event: noUrl })),
    snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  }), /cp-source-url-v1/);
});

test('manifest drift discards the whole attempt and refetches every kind before activation', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-snapshot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const current = fixture({ generation: '2' });
  const firstManifest = structuredClone(current.manifest);
  firstManifest.generation = '1';
  const manifestReads = [firstManifest, current.manifest, current.manifest, current.manifest];
  const pageReads = Object.fromEntries(['organization', 'calendar', 'event', 'layer', 'map'].map(kind => [kind, 0]));
  const api = {
    publicationManifest: async () => manifestReads.shift(),
    listPublished: async (kind, options) => {
      pageReads[kind] += 1;
      return clientFor(current).listPublished(kind, options);
    },
    layerGeoJSON: async (...args) => clientFor(current).layerGeoJSON(...args),
  };
  const result = await exportPublishedSnapshot({
    api, snapshotsDir: dir, sourceMode: 'supabase', vendorManifestSha256: vendorHash, sourceSha,
  });
  assert.equal(result.manifest.generation, '2');
  assert.deepEqual(pageReads, { organization: 2, calendar: 2, event: 2, layer: 2, map: 2 });
  assert.deepEqual((await readdir(dir)).filter(name => name.startsWith('.staging-')), []);
});
