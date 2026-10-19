/**
 * Explicitly selected, direct-v1 capture then normal static build.
 * No local fallback, no invented generation/bootstrap/manifest, no upload.
 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCivicPulseClient } from '../src/vendor/civicpulse-api/client.mjs';
import { captureV1PublicContent } from './v1-public-capture.mjs';
import { buildCmsArtifact } from './build-cms-artifact.mjs';
import { sha256, stableSerialize } from './snapshot-integrity.mjs';
import { validateApprovedPublicConfig } from './public-supabase-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  if (process.env.PUBLIC_CONTENT_SOURCE !== 'supabase') throw new Error('Explicit PUBLIC_CONTENT_SOURCE=supabase required for v1 API build');
  const url = process.env.PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const inventoryPath = process.env.CIVICPULSE_V1_INVENTORY;
  if (!url || !publishableKey || !inventoryPath) throw new Error('PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY and CIVICPULSE_V1_INVENTORY are required');
  const publicSupabaseConfig = validateApprovedPublicConfig({ url, publishableKey });
  let sourceSha = process.env.CIVICPULSE_SOURCE_SHA || process.env.GITHUB_SHA;
  if (process.env.GITHUB_ACTIONS === 'true') {
    if (process.env.GITHUB_REF !== 'refs/heads/main' || !process.env.GITHUB_SHA) throw new Error('GitHub Actions v1 capture is restricted to a main-branch commit');
    const checkoutSha = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    if (checkoutSha !== process.env.GITHUB_SHA) throw new Error('Runner checkout does not match GITHUB_SHA');
    sourceSha = process.env.GITHUB_SHA;
  }
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('A full lowercase source commit SHA is required');
  const vendorDir = path.join(root, 'src/vendor/civicpulse-api');
  const vendorManifestBytes = await readFile(path.join(vendorDir, 'manifest.json'));
  const vendorManifest = JSON.parse(vendorManifestBytes.toString('utf8'));
  if (vendorManifest.contract !== 'civicpulse-content-api-v1' || !vendorManifest.files) throw new Error('Unexpected pinned v1 API vendor contract');
  for (const [file, expected] of Object.entries(vendorManifest.files)) {
    if (sha256(await readFile(path.join(vendorDir, file))) !== expected.sha256) throw new Error(`Pinned v1 API vendor checksum mismatch: ${file}`);
  }
  const vendorManifestSha256 = sha256(stableSerialize(vendorManifest));
  const api = createCivicPulseClient({ url, publishableKey });
  const capture = await captureV1PublicContent({
    api,
    snapshotsDir: process.env.CIVICPULSE_V1_CAPTURE_ROOT || path.join(root, '.civicpulse/v1-captures'),
    inventoryPath: path.resolve(inventoryPath),
    sourceSha,
    vendorManifestSha256,
  });
  const build = await buildCmsArtifact({
    repository: root, sourceSha, snapshotDirectory: capture.directory,
    attemptsDirectory: path.join(root, '.civicpulse/build-attempts'),
    publicSupabaseConfig,
  });
  process.stdout.write(`${JSON.stringify({
    capture: capture.directory,
    capture_sha256: capture.manifest.sha256,
    inventory_label: capture.manifest.inventory.label,
    counts: capture.manifest.counts,
    content_fence: capture.manifest.content_fence,
    source_sha: sourceSha,
    public_config_sha256: publicSupabaseConfig.config_sha256,
    artifact: build.artifact,
    artifact_sha256: build.sha256,
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write(`V1 API build failed: ${error.message}\n`); process.exitCode = 1; });
}
