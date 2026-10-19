/**
 * Web-owned direct v1 public-content capture.
 *
 * This is deliberately NOT the additive M1 publication-manifest exporter:
 * it never reads or fabricates dataset_epoch/generation/bootstrap, and it has
 * no manifest RPC dependency. It reads the existing v1 published content and
 * layer_geojson endpoints, fences complete identity/revision/payload reads
 * around one bounded layer read, and writes an explicitly labeled cutover
 * snapshot with honest provenance.
 */
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertPublicPrivateEvent } from '../src/lib/private-event-policy.mjs';
import { deriveEventLocations } from '../src/lib/event-geojson.mjs';
import { CONTENT_KINDS, sha256, stableSerialize } from './snapshot-integrity.mjs';

const PAGE = 100;
const LAYER_PAGE = 500;
const MAX_ROWS = 20000;
const FORMAT = 'civicpulse-v1-direct-capture';
const FORBIDDEN = ['dataset_epoch', 'generation', 'bootstrap_complete'];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const cCompare = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
const fail = (message) => { throw new Error(message); };

function requireRecord(value, message) {
  if (!isRecord(value)) fail(message);
  return value;
}

async function assertNoSymlinkComponents(directory) {
  const parsed = path.parse(directory);
  let current = parsed.root;
  for (const part of directory.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let metadata;
    try { metadata = await lstat(current); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (metadata.isSymbolicLink()) fail('Capture root path cannot contain symbolic links');
    if (!metadata.isDirectory()) fail('Capture root path components must be directories');
  }
}

export function sourceIdentityDigest(records) {
  const sorted = [...records].sort((a, b) => cCompare(a.kind, b.kind) || cCompare(a.id, b.id));
  const hash = createHash('sha256');
  for (const row of sorted) {
    hash.update(row.kind);
    hash.update('\0');
    hash.update(row.id);
    hash.update('\n');
  }
  return hash.digest('hex');
}

function fullIdentityDigest(rows) {
  const sorted = [...rows].sort((a, b) => cCompare(a.kind, b.kind) || cCompare(a.id, b.id));
  const hash = createHash('sha256');
  for (const row of sorted) {
    hash.update(row.kind);
    hash.update('\0');
    hash.update(row.id);
    hash.update('\0');
    hash.update(row.revision);
    hash.update('\0');
    hash.update(row.payload_sha256);
    hash.update('\n');
  }
  return hash.digest('hex');
}

function normalizePublishedRow(value, kind) {
  const row = requireRecord(value, 'Published row must be an object');
  if (row.kind !== kind || typeof row.id !== 'string' || row.id.length === 0 || !isRecord(row.payload) ||
    row.payload.id !== row.id || !Number.isSafeInteger(row.revision) || row.revision < 1) {
    fail(`Malformed published ${kind} row`);
  }
  let payload;
  try { payload = stableSerialize(row.payload); }
  catch (error) { fail(`Published ${kind}/${row.id} payload is not canonical JSON: ${error.message}`); }
  return Object.freeze({
    kind, id: row.id, revision: String(row.revision), payload: row.payload,
    payload_sha256: sha256(payload),
  });
}

async function fetchAllKind(api, kind) {
  const rows = [];
  let offset = 0;
  for (;;) {
    if (rows.length > MAX_ROWS) fail(`Published ${kind} exceeds the fixed row bound`);
    const page = await api.listPublished(kind, { limit: PAGE, offset });
    if (!Array.isArray(page) || page.length > PAGE) fail(`Published ${kind} page is invalid`);
    for (const value of page) rows.push(normalizePublishedRow(value, kind));
    if (page.length < PAGE) break;
    offset += page.length;
    if (offset > MAX_ROWS) fail(`Published ${kind} pagination exceeds the fixed row bound`);
  }
  return rows;
}

async function fetchAllPublished(api) {
  const rows = [];
  for (const kind of CONTENT_KINDS) rows.push(...await fetchAllKind(api, kind));
  rows.sort((a, b) => cCompare(a.kind, b.kind) || cCompare(a.id, b.id));
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.kind}\0${row.id}`;
    if (seen.has(key)) fail(`Duplicate published row ${row.kind}/${row.id}`);
    seen.add(key);
  }
  return rows;
}

export async function loadV1Inventory(inventoryPath) {
  if (typeof inventoryPath !== 'string' || !inventoryPath) fail('Explicit v1 cutover inventory path required');
  const bytes = await readFile(inventoryPath);
  let doc;
  try { doc = JSON.parse(bytes.toString('utf8')); }
  catch { fail('V1 cutover inventory is not valid JSON'); }
  requireRecord(doc, 'V1 cutover inventory must be an object');
  if (doc.schema_version !== 1 || typeof doc.label !== 'string' || !doc.label ||
    !isRecord(doc.expected_counts) || Object.keys(doc.expected_counts).length !== CONTENT_KINDS.length ||
    !Number.isSafeInteger(doc.expected_total) || doc.expected_total < 1 ||
    !Array.isArray(doc.records) || !Array.isArray(doc.synthetic_exclusions) || !Array.isArray(doc.layers) ||
    !isRecord(doc.expected_features) || !/^[0-9a-f]{64}$/i.test(doc.expected_identity_sha256 || '')) {
    fail('V1 cutover inventory is incomplete');
  }
  for (const kind of CONTENT_KINDS) {
    if (!Number.isSafeInteger(doc.expected_counts[kind]) || doc.expected_counts[kind] < 1) fail(`V1 inventory ${kind} count must be positive`);
  }
  if (CONTENT_KINDS.reduce((sum, kind) => sum + doc.expected_counts[kind], 0) !== doc.expected_total) fail('V1 inventory total does not match counts');
  if (doc.records.length !== doc.expected_total) fail('V1 inventory record count does not match total');
  const seen = new Set();
  for (const row of doc.records) {
    if (!isRecord(row) || !CONTENT_KINDS.includes(row.kind) || typeof row.id !== 'string' || !row.id) fail('V1 inventory contains a malformed record');
    const key = `${row.kind}\0${row.id}`;
    if (seen.has(key)) fail('V1 inventory contains a duplicate record');
    seen.add(key);
  }
  for (const kind of CONTENT_KINDS) {
    if (doc.records.filter((row) => row.kind === kind).length !== doc.expected_counts[kind]) fail(`V1 inventory ${kind} inventory count mismatch`);
  }
  if (sourceIdentityDigest(doc.records) !== doc.expected_identity_sha256.toLowerCase()) fail('V1 inventory identity digest mismatch');
  const exclusions = new Set();
  for (const row of doc.synthetic_exclusions) {
    if (!isRecord(row) || !CONTENT_KINDS.includes(row.kind) || typeof row.id !== 'string' || !row.id) fail('V1 synthetic exclusion is malformed');
    const key = `${row.kind}\0${row.id}`;
    if (exclusions.has(key) || seen.has(key)) fail('V1 synthetic exclusion duplicates or overlaps expected content');
    exclusions.add(key);
  }
  if (doc.synthetic_exclusions.length < 1) fail('V1 inventory must explicitly list synthetic exclusions');
  if (doc.layers.length !== doc.expected_counts.layer) fail('V1 inventory layer count mismatch');
  const layerIds = new Set();
  let stored = 0;
  let events = 0;
  for (const layer of doc.layers) {
    if (!isRecord(layer) || typeof layer.id !== 'string' || !layer.id || layerIds.has(layer.id) ||
      !['stored', 'events'].includes(layer.mode) || !Number.isSafeInteger(layer.feature_count) || layer.feature_count < 0) {
      fail('V1 inventory layer metadata is malformed');
    }
    layerIds.add(layer.id);
    if (layer.mode === 'stored') stored += layer.feature_count;
    else events += layer.feature_count;
  }
  if (stored !== doc.expected_features.stored || events !== doc.expected_features.event_locations ||
    doc.expected_features.total !== stored + events) fail('V1 inventory feature totals do not match layer metadata');
  return Object.freeze({ ...doc, inventory_sha256: sha256(bytes) });
}

function selectExpectedRows(rows, inventory) {
  const expected = new Map(inventory.records.map((row) => [`${row.kind}\0${row.id}`, row]));
  const excluded = new Map(inventory.synthetic_exclusions.map((row) => [`${row.kind}\0${row.id}`, row]));
  const selected = [];
  const seenExpected = new Set();
  const seenExcluded = new Set();
  for (const row of rows) {
    const key = `${row.kind}\0${row.id}`;
    if (expected.has(key)) { selected.push(row); seenExpected.add(key); continue; }
    if (excluded.has(key)) { seenExcluded.add(key); continue; }
    fail(`Unknown published row ${row.kind}/${row.id}`);
  }
  if (seenExpected.size !== expected.size) fail('Published content is missing expected records');
  if (seenExcluded.size !== excluded.size) fail('Published content is missing an explicit synthetic exclusion');
  for (const kind of CONTENT_KINDS) {
    const count = selected.filter((row) => row.kind === kind).length;
    if (count !== inventory.expected_counts[kind]) fail(`Selected ${kind} count mismatch`);
  }
  if (sourceIdentityDigest(selected) !== inventory.expected_identity_sha256.toLowerCase()) fail('Selected content identity digest mismatch');
  const privateEvents = selected.filter((row) => row.kind === 'event' && row.payload.addressPrivate === true);
  if (privateEvents.length !== inventory.expected_private_events) fail('Private event count mismatch');
  for (const row of privateEvents) {
    try { assertPublicPrivateEvent(row.payload); }
    catch (error) { fail(`Private event ${row.id} failed public policy: ${error.message}`); }
  }
  const normalEvents = selected.filter((row) => row.kind === 'event' && row.payload.addressPrivate !== true);
  if (normalEvents.length !== inventory.expected_normal_events) fail('Normal event count mismatch');
  selected.sort((a, b) => cCompare(a.kind, b.kind) || cCompare(a.id, b.id));
  return selected;
}

function validateFeatureCollection(value, layerId) {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) fail(`Layer ${layerId} returned an invalid FeatureCollection`);
  for (const feature of value.features) {
    if (!isRecord(feature) || feature.type !== 'Feature' || !('geometry' in feature) || !isRecord(feature.properties)) fail(`Layer ${layerId} contains an invalid feature`);
  }
}

async function fetchStoredLayer(api, layer) {
  const features = [];
  let offset = 0;
  for (;;) {
    const page = await api.layerGeoJSON(layer.id, { limit: LAYER_PAGE, offset });
    validateFeatureCollection(page, layer.id);
    if (page.features.length > LAYER_PAGE) fail(`Layer ${layer.id} page exceeds requested limit`);
    if (features.length + page.features.length > layer.feature_count) fail(`Layer ${layer.id} exceeds expected feature count`);
    features.push(...page.features);
    if (!Number.isSafeInteger(page.nextOffset) && page.nextOffset !== null) fail(`Layer ${layer.id} has an invalid nextOffset`);
    if (page.nextOffset === null) break;
    if (page.nextOffset !== offset + page.features.length || page.nextOffset <= offset || page.features.length === 0) fail(`Layer ${layer.id} pagination did not advance exactly`);
    offset = page.nextOffset;
    if (offset > layer.feature_count + LAYER_PAGE) fail(`Layer ${layer.id} pagination exceeds expected count`);
  }
  if (features.length !== layer.feature_count) fail(`Layer ${layer.id} feature count differs from the cutover pin`);
  return { type: 'FeatureCollection', features };
}

async function captureLayers(api, selected, inventory) {
  const layerRows = selected.filter((row) => row.kind === 'layer');
  if (layerRows.length !== inventory.layers.length) fail('Selected layer rows do not match inventory layer metadata');
  const byId = new Map(layerRows.map((row) => [row.id, row]));
  const metadata = [];
  const collections = new Map();
  let storedTotal = 0;
  let eventTotal = 0;
  const events = selected.filter((row) => row.kind === 'event').map((row) => row.payload);
  for (const layer of inventory.layers) {
    const row = byId.get(layer.id);
    if (!row) fail(`Layer ${layer.id} is missing from selected content`);
    if (layer.mode === 'stored') {
      const collection = await fetchStoredLayer(api, layer);
      storedTotal += collection.features.length;
      collections.set(layer.id, collection);
      metadata.push({ id: layer.id, revision: row.revision, mode: 'stored', feature_count: collection.features.length, output_feature_count: collection.features.length });
    } else {
      const derived = deriveEventLocations(events);
      if (derived.eligibleCount !== layer.feature_count) fail(`Event layer ${layer.id} eligible count differs from the cutover pin`);
      eventTotal += derived.eligibleCount;
      collections.set(layer.id, derived.collection);
      metadata.push({ id: layer.id, revision: row.revision, mode: 'events', feature_count: derived.eligibleCount, output_feature_count: derived.collection.features.length });
    }
  }
  if (storedTotal !== inventory.expected_features.stored || eventTotal !== inventory.expected_features.event_locations) fail('Captured feature totals differ from the cutover pin');
  return { metadata, collections };
}

async function writeJson(file, value) {
  const bytes = `${stableSerialize(value)}\n`;
  await writeFile(file, bytes, { flag: 'wx' });
  return { sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) };
}

/** Capture one explicit v1 cutover generation. No manifest, generation or bootstrap is invented. */
export async function captureV1PublicContent({
  api, snapshotsDir, inventoryPath, sourceSha, vendorManifestSha256, now = Date.now,
  renameImpl = rename, validateCaptureImpl = loadV1Capture,
}) {
  if (!api || typeof api.listPublished !== 'function' || typeof api.layerGeoJSON !== 'function') fail('V1 capture requires the published-content and layer_geojson client');
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) fail('V1 capture requires a full lowercase source commit');
  if (!/^[0-9a-f]{64}$/i.test(vendorManifestSha256 || '')) fail('V1 capture requires a pinned v1 vendor manifest hash');
  const inventory = await loadV1Inventory(inventoryPath);
  const requestedDir = path.resolve(snapshotsDir);
  await assertNoSymlinkComponents(requestedDir);
  await mkdir(requestedDir, { recursive: true });
  const rootInfo = await lstat(requestedDir);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) fail('V1 capture root must be a real directory');
  const absoluteDir = await realpath(requestedDir);
  if (absoluteDir !== requestedDir) fail('V1 capture root path cannot traverse a symbolic link');

  const lockPath = path.join(absoluteDir, '.v1-capture.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
    await lock.writeFile(`${process.pid}\n`);
  } catch (error) {
    await lock?.close().catch(() => {});
    if (error.code === 'EEXIST') fail('Another v1 capture is active or requires lock recovery');
    throw error;
  }
  const stageDir = path.join(absoluteDir, `.staging-${randomUUID()}`);
  try {
    const initialRows = await fetchAllPublished(api);
    const initialSelected = selectExpectedRows(initialRows, inventory);
    const initialIdentity = fullIdentityDigest(initialRows);
    const layers = await captureLayers(api, initialSelected, inventory);
    const finalRows = await fetchAllPublished(api);
    const finalSelected = selectExpectedRows(finalRows, inventory);
    const finalIdentity = fullIdentityDigest(finalRows);
    if (initialIdentity !== finalIdentity) fail('V1 public content identity/revision/payload changed during capture');
    if (stableSerialize(initialSelected.map(({ kind, id, revision, payload_sha256 }) => ({ kind, id, revision, payload_sha256 }))) !==
        stableSerialize(finalSelected.map(({ kind, id, revision, payload_sha256 }) => ({ kind, id, revision, payload_sha256 })))) {
      fail('V1 selected content changed during capture');
    }

    await mkdir(stageDir, { recursive: false });
    const grouped = Object.fromEntries(CONTENT_KINDS.map((kind) => [kind, []]));
    for (const row of finalSelected) grouped[row.kind].push({ kind: row.kind, id: row.id, revision: row.revision, payload: row.payload });
    const files = {};
    files['records.json'] = await writeJson(path.join(stageDir, 'records.json'), grouped);
    await mkdir(path.join(stageDir, 'layers'));
    const layerFiles = {};
    for (const layer of layers.metadata) {
      const fileName = `${sha256(layer.id).slice(0, 24)}.geojson`;
      const relative = `layers/${fileName}`;
      layerFiles[layer.id] = {
        file: relative, mode: layer.mode, feature_count: layer.feature_count,
        output_feature_count: layer.output_feature_count,
        ...await writeJson(path.join(stageDir, relative), layers.collections.get(layer.id)),
      };
    }
    const manifest = {
      schema_version: 1,
      format: FORMAT,
      source: 'supabase-v1',
      exporter_version: 1,
      source_sha: sourceSha,
      api_vendor_manifest_sha256: vendorManifestSha256,
      captured_at: new Date(now()).toISOString(),
      inventory: {
        label: inventory.label,
        expected_total: inventory.expected_total,
        expected_counts: inventory.expected_counts,
        expected_identity_sha256: inventory.expected_identity_sha256,
        expected_features: inventory.expected_features,
        expected_private_events: inventory.expected_private_events,
        expected_normal_events: inventory.expected_normal_events,
        synthetic_exclusions: inventory.synthetic_exclusions,
        inventory_sha256: inventory.inventory_sha256,
      },
      content_fence: {
        initial_identity_sha256: initialIdentity,
        final_identity_sha256: finalIdentity,
        full_rows: finalRows.length,
        selected_rows: finalSelected.length,
        excluded_rows: finalRows.length - finalSelected.length,
      },
      counts: inventory.expected_counts,
      records: finalSelected.map(({ kind, id, revision, payload_sha256 }) => ({ kind, id, revision, payload_sha256 })),
      layers: layers.metadata,
      layer_files: layerFiles,
      files,
    };
    manifest.sha256 = sha256(stableSerialize(manifest));
    await writeJson(path.join(stageDir, 'manifest.json'), manifest);
    await validateCaptureImpl(stageDir, { allowStagingDirectory: true });
    const finalName = `v1-${sourceSha.slice(0, 12)}-${manifest.sha256.slice(0, 16)}`;
    const finalDir = path.join(absoluteDir, finalName);
    let finalExists = false;
    try { await lstat(finalDir); finalExists = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (finalExists) {
      const existing = await loadV1Capture(finalDir);
      if (stableSerialize(existing.manifest) !== stableSerialize(manifest)) fail('Existing v1 capture differs from the candidate');
      const candidateFiles = ['manifest.json', 'records.json', ...Object.values(layerFiles).map((layer) => layer.file)];
      for (const file of candidateFiles) {
        const [candidateBytes, existingBytes] = await Promise.all([readFile(path.join(stageDir, file)), readFile(path.join(finalDir, file))]);
        if (!candidateBytes.equals(existingBytes)) fail(`Existing v1 capture bytes differ: ${file}`);
      }
      await rm(stageDir, { recursive: true });
    } else {
      await renameImpl(stageDir, finalDir);
    }
    return { directory: finalDir, manifest };
  } catch (error) {
    await rm(stageDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}

function requireNoForbidden(manifest) {
  for (const key of FORBIDDEN) if (Object.hasOwn(manifest, key)) fail(`V1 capture must not contain invented ${key}`);
}

export async function loadV1Capture(snapshotPath, { allowStagingDirectory = false } = {}) {
  if (typeof snapshotPath !== 'string' || !snapshotPath) fail('Explicit v1 capture directory required');
  const requested = path.resolve(snapshotPath);
  await assertNoSymlinkComponents(requested);
  const stat = await lstat(requested);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('V1 capture path must be a real directory');
  const root = await realpath(requested);
  const manifestBytes = await readFile(path.join(root, 'manifest.json'));
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); }
  catch { fail('V1 capture manifest is not valid JSON'); }
  requireRecord(manifest, 'V1 capture manifest must be an object');
  requireNoForbidden(manifest);
  if (manifest.schema_version !== 1 || manifest.format !== FORMAT || manifest.source !== 'supabase-v1' ||
    manifest.exporter_version !== 1 || typeof manifest.source_sha !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.source_sha) ||
    !/^[0-9a-f]{64}$/i.test(manifest.api_vendor_manifest_sha256 || '') || !/^[0-9a-f]{64}$/i.test(manifest.sha256 || '') ||
    typeof manifest.captured_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(manifest.captured_at) ||
    !isRecord(manifest.inventory) || !isRecord(manifest.content_fence) || !isRecord(manifest.counts) ||
    !Array.isArray(manifest.records) || !Array.isArray(manifest.layers) || !isRecord(manifest.layer_files) || !isRecord(manifest.files)) {
    fail('V1 capture manifest is incomplete or unsupported');
  }
  const expectedSha = manifest.sha256;
  const unhashed = { ...manifest };
  delete unhashed.sha256;
  if (sha256(stableSerialize(unhashed)) !== expectedSha) fail('V1 capture manifest checksum mismatch');
  const expectedName = `v1-${manifest.source_sha.slice(0, 12)}-${expectedSha.slice(0, 16)}`;
  const basename = path.basename(root);
  if (allowStagingDirectory ? !/^\.staging-[0-9a-f-]{36}$/i.test(basename) : basename !== expectedName) fail('V1 capture directory identity mismatch');
  if (manifest.content_fence.initial_identity_sha256 !== manifest.content_fence.final_identity_sha256) fail('V1 capture fence did not match');
  if (manifest.content_fence.full_rows - manifest.content_fence.selected_rows !== manifest.inventory.synthetic_exclusions.length) fail('V1 capture exclusion count mismatch');
  if (Object.keys(manifest.counts).length !== CONTENT_KINDS.length) fail('V1 capture counts are malformed');
  for (const kind of CONTENT_KINDS) if (manifest.counts[kind] !== manifest.inventory.expected_counts?.[kind]) fail(`V1 capture ${kind} count differs from inventory`);
  if (manifest.records.length !== manifest.inventory.expected_total) fail('V1 capture record count differs from inventory');
  if (sourceIdentityDigest(manifest.records) !== manifest.inventory.expected_identity_sha256) fail('V1 capture selected identity differs from inventory');
  const expected = new Set(manifest.inventory.synthetic_exclusions.map((row) => `${row.kind}\0${row.id}`));
  for (const row of manifest.records) {
    if (!isRecord(row) || !CONTENT_KINDS.includes(row.kind) || typeof row.id !== 'string' || !/^[1-9][0-9]*$/.test(row.revision) || !/^[0-9a-f]{64}$/i.test(row.payload_sha256)) fail('V1 capture record metadata is malformed');
    if (expected.has(`${row.kind}\0${row.id}`)) fail('Synthetic exclusion leaked into selected records');
  }
  const recordBytes = await readFile(path.join(root, 'records.json'));
  if (manifest.files['records.json']?.sha256 !== sha256(recordBytes) || manifest.files['records.json']?.bytes !== recordBytes.length) fail('V1 capture records checksum mismatch');
  let grouped;
  try { grouped = JSON.parse(recordBytes.toString('utf8')); }
  catch { fail('V1 capture records are not valid JSON'); }
  requireRecord(grouped, 'V1 capture records must be an object');
  if (Object.keys(grouped).length !== CONTENT_KINDS.length) fail('V1 capture records kind set mismatch');
  const selectedMap = new Map(manifest.records.map((row) => [`${row.kind}\0${row.id}`, row]));
  const rows = [];
  for (const kind of CONTENT_KINDS) {
    if (!Array.isArray(grouped[kind]) || grouped[kind].length !== manifest.counts[kind]) fail(`V1 capture ${kind} rows mismatch`);
    for (const row of grouped[kind]) {
      if (!isRecord(row) || row.kind !== kind || typeof row.id !== 'string' || !isRecord(row.payload) || row.payload.id !== row.id ||
        typeof row.revision !== 'string' || !/^[1-9][0-9]*$/.test(row.revision)) fail(`V1 capture ${kind} row is malformed`);
      const meta = selectedMap.get(`${kind}\0${row.id}`);
      if (!meta || meta.revision !== row.revision || meta.payload_sha256 !== sha256(stableSerialize(row.payload))) fail(`V1 capture ${kind}/${row.id} payload/revision mismatch`);
      if (kind === 'event') assertPublicPrivateEvent(row.payload);
      rows.push(row);
    }
  }
  const layers = Object.create(null);
  const expectedFiles = new Set(['manifest.json', 'records.json']);
  const expectedDirs = new Set(['layers']);
  if (manifest.layers.length !== manifest.inventory.expected_counts.layer) fail('V1 capture layer count mismatch');
  for (const layer of manifest.layers) {
    const meta = manifest.layer_files[layer.id];
    if (!isRecord(meta) || !['stored', 'events'].includes(layer.mode) || layer.mode !== meta.mode ||
      !Number.isSafeInteger(layer.feature_count) || layer.feature_count < 0 ||
      layer.output_feature_count !== meta.output_feature_count || !/^[0-9a-f]{64}$/i.test(meta.sha256 || '') ||
      !Number.isSafeInteger(meta.bytes) || meta.bytes < 0) fail(`V1 capture layer ${layer.id} metadata is malformed`);
    const bytes = await readFile(path.join(root, meta.file));
    if (sha256(bytes) !== meta.sha256 || bytes.length !== meta.bytes) fail(`V1 capture layer ${layer.id} checksum mismatch`);
    let collection;
    try { collection = JSON.parse(bytes.toString('utf8')); }
    catch { fail(`V1 capture layer ${layer.id} is not valid JSON`); }
    validateFeatureCollection(collection, layer.id);
    if (collection.features.length !== layer.output_feature_count) fail(`V1 capture layer ${layer.id} output count mismatch`);
    if (layer.mode === 'stored' && collection.features.length !== layer.feature_count) fail(`V1 capture stored layer ${layer.id} count mismatch`);
    layers[layer.id] = collection;
    expectedFiles.add(meta.file);
  }
  const events = rows.filter((row) => row.kind === 'event').map((row) => row.payload);
  const derived = deriveEventLocations(events);
  const eventLayer = manifest.layers.find((layer) => layer.mode === 'events');
  if (!eventLayer || eventLayer.feature_count !== derived.eligibleCount) fail('V1 capture event layer eligible count mismatch');
  const expectedStored = manifest.layers.filter((layer) => layer.mode === 'stored').reduce((sum, layer) => sum + layer.feature_count, 0);
  const expectedEvents = manifest.layers.filter((layer) => layer.mode === 'events').reduce((sum, layer) => sum + layer.feature_count, 0);
  if (expectedStored !== manifest.inventory.expected_features.stored || expectedEvents !== manifest.inventory.expected_features.event_locations) fail('V1 capture feature totals mismatch');
  const actualFiles = new Set();
  const actualDirs = new Set();
  async function visit(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) fail('V1 capture cannot contain symbolic links');
      if (entry.isDirectory()) { actualDirs.add(rel); await visit(path.join(dir, entry.name), rel); }
      else if (entry.isFile()) actualFiles.add(rel);
      else fail('V1 capture contains an unsupported entry');
    }
  }
  await visit(root);
  if (actualFiles.size !== expectedFiles.size || [...actualFiles].some((file) => !expectedFiles.has(file)) ||
    actualDirs.size !== expectedDirs.size || [...actualDirs].some((dir) => !expectedDirs.has(dir))) fail('V1 capture contains unlisted or missing files');
  return { directory: root, manifest, records: grouped, layers };
}
