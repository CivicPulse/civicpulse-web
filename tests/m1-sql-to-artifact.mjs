// Explicit integration command, never imported by a production build/runner.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, readFile, writeFile, readdir, cp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCivicPulseClient } from '../src/vendor/civicpulse-api-publication-local/client.mjs';
import { exportPublishedSnapshot } from '../scripts/export-published-content.mjs';
import { buildCmsArtifact } from '../scripts/build-cms-artifact.mjs';
import { materializePinnedSnapshot } from '../scripts/materialize-pinned-snapshot.mjs';
import { sha256, stableSerialize } from '../scripts/snapshot-integrity.mjs';

const repository = process.env.CIVICPULSE_WEB_GIT_REPOSITORY || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = process.env.CIVICPULSE_M1_FIXTURE_DIRECTORY;
if (!fixtureDirectory) throw new Error('Explicit frozen external API fixture directory required; no hosted fallback');
const sourceSha = process.env.CIVICPULSE_WEB_SOURCE_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
const root = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-m1-artifacts-'));
const vendorBytes = await readFile(path.join(repository, 'src/vendor/civicpulse-api-publication-local/manifest.json'));
const fixture = spawn(process.execPath, ['scripts/serve-publication-fixture.mjs'], {
  cwd: fixtureDirectory, stdio: ['pipe', 'pipe', 'inherit'],
  env: Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'HOME', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'LANG'].includes(key))),
});
const pending = new Map();
let readyResolve, readyReject;
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
const lines = createInterface({ input: fixture.stdout });
lines.on('line', line => {
  if (line.length > 1024 * 1024) { readyReject(new Error('Fixture protocol line too large')); return; }
  let value;
  try { value = JSON.parse(line); } catch { readyReject(new Error('Invalid fixture protocol')); return; }
  if (value.type === 'ready') readyResolve(value);
  else if (value.type === 'error') { const error = new Error(`Fixture error: ${value.code}`); pending.get(value.id)?.reject(error); readyReject(error); }
  else if (value.type === 'result') pending.get(value.id)?.resolve(value);
});
fixture.on('error', readyReject);
fixture.on('exit', code => { if (code) { const error = new Error(`Fixture exited ${code}`); readyReject(error); for (const item of pending.values()) item.reject(error); } });
let number = 0;
function command(command) {
  const id = `web-${++number}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Fixture IPC timeout; do not replay automatically')); }, 90_000);
    pending.set(id, { resolve: value => { clearTimeout(timer); pending.delete(id); resolve(value); }, reject: error => { clearTimeout(timer); pending.delete(id); reject(error); } });
    fixture.stdin.write(`${JSON.stringify({ id, command })}\n`);
  });
}
async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await files(path.join(root, entry.name), `${name}/`));
    else result.push({ path: name, sha256: sha256(await readFile(path.join(root, entry.name))) });
  }
  return result.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
}
async function failureSource(name, postbuild) {
  const directory = path.join(root, name);
  await import('node:fs/promises').then(fs => fs.mkdir(directory));
  const archive = execFileSync('git', ['archive', '--format=tar', sourceSha], { cwd: repository, maxBuffer: 128 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', directory], { input: archive });
  const packagePath = path.join(directory, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  pkg.scripts.postbuild = 'node scripts/m1-failure.mjs';
  await writeFile(packagePath, JSON.stringify(pkg));
  await writeFile(path.join(directory, 'scripts/m1-failure.mjs'), postbuild);
  execFileSync('git', ['init', '-q'], { cwd: directory });
  execFileSync('git', ['add', '.'], { cwd: directory });
  execFileSync('git', ['-c', 'user.name=M1 Fixture', '-c', 'user.email=m1@example.invalid', 'commit', '-qm', name], { cwd: directory });
  return { repository: directory, sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim() };
}
const localRecordIds = new Set();
const localPositiveIds = [];
for (const name of ['events', 'mgdsa-events', 'mgrls-events', 'bcsd-events', 'mobilize-events']) {
  const rows = JSON.parse(execFileSync('git', ['show', `${sourceSha}:src/data/${name}.json`], { cwd: repository, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  for (const row of rows) localRecordIds.add(row.id);
  if (name !== 'events') localPositiveIds.push(rows[0].id);
}
const localMapSentinels = new Set();
for (const name of ['education-transit', 'election-districts']) {
  const snapshot = JSON.parse(execFileSync('git', ['show', `${sourceSha}:src/data/${name}.json`], { cwd: repository, encoding: 'utf8' }));
  for (const row of snapshot.datasets) {
    for (const value of [row.id, row.data, row.sourceUrl]) if (typeof value === 'string') localMapSentinels.add(value);
  }
  if (snapshot.transitFeed) for (const key of ['sourceUrl', 'serviceStart', 'serviceEnd', 'feedVersion']) localMapSentinels.add(snapshot.transitFeed[key]);
}
// These local HTML-only descriptions/links must be omitted, not hidden.
for (const value of ['commission-districts', 'polling-places', 'voting-precincts', 'recreation-centers', 'libraries', 'event-locations', '2025–26', 'https://myride.mbcta.net/', 'https://files.civpulse.org/maps/Macon-Bibb_', 'https://rapid.mbcta.net/']) localMapSentinels.add(value);
function assertNoLocalMapData(bytes, stage, manifest) {
  // A published layer may legitimately retain its original identity. In this
  // fixture the derived event layer is explicitly published as event-locations.
  const publishedIds = new Set(manifest.layers.map(layer => layer.id));
  for (const value of localMapSentinels) {
    if (publishedIds.has(value)) continue;
    assert.equal(bytes.includes(value), false, `${stage} retained local map sentinel ${value}`);
  }
}
let started = false;
try {
  const timeout = setTimeout(() => readyReject(new Error('Fixture startup timeout')), 120_000);
  const info = await ready.finally(() => clearTimeout(timeout));
  started = true;
  assert.equal(info.schema_version, 1); assert.equal(info.test_only, true); assert.equal(info.owner_bootstrap_fixture, true);
  assert.match(info.url, /^http:\/\/127\.0\.0\.1:\d+$/); assert.equal(info.publishableKey, 'local-m1-fixture-only');
  const api = createCivicPulseClient({ url: info.url, publishableKey: info.publishableKey });
  const snapshotsDir = path.join(root, 'snapshots');
  const exportOptions = { api, snapshotsDir, sourceMode: 'supabase', sourceSha, vendorManifestSha256: sha256(vendorBytes) };
  const a = await exportPublishedSnapshot(exportOptions);
  assert.deepEqual(a.manifest.counts, info.expected.countsA);
  const options = { repository, sourceSha, attemptsDirectory: path.join(root, 'attempts'), dependencyDirectory: path.join(repository, 'node_modules') };
  const builtA = await buildCmsArtifact({ ...options, snapshotDirectory: a.directory });
  const retainedA = path.join(root, 'last-good');
  await cp(builtA.artifact, retainedA, { recursive: true });
  const inventoryA = await files(builtA.artifact);
  const bytesA = Buffer.concat(await Promise.all(inventoryA.map(file => readFile(path.join(builtA.artifact, file.path)))));
  for (const sentinel of Object.values(info.expected.sentinels)) assert.ok(bytesA.includes(sentinel), `A valid control missing ${sentinel}`);
  for (const id of localRecordIds) assert.equal(bytesA.includes(id), false, 'A contains an unselected local event record ID');
  assertNoLocalMapData(bytesA, 'A', a.manifest);
  const bReply = await command('advanceB');
  assert.equal(bReply.stage, 'B'); assert.equal(bReply.receipts.length, 3);
  const b = await exportPublishedSnapshot(exportOptions);
  assert.deepEqual(b.manifest.counts, info.expected.countsB);
  const builtB = await buildCmsArtifact({ ...options, snapshotDirectory: b.directory });
  const inventoryB = await files(builtB.artifact);
  assert.equal(builtB.sha256, sha256(stableSerialize({ schema_version: 1, files: builtB.manifest.files })));
  assert.equal((await readFile(path.join(builtB.attempt, 'artifact-manifest.json'), 'utf8')).endsWith('\n'), false);
  // Reuse the ACTUAL A source workspace, including dirty public/dist remnants.
  // Last-good is separately retained and never rebuilt in place.
  const reusedSource = path.dirname(builtA.artifact);
  await writeFile(path.join(reusedSource, 'public/data/stale-fixture.json'), 'M1_DIRTY_PUBLIC_SENTINEL');
  await writeFile(path.join(builtA.artifact, 'stale-fixture.json'), 'M1_DIRTY_DIST_SENTINEL');
  execFileSync('npm', ['run', 'build'], { cwd: reusedSource, env: { PATH: process.env.PATH, HOME: path.join(builtA.attempt, 'home'),
    ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_CONTENT_SOURCE: 'supabase', CIVICPULSE_SNAPSHOT_DIR: b.directory }, stdio: 'pipe', timeout: 120_000 });
  assert.deepEqual(await files(builtA.artifact), inventoryB, 'Dirty/reused B differs from clean B control');
  const bytesB = Buffer.concat(await Promise.all(inventoryB.map(file => readFile(path.join(builtB.artifact, file.path)))));
  for (const sentinel of Object.values(info.expected.sentinels)) assert.equal(bytesB.includes(sentinel), false, `B retained ${sentinel}`);
  for (const id of localRecordIds) assert.equal(bytesB.includes(id), false, 'B contains an unselected local event record ID');
  assertNoLocalMapData(bytesB, 'B', b.manifest);
  const localControl = path.join(root, 'local-control');
  await import('node:fs/promises').then(fs => fs.mkdir(localControl));
  execFileSync('tar', ['-x', '-C', localControl], { input: execFileSync('git', ['archive', sourceSha], { cwd: repository, maxBuffer: 128 * 1024 * 1024 }) });
  await import('node:fs/promises').then(fs => fs.symlink(path.join(repository, 'node_modules'), path.join(localControl, 'node_modules'), 'dir'));
  execFileSync('npm', ['run', 'build'], { cwd: localControl, env: { PATH: process.env.PATH, HOME: path.join(builtB.attempt, 'home'), ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_CONTENT_SOURCE: 'local' }, stdio: 'pipe', timeout: 120_000 });
  const localFiles = await files(path.join(localControl, 'dist'));
  const localBytes = Buffer.concat(await Promise.all(localFiles.map(file => readFile(path.join(localControl, 'dist', file.path)))));
  for (const id of localPositiveIds) assert.ok(localBytes.includes(id), 'Local-mode valid control lost its event records');
  for (const value of localMapSentinels) assert.ok(localBytes.includes(value), `Local-mode positive control missing ${value}`);
  assert.equal(inventoryB.some(file => file.path === `events/${info.expected.ids.event}.ics`), false);
  assert.equal(inventoryB.some(file => file.path === `data/cms/${encodeURIComponent(info.expected.ids.layer)}.geojson`), false);
  assert.deepEqual(await files(retainedA), inventoryA, 'Retained A artifact changed during B build');
  const invalid = path.join(root, 'invalid-snapshot');
  await cp(b.directory, invalid, { recursive: true });
  await writeFile(path.join(invalid, 'records.json'), 'unsafe');
  await assert.rejects(buildCmsArtifact({ ...options, snapshotDirectory: invalid }), /identity|checksum/);
  const blockedData = path.join(root, 'not-a-directory');
  await writeFile(blockedData, 'candidate materialization must fail here');
  await assert.rejects(materializePinnedSnapshot(b.directory, { dataDirectory: blockedData, publicDirectory: path.join(root, 'failed-public') }), /EEXIST|ENOTDIR/);
  for (const [name, script, error] of [
    ['postbuild-failure', "throw new Error('M1 intentional postbuild failure');", /CMS build failed/],
    ['hardlink-failure', "import { linkSync } from 'node:fs'; linkSync('package.json','dist/m1-hardlink.json');", /hardlink rejected/],
  ]) {
    const failedSource = await failureSource(name, script);
    const failedSnapshot = await exportPublishedSnapshot({ ...exportOptions, sourceSha: failedSource.sourceSha });
    await assert.rejects(buildCmsArtifact({ ...options, ...failedSource, snapshotDirectory: failedSnapshot.directory }), error);
  }
  assert.deepEqual(await files(retainedA), inventoryA);
  assert.deepEqual(await files(builtB.artifact), inventoryB);
  // TEST-ONLY transport: a private directory stands in for a receiver. A timeout
  // can occur AFTER bytes changed; it must not be reported as unchanged/live.
  // No transport selector or callback exists in the operational build entrypoint.
  const receiver = path.join(root, 'synthetic-receiver');
  await cp(retainedA, receiver, { recursive: true });
  let syntheticCalls = 0;
  async function syntheticSend(mode) {
    syntheticCalls++;
    if (mode === 'failure') throw new Error('fixture terminal failure');
    await rm(receiver, { recursive: true });
    await cp(builtB.artifact, receiver, { recursive: true });
    if (mode === 'timeout') throw new Error('fixture unknown outcome');
    return { transport: 'fixture-only', outcome: 'success' };
  }
  await assert.rejects(syntheticSend('failure'), /terminal failure/);
  assert.deepEqual(await files(receiver), inventoryA);
  await assert.rejects(syntheticSend('timeout'), /unknown outcome/);
  assert.deepEqual(await files(receiver), inventoryB, 'Timeout does not prove receiver remained at A');
  assert.equal(syntheticCalls, 2, 'No automatic timeout retry');
  assert.equal((await syntheticSend('success')).transport, 'fixture-only');
  assert.deepEqual(await files(receiver), inventoryB);
  let forbiddenSendCalls = 0;
  try {
    await buildCmsArtifact({ ...options, snapshotDirectory: invalid });
    forbiddenSendCalls++;
  } catch (error) { assert.match(error.message, /identity|checksum/); }
  assert.equal(forbiddenSendCalls, 0, 'Invalid build never reaches even the synthetic transport');
  await writeFile(path.join(root, 'evidence.json'), JSON.stringify({ sourceSha, fixtureId: info.fixture_id, countsA: a.manifest.counts, countsB: b.manifest.counts,
    artifactA: builtA.sha256, artifactB: builtB.sha256, receipts: bReply.receipts, scannedLocalRecordIds: localRecordIds.size,
    localControlPositiveIds: localPositiveIds.length, localMapSentinels: [...localMapSentinels], localMapMatchesA: 0, localMapMatchesB: 0, artifactDirectoryA: retainedA, artifactDirectoryB: builtB.artifact,
    localRecordMatchesA: 0, localRecordMatchesB: 0, uploaderCalls: 0, syntheticTransportCalls: syntheticCalls, authority: false }, null, 2));
  console.log(`M1 actual SQL -> normal Astro A/B passed; evidence ${root}`);
} finally {
  if (started && fixture.exitCode === null) await command('close');
  else fixture.stdin.end();
  lines.close();
}
