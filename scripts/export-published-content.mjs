import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, open, readFile, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCivicPulseClient } from '../src/vendor/civicpulse-api-publication-local/client.mjs';
import { assertPublicPrivateEvent } from '../src/lib/private-event-policy.mjs';
import { deriveEventLocations } from '../src/lib/event-geojson.mjs';
import { loadPinnedSnapshot } from './read-pinned-snapshot.mjs';
import { CONTENT_KINDS, sha256, stableSerialize } from './snapshot-integrity.mjs';

const PAGE_SIZE = 100;
const LAYER_PAGE_SIZE = 500;
const MAX_ATTEMPTS = 3;
const API_COMMIT = 'e9c9c621f43864f8fc90eaefacc4c0a223f50680';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function assertNoSymlinkComponents(directory) {
  const parsed = path.parse(directory);
  let current = parsed.root;
  for (const part of directory.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let metadata;
    try { metadata = await lstat(current); }
    catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    if (metadata.isSymbolicLink()) throw new Error('Snapshot root path cannot contain symbolic links');
    if (!metadata.isDirectory()) throw new Error('Snapshot root path components must be directories');
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateManifest(value) {
  if (!isRecord(value) || value.schema_version !== 1 || typeof value.dataset_epoch !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.dataset_epoch) ||
    typeof value.generation !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value.generation) ||
    value.bootstrap_complete !== true || !isRecord(value.counts) || !Array.isArray(value.records) || !Array.isArray(value.layers)) {
    throw new Error('Publication manifest is malformed or bootstrap is incomplete');
  }
  if (Object.keys(value.counts).length !== CONTENT_KINDS.length) throw new Error('Manifest must contain exactly five kind counts');
  for (const kind of CONTENT_KINDS) {
    if (!Number.isSafeInteger(value.counts[kind]) || value.counts[kind] < 0) throw new Error(`Invalid manifest count for ${kind}`);
  }
  const inventory = new Set();
  let previous = null;
  const recordLayers = new Map();
  for (const item of value.records) {
    if (!isRecord(item) || !CONTENT_KINDS.includes(item.kind) || typeof item.id !== 'string' || !item.id ||
      typeof item.revision !== 'string' || !/^[1-9][0-9]*$/.test(item.revision)) throw new Error('Malformed manifest record inventory');
    const tuple = `${item.kind}\0${item.id}`;
    if (inventory.has(tuple) || (previous && (cCompare(item.kind, previous.kind) < 0 ||
      (item.kind === previous.kind && cCompare(item.id, previous.id) <= 0)))) {
      throw new Error('Manifest record inventory is duplicate or not C-sorted');
    }
    inventory.add(tuple);
    previous = item;
    if (item.kind === 'layer') recordLayers.set(item.id, item.revision);
  }
  for (const kind of CONTENT_KINDS) {
    if (value.records.filter(item => item.kind === kind).length !== value.counts[kind]) throw new Error(`Manifest inventory count mismatch for ${kind}`);
  }
  if (value.layers.length !== recordLayers.size) throw new Error('Manifest layer inventory does not match layer records');
  let previousLayer = null;
  for (const layer of value.layers) {
    if (!isRecord(layer) || typeof layer.id !== 'string' || !layer.id || typeof layer.revision !== 'string' ||
      !/^[1-9][0-9]*$/.test(layer.revision) || !['stored', 'events'].includes(layer.mode) ||
      !Number.isSafeInteger(layer.feature_count) || layer.feature_count < 0 || !recordLayers.has(layer.id) ||
      recordLayers.get(layer.id) !== layer.revision || (previousLayer && cCompare(layer.id, previousLayer) <= 0)) {
      throw new Error('Malformed manifest layer inventory');
    }
    previousLayer = layer.id;
  }
  if (CONTENT_KINDS.every(kind => value.counts[kind] === 0)) {
    throw new Error('All-empty snapshot requires an exact operator approval contract, which is not available');
  }
  return value;
}

function sameManifest(a, b) {
  return stableSerialize(a) === stableSerialize(b);
}

function cCompare(a, b) {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

async function fetchRecords(api, manifest) {
  const all = [];
  for (const kind of CONTENT_KINDS) {
    const expected = manifest.records.filter(item => item.kind === kind);
    const rows = [];
    for (let offset = 0; offset < expected.length || (expected.length === 0 && offset === 0);) {
      const page = await api.listPublished(kind, { limit: PAGE_SIZE, offset });
      if (!Array.isArray(page)) throw new Error(`Published ${kind} page is not an array`);
      const needed = expected.length - rows.length;
      const expectedPageSize = Math.min(PAGE_SIZE, Math.max(needed, 0));
      if (page.length !== expectedPageSize) throw new Error(`Published ${kind} page is incomplete or contains extra rows`);
      rows.push(...page);
      if (expected.length === 0 || rows.length === expected.length) break;
      offset += page.length;
      if (page.length === 0) throw new Error(`Published ${kind} pagination did not advance`);
    }
    const expectedById = new Map(expected.map(item => [item.id, item.revision]));
    const seen = new Set();
    for (const row of rows) {
      if (!isRecord(row) || row.kind !== kind || typeof row.id !== 'string' || !isRecord(row.payload) ||
        row.payload.id !== row.id || !Number.isSafeInteger(row.revision) || row.revision < 1) {
        throw new Error(`Malformed published ${kind} record`);
      }
      if (seen.has(row.id) || expectedById.get(row.id) !== String(row.revision)) throw new Error(`Published ${kind} inventory differs from manifest`);
      seen.add(row.id);
      all.push({ ...row, revision: String(row.revision) });
    }
    if (seen.size !== expected.length) throw new Error(`Published ${kind} inventory is missing records`);
  }
  all.sort((a, b) => cCompare(a.kind, b.kind) || cCompare(a.id, b.id));
  return all;
}

function validateFeatureCollection(value, layerId) {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error(`Layer ${layerId} returned an invalid FeatureCollection`);
  }
  for (const feature of value.features) {
    if (!isRecord(feature) || feature.type !== 'Feature' || !('geometry' in feature) || !isRecord(feature.properties)) {
      throw new Error(`Layer ${layerId} contains an invalid feature`);
    }
  }
}

async function fetchStoredLayer(api, layer) {
  const features = [];
  let offset = 0;
  for (;;) {
    const page = await api.layerGeoJSON(layer.id, { limit: LAYER_PAGE_SIZE, offset });
    validateFeatureCollection(page, layer.id);
    if (page.features.length > LAYER_PAGE_SIZE) throw new Error(`Layer ${layer.id} page exceeds requested limit`);
    if (features.length + page.features.length > layer.feature_count) throw new Error(`Layer ${layer.id} running count exceeds manifest`);
    features.push(...page.features);
    if (!Number.isSafeInteger(page.nextOffset) && page.nextOffset !== null) throw new Error(`Layer ${layer.id} has an invalid nextOffset`);
    if (page.nextOffset === null) break;
    if (page.nextOffset !== offset + page.features.length || page.nextOffset <= offset || page.features.length === 0) {
      throw new Error(`Layer ${layer.id} pagination did not advance exactly`);
    }
    offset = page.nextOffset;
  }
  if (features.length !== layer.feature_count) throw new Error(`Layer ${layer.id} feature count differs from manifest`);
  return { type: 'FeatureCollection', features };
}

async function fetchLayers(api, manifest, records) {
  const events = records.filter(row => row.kind === 'event').map(row => row.payload);
  const output = new Map();
  for (const layer of manifest.layers) {
    if (layer.mode === 'stored') output.set(layer.id, await fetchStoredLayer(api, layer));
    else {
      const derived = deriveEventLocations(events);
      if (derived.eligibleCount !== layer.feature_count) throw new Error(`Event layer ${layer.id} eligible count differs from manifest`);
      output.set(layer.id, derived.collection);
    }
  }
  return output;
}

async function writeJson(file, value) {
  const bytes = `${stableSerialize(value)}\n`;
  await writeFile(file, bytes, { flag: 'wx' });
  return { sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) };
}

function serializePublicRecords(records) {
  const grouped = Object.fromEntries(CONTENT_KINDS.map(kind => [kind, []]));
  for (const row of records) {
    if (row.kind === 'event') {
      if (Object.hasOwn(row.payload, 'addressPrivate') && typeof row.payload.addressPrivate !== 'boolean') {
        throw new Error(`Event ${row.id} has an invalid addressPrivate flag`);
      }
      assertPublicPrivateEvent(row.payload);
    }
    grouped[row.kind].push(row);
  }
  return grouped;
}

async function activateCandidate({ snapshotsDir, api, vendorManifestSha256, sourceSha, renameImpl, validateSnapshotImpl }) {
  const stageDir = path.join(snapshotsDir, `.staging-${randomUUID()}`);
  await mkdir(stageDir, { recursive: false });
  try {
    const manifestA = validateManifest(await api.publicationManifest());
    const records = await fetchRecords(api, manifestA);
    const layers = await fetchLayers(api, manifestA, records);
    const manifestB = validateManifest(await api.publicationManifest());
    if (!sameManifest(manifestA, manifestB)) throw new Error('Publication manifest changed during export');

    const apiManifestHash = sha256(stableSerialize(manifestA));
    const files = {};
    files['records.json'] = await writeJson(path.join(stageDir, 'records.json'), serializePublicRecords(records));
    await mkdir(path.join(stageDir, 'layers'));
    const layerFiles = Object.create(null);
    for (const layer of manifestA.layers) {
      const fileName = `${sha256(layer.id).slice(0, 24)}.geojson`;
      const rel = `layers/${fileName}`;
      const collection = layers.get(layer.id);
      layerFiles[layer.id] = {
        file: rel, mode: layer.mode, manifest_feature_count: layer.feature_count,
        output_feature_count: collection.features.length,
        ...await writeJson(path.join(stageDir, rel), collection),
      };
    }
    const snapshotManifest = {
      schema_version: 1,
      source: 'supabase',
      exporter_version: 2,
      api_commit: API_COMMIT,
      bootstrap_complete: true,
      api_vendor_manifest_sha256: vendorManifestSha256,
      source_sha: sourceSha,
      api_manifest_sha256: apiManifestHash,
      dataset_epoch: manifestA.dataset_epoch,
      generation: manifestA.generation,
      counts: manifestA.counts,
      records: manifestA.records,
      layers: manifestA.layers,
      layer_files: layerFiles,
      files,
    };
    snapshotManifest.sha256 = sha256(stableSerialize(snapshotManifest));
    const finalName = `${manifestA.dataset_epoch}-${manifestA.generation}-${snapshotManifest.sha256}`;
    const finalDir = path.join(snapshotsDir, finalName);
    await writeJson(path.join(stageDir, 'manifest.json'), snapshotManifest);
    await validateSnapshotImpl(stageDir, { allowStagingDirectory: true });
    let finalExists = false;
    try {
      await lstat(finalDir);
      finalExists = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (finalExists) {
      const existing = await loadPinnedSnapshot(finalDir);
      if (stableSerialize(existing.manifest) !== stableSerialize(snapshotManifest)) {
        throw new Error('Existing immutable snapshot differs from the candidate');
      }
      const candidateFiles = ['manifest.json', 'records.json', ...Object.values(layerFiles).map(layer => layer.file)];
      for (const file of candidateFiles) {
        const [candidateBytes, existingBytes] = await Promise.all([
          readFile(path.join(stageDir, file)), readFile(path.join(finalDir, file)),
        ]);
        if (!candidateBytes.equals(existingBytes)) throw new Error(`Existing immutable snapshot bytes differ: ${file}`);
      }
      await rm(stageDir, { recursive: true });
    } else {
      await renameImpl(stageDir, finalDir);
    }
    const pointerTemp = path.join(snapshotsDir, `.active-${randomUUID()}.tmp`);
    try {
      // Validate the immutable final path with the exact pinned-reader rules a
      // build will use before making it active.
      await validateSnapshotImpl(finalDir);
      const pointer = { source: 'supabase', directory: finalName, manifest_sha256: snapshotManifest.sha256 };
      await writeFile(pointerTemp, `${stableSerialize(pointer)}\n`, { flag: 'wx' });
      await renameImpl(pointerTemp, path.join(snapshotsDir, 'active-snapshot.json'));
      return { directory: finalDir, pointer, manifest: snapshotManifest };
    } catch (error) {
      await rm(pointerTemp, { force: true }).catch(() => {});
      if (!finalExists) await rm(finalDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  } catch (error) {
    await rm(stageDir, { recursive: true, force: true });
    throw error;
  }
}

export async function exportPublishedSnapshot({
  api, snapshotsDir, sourceMode, vendorManifestSha256, sourceSha,
  renameImpl = rename, validateSnapshotImpl = loadPinnedSnapshot,
}) {
  if (sourceMode !== 'supabase') throw new Error('Snapshot export requires explicit PUBLIC_CONTENT_SOURCE=supabase');
  if (!api || typeof api.publicationManifest !== 'function' || typeof api.listPublished !== 'function' || typeof api.layerGeoJSON !== 'function') {
    throw new Error('Snapshot export requires the publication-v1 API client');
  }
  if (!/^[0-9a-f]{64}$/i.test(vendorManifestSha256 || '')) throw new Error('Snapshot export requires a pinned API vendor manifest hash');
  if (!/^[0-9a-f]{40}$/i.test(sourceSha || '')) throw new Error('Snapshot source SHA must be a full commit hash');
  const requestedDir = path.resolve(snapshotsDir);
  await assertNoSymlinkComponents(requestedDir);
  await mkdir(requestedDir, { recursive: true });
  const rootInfo = await lstat(requestedDir);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('Snapshot root must be a real directory');
  const absoluteDir = await realpath(requestedDir);
  if (absoluteDir !== requestedDir) throw new Error('Snapshot root path cannot traverse a symbolic link');

  const lockPath = path.join(absoluteDir, '.export.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
    await lock.writeFile(`${process.pid}\n`);
  } catch (error) {
    await lock?.close().catch(() => {});
    if (error.code === 'EEXIST') throw new Error('Another snapshot export is active or requires lock recovery');
    throw error;
  }
  try {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await activateCandidate({ snapshotsDir: absoluteDir, api, vendorManifestSha256, sourceSha, renameImpl, validateSnapshotImpl });
      } catch (error) {
        lastError = error;
        if (!String(error.message).includes('manifest changed during export') || attempt === MAX_ATTEMPTS) throw error;
      }
    }
    throw lastError;
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

async function main() {
  const sourceMode = process.env.PUBLIC_CONTENT_SOURCE;
  if (sourceMode !== 'supabase') throw new Error('Set PUBLIC_CONTENT_SOURCE=supabase explicitly to export a published snapshot');
  const url = process.env.PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY are required');
  let sourceSha = process.env.GITHUB_SHA || process.env.CIVICPULSE_SOURCE_SHA;
  if (process.env.GITHUB_ACTIONS === 'true') {
    if (process.env.GITHUB_REF !== 'refs/heads/main' || !process.env.GITHUB_SHA) {
      throw new Error('GitHub Actions snapshot export is restricted to a main-branch commit');
    }
    const checkoutSha = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    if (checkoutSha !== process.env.GITHUB_SHA) throw new Error('Runner checkout does not match GITHUB_SHA');
    sourceSha = process.env.GITHUB_SHA;
  }
  if (!/^[0-9a-f]{40}$/i.test(sourceSha || '')) throw new Error('A full source commit SHA is required for snapshot export');
  const vendorDir = path.join(root, 'src/vendor/civicpulse-api-publication-local');
  const vendorManifest = JSON.parse(await readFile(path.join(vendorDir, 'manifest.json'), 'utf8'));
  if (vendorManifest.contract !== 'civicpulse-content-api-v1+publication-v1-local') throw new Error('Unexpected pinned API vendor contract');
  for (const [file, expected] of Object.entries(vendorManifest.files || {})) {
    const actual = sha256(await readFile(path.join(vendorDir, file)));
    if (actual !== expected.sha256) throw new Error(`Pinned API vendor checksum mismatch: ${file}`);
  }
  const vendorManifestSha256 = sha256(stableSerialize(vendorManifest));
  const api = createCivicPulseClient({ url, publishableKey });
  const result = await exportPublishedSnapshot({
    api, snapshotsDir: path.join(root, '.civicpulse/snapshots'),
    sourceMode, vendorManifestSha256, sourceSha,
  });
  process.stdout.write(`Activated immutable local snapshot ${result.pointer.directory} (${result.manifest.generation}).\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Published content export failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
