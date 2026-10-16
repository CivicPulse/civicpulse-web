import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicPrivateEvent } from '../src/lib/private-event-policy.mjs';
import { CONTENT_KINDS, sha256, stableSerialize } from './snapshot-integrity.mjs';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

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
    if (metadata.isSymbolicLink()) throw new Error('Pinned snapshot path cannot contain symbolic links');
    if (!metadata.isDirectory()) throw new Error('Pinned snapshot path components must be directories');
  }
}

async function readRegularFile(root, relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) throw new Error('Snapshot manifest contains an unsafe file path');
  const candidate = path.resolve(root, relativePath);
  if (!within(root, candidate)) throw new Error('Snapshot file path escapes the pinned directory');
  const metadata = await lstat(candidate);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('Snapshot files must be regular files, not symlinks');
  const actual = await realpath(candidate);
  if (!within(root, actual)) throw new Error('Snapshot file resolves outside the pinned directory');
  const bytes = await readFile(candidate);
  return bytes;
}

export async function loadPinnedSnapshot(snapshotPath, { allowStagingDirectory = false } = {}) {
  if (typeof snapshotPath !== 'string' || snapshotPath.length === 0) {
    throw new Error('CIVICPULSE_SNAPSHOT_DIR must explicitly pin a snapshot directory');
  }
  const requestedPath = path.resolve(snapshotPath);
  await assertNoSymlinkComponents(requestedPath);
  const directoryStat = await lstat(requestedPath);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('Pinned snapshot path must be a real directory');
  const root = await realpath(requestedPath);
  const manifestBytes = await readRegularFile(root, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); }
  catch { throw new Error('Pinned snapshot manifest is not valid JSON'); }
  if (!isRecord(manifest) || manifest.schema_version !== 1 || manifest.source !== 'supabase' ||
    manifest.bootstrap_complete !== true || manifest.exporter_version !== 2 ||
    manifest.api_commit !== 'e9c9c621f43864f8fc90eaefacc4c0a223f50680' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(manifest.dataset_epoch || '') ||
    !/^(0|[1-9][0-9]*)$/.test(manifest.generation || '') || typeof manifest.source_sha !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.source_sha) ||
    !/^[0-9a-f]{64}$/i.test(manifest.api_manifest_sha256 || '') ||
    !/^[0-9a-f]{64}$/i.test(manifest.api_vendor_manifest_sha256 || '') ||
    !/^[0-9a-f]{64}$/i.test(manifest.sha256 || '')) throw new Error('Pinned snapshot manifest is incomplete or unsupported');
  const expectedManifestSha = manifest.sha256;
  const unhashedManifest = { ...manifest };
  delete unhashedManifest.sha256;
  if (sha256(stableSerialize(unhashedManifest)) !== expectedManifestSha) throw new Error('Pinned snapshot manifest checksum mismatch');
  const expectedName = `${manifest.dataset_epoch}-${manifest.generation}-${manifest.sha256}`;
  const basename = path.basename(root);
  if (allowStagingDirectory ? !/^\.staging-[0-9a-f-]{36}$/i.test(basename) : basename !== expectedName) {
    throw new Error('Pinned snapshot directory identity does not match its manifest');
  }

  if (!isRecord(manifest.counts) || !Array.isArray(manifest.records) || !Array.isArray(manifest.layers) || !isRecord(manifest.files) ||
    !manifest.files['records.json'] || !isRecord(manifest.layer_files)) throw new Error('Pinned snapshot inventory is malformed');
  if (Object.keys(manifest.counts).length !== CONTENT_KINDS.length ||
    CONTENT_KINDS.some(kind => !Number.isSafeInteger(manifest.counts[kind]) || manifest.counts[kind] < 0) ||
    CONTENT_KINDS.every(kind => manifest.counts[kind] === 0)) {
    throw new Error('Pinned snapshot has invalid counts or lacks reviewed nonempty approval');
  }
  const inventory = new Map();
  for (const item of manifest.records) {
    if (!isRecord(item) || !CONTENT_KINDS.includes(item.kind) || typeof item.id !== 'string' ||
      typeof item.revision !== 'string' || !/^[1-9][0-9]*$/.test(item.revision)) throw new Error('Pinned manifest record inventory is malformed');
    const key = `${item.kind}\0${item.id}`;
    if (inventory.has(key)) throw new Error('Pinned manifest contains duplicate record identities');
    inventory.set(key, item.revision);
  }
  for (const kind of CONTENT_KINDS) {
    if (manifest.records.filter(item => item.kind === kind).length !== manifest.counts[kind]) throw new Error('Pinned manifest inventory count mismatch');
  }
  const recordBytes = await readRegularFile(root, 'records.json');
  const recordMeta = manifest.files['records.json'];
  if (recordMeta.sha256 !== sha256(recordBytes) || recordMeta.bytes !== recordBytes.length) throw new Error('Pinned records checksum mismatch');
  let records;
  try { records = JSON.parse(recordBytes.toString('utf8')); }
  catch { throw new Error('Pinned records file is not valid JSON'); }
  stableSerialize(records);
  if (!isRecord(records) || Object.keys(records).length !== CONTENT_KINDS.length ||
    CONTENT_KINDS.some(kind => !Array.isArray(records[kind]) || records[kind].length !== manifest.counts[kind])) {
    throw new Error('Pinned records do not match the manifest counts');
  }
  const rows = CONTENT_KINDS.flatMap(kind => records[kind]);
  if (rows.length !== manifest.records.length) throw new Error('Pinned records do not match the manifest inventory');
  const seen = new Set();
  for (const row of rows) {
    if (!isRecord(row) || !CONTENT_KINDS.includes(row.kind) || typeof row.id !== 'string' || !isRecord(row.payload) ||
      row.payload.id !== row.id || typeof row.revision !== 'string' || !/^[1-9][0-9]*$/.test(row.revision)) {
      throw new Error('Pinned content row is malformed');
    }
    const key = `${row.kind}\0${row.id}`;
    if (seen.has(key)) throw new Error('Pinned content contains duplicate record identity');
    seen.add(key);
    if (inventory.get(key) !== row.revision) throw new Error('Pinned content differs from manifest inventory');
    inventory.delete(key);
    if (row.kind === 'event') {
      if (Object.hasOwn(row.payload, 'addressPrivate') && typeof row.payload.addressPrivate !== 'boolean') {
        throw new Error(`Event ${row.id} has an invalid addressPrivate flag`);
      }
      assertPublicPrivateEvent(row.payload);
    }
  }
  if (inventory.size !== 0) throw new Error('Pinned content is missing manifest records');

  const layers = Object.create(null);
  const expectedFiles = new Set(['manifest.json', 'records.json']);
  const expectedDirectories = new Set(['layers']);
  const layerIds = new Set();
  for (const [id, layerMeta] of Object.entries(manifest.layer_files)) {
    if (!isRecord(layerMeta) || !manifest.layers.some(layer => layer.id === id && layer.mode === layerMeta.mode &&
      layer.feature_count === layerMeta.manifest_feature_count) ||
      !Number.isSafeInteger(layerMeta.output_feature_count) || layerMeta.output_feature_count < 0 ||
      !/^[0-9a-f]{64}$/i.test(layerMeta.sha256 || '') || !Number.isSafeInteger(layerMeta.bytes) || layerMeta.bytes < 0) {
      throw new Error(`Pinned layer metadata is invalid: ${id}`);
    }
    if (layerIds.has(id)) throw new Error(`Duplicate pinned layer: ${id}`);
    layerIds.add(id);
    const bytes = await readRegularFile(root, layerMeta.file);
    if (sha256(bytes) !== layerMeta.sha256 || bytes.length !== layerMeta.bytes) throw new Error(`Pinned layer checksum mismatch: ${id}`);
    let collection;
    try { collection = JSON.parse(bytes.toString('utf8')); }
    catch { throw new Error(`Pinned layer is not valid JSON: ${id}`); }
    stableSerialize(collection);
    if (!isRecord(collection) || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) ||
      collection.features.length !== layerMeta.output_feature_count) throw new Error(`Pinned layer output count mismatch: ${id}`);
    const declared = manifest.layers.find(layer => layer.id === id);
    if (declared.mode === 'stored' && collection.features.length !== declared.feature_count) throw new Error(`Stored layer count mismatch: ${id}`);
    layers[id] = collection;
    expectedFiles.add(layerMeta.file);
  }
  if (Object.keys(manifest.layer_files).length !== manifest.layers.length) throw new Error('Pinned layer files do not match layer inventory');
  const actualFiles = new Set();
  const actualDirectories = new Set();
  async function visit(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error('Pinned snapshot cannot contain symbolic links');
      if (entry.isDirectory()) {
        actualDirectories.add(rel);
        await visit(path.join(dir, entry.name), rel);
      }
      else if (entry.isFile()) actualFiles.add(rel);
      else throw new Error('Pinned snapshot contains an unsupported filesystem entry');
    }
  }
  await visit(root);
  if (actualFiles.size !== expectedFiles.size || [...actualFiles].some(file => !expectedFiles.has(file)) ||
    actualDirectories.size !== expectedDirectories.size || [...actualDirectories].some(dir => !expectedDirectories.has(dir))) {
    throw new Error('Pinned snapshot contains unlisted or missing files');
  }
  return { directory: root, manifest, records, layers };
}

async function main() {
  const snapshotPath = process.env.CIVICPULSE_SNAPSHOT_DIR;
  const snapshot = await loadPinnedSnapshot(snapshotPath);
  process.stdout.write(`Verified pinned snapshot ${path.basename(snapshot.directory)} (${snapshot.manifest.generation}).\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Pinned snapshot validation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
