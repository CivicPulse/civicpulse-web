// Test-only: capture a supplied real v1 fixture, build the normal static site,
// and run the resident browser suite against the static artifact. No hosted API.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureV1PublicContent } from '../scripts/v1-public-capture.mjs';
import { buildCmsArtifact } from '../scripts/build-cms-artifact.mjs';
import { loadV1Capture } from '../scripts/v1-public-capture.mjs';
import { sha256, stableSerialize } from '../scripts/snapshot-integrity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = process.env.CIVICPULSE_V1_FIXTURE;
if (!fixturePath) throw new Error('CIVICPULSE_V1_FIXTURE must point to a real v1 fixture JSON');
const inventoryPath = path.join(root, 'data/cms-v1-cutover/v1-935-00c472b8.json');
const sourceSha = exec('git', ['rev-parse', 'HEAD']).trim();
const dependencyDirectory = process.env.CIVICPULSE_DEPENDENCY_DIRECTORY;
function exec(program, args, options = {}) {
  const result = spawnSync(program, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
if (!Array.isArray(fixture.records)) throw new Error('Fixture has no records');
const rows = fixture.records;
const api = {
  async listPublished(kind, { limit = 100, offset = 0 } = {}) {
    return rows.filter((row) => row.kind === kind).sort((a, b) => a.id.localeCompare(b.id)).slice(offset, offset + limit).map((row) => ({ ...row }));
  },
  async layerGeoJSON(id, { limit = 500, offset = 0 } = {}) {
    const row = rows.find((entry) => entry.kind === 'layer' && entry.id === id);
    const features = row?.payload?.geojson?.features;
    if (!Array.isArray(features)) return { type: 'FeatureCollection', features: [], nextOffset: null };
    const page = features.slice(offset, offset + limit);
    return { type: 'FeatureCollection', features: page, nextOffset: offset + page.length < features.length ? offset + page.length : null };
  },
};
const vendorManifest = JSON.parse(await readFile(path.join(root, 'src/vendor/civicpulse-api/manifest.json'), 'utf8'));
for (const [file, expected] of Object.entries(vendorManifest.files)) assert.equal(sha256(await readFile(path.join(root, 'src/vendor/civicpulse-api', file))), expected.sha256);
const work = await mkdtemp(path.join(tmpdir(), 'civicpulse-v1-build-'));
let failed = true;
try {
  const capture = await captureV1PublicContent({ api, snapshotsDir: path.join(work, 'captures'), inventoryPath, sourceSha, vendorManifestSha256: sha256(stableSerialize(vendorManifest)) });
  const loaded = await loadV1Capture(capture.directory);
  assert.equal(loaded.manifest.content_fence.selected_rows, 935);
  assert.equal(loaded.manifest.content_fence.excluded_rows, 3);
  const buildOptions = { repository: root, sourceSha, snapshotDirectory: capture.directory, attemptsDirectory: path.join(work, 'attempts') };
  if (dependencyDirectory) buildOptions.dependencyDirectory = dependencyDirectory;
  const built = await buildCmsArtifact(buildOptions);
  const artifact = await realpath(built.artifact);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ics': 'text/calendar' };
  let base = '';
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      let file = path.resolve(artifact, `.${pathname}`);
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      file = await realpath(file);
      if (!file.startsWith(artifact + path.sep)) throw new Error('outside artifact');
      const bytes = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  try {
    const screenshots = path.join(work, 'screens');
    const smokePath = process.env.CIVICPULSE_SMOKE_PATH || path.join(root, 'tests/smoke.mjs');
    const smokeRoot = path.dirname(path.dirname(smokePath));
    const child = spawn(process.execPath, [smokePath], {
      cwd: smokeRoot, stdio: 'inherit', timeout: 300000,
      env: { ...process.env, TEST_BASE_URL: base, TEST_SCREENSHOTS: screenshots, PUBLIC_CONTENT_SOURCE: 'local', CIVICPULSE_CMS_BUILD: '1' },
    });
    const result = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code, signal) => resolve({ code, signal })); });
    assert.equal(result.code, 0, `resident smoke failed (${result.signal || result.code})`);
    const marker = JSON.parse(await readFile(path.join(artifact, 'data/cms-snapshot.json'), 'utf8'));
    assert.equal(marker.format, 'civicpulse-v1-direct-capture');
    assert.equal(marker.capture_sha256, loaded.manifest.sha256);
    process.stdout.write(`V1 fixture build + resident static E2E PASS: ${artifact} (${base})\n`);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  failed = false;
} finally { if (!failed) await rm(work, { recursive: true, force: true }).catch(() => {}); else process.stderr.write(`retained failed build workspace: ${work}\n`); }
