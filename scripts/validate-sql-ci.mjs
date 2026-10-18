// Test-only orchestration. Never accepts a hosted DB URL, credential or uploader.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const apiSha = 'c11e6fd69a90c7884a2763aa843d28fd7ce93114';
export const image = 'docker.io/postgis/postgis@sha256:7ef699637304feff96028edbc7a653e135f2db2236d322b5cb2bfca11fd920bc';
const imageAlias = 'docker.io/postgis/postgis:16-3.5';
const container = 'civicpulse-api-db-test';
const root = fileURLToPath(new URL('../', import.meta.url));
function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 25 * 60_000, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`CI command failed: ${binary} (${result.signal || result.status})`);
  return result.stdout?.trim() || '';
}
// The caller must supply an exact clean checkout, not an installed sibling API.
export function validateApiDirectory(directory, run = command) {
  if (!directory) throw new Error('Explicit pinned API test checkout required');
  const api = realpathSync(directory);
  if (run('git', ['rev-parse', 'HEAD'], { cwd: api }) !== apiSha) throw new Error('API fixture commit mismatch');
  if (run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: api })) throw new Error('API fixture tracked files are dirty');
  return api;
}
export async function withFreshDatabase(task, run = command, delay = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  // Never remove an existing host container, even when its name matches.
  const exists = run('podman', ['ps', '-a', '--filter', `name=^${container}$`, '--format', '{{.ID}}']);
  if (exists) throw new Error('Existing test container must not be replaced');
  const pin = JSON.parse(run('podman', ['image', 'inspect', image]))[0];
  if (pin.Os !== 'linux' || pin.Architecture !== 'amd64' || !pin.RepoDigests?.includes(image)) throw new Error('Pinned PostGIS image/platform unavailable');
  // The frozen API guard expects this exact local image name. It is an alias
  // to verified immutable bytes, not a registry tag pull or trust decision.
  run('podman', ['tag', image, imageAlias]);
  const alias = JSON.parse(run('podman', ['image', 'inspect', imageAlias]))[0];
  if (alias.Id !== pin.Id) throw new Error('PostGIS alias does not bind pinned image');
  const owner = randomUUID();
  let attempted = false;
  try {
    attempted = true;
    run('podman', ['run', '-d', '--pull=never', '--platform=linux/amd64', '--name', container,
      '--label', `io.civicpulse.ci-owner=${owner}`, '--network=none', '--read-only',
      '--tmpfs', '/var/lib/postgresql/data:rw', '--tmpfs', '/var/run/postgresql:rw', '--tmpfs', '/tmp:rw',
      '-e', 'POSTGRES_PASSWORD=disposable-test-only', imageAlias]);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        // The entrypoint's TEMPORARY init server also accepts connections.
        // Wait until PID 1 has exec'd the final server before probing SQL.
        if (run('podman', ['exec', container, 'cat', '/proc/1/comm']) !== 'postgres') throw new Error('PostgreSQL initialization pending');
        run('podman', ['exec', container, 'pg_isready', '-U', 'postgres']); ready = true; break;
      } catch { await delay(500); }
    }
    if (!ready) throw new Error('Disposable PostgreSQL readiness timeout');
    await task();
  } finally {
    if (attempted) {
      // Reconcile even an uncertain `run` result, but only remove the exact
      // container carrying OUR random ownership label. No wildcard cleanup.
      const owned = run('podman', ['ps', '-a', '--filter', `label=io.civicpulse.ci-owner=${owner}`, '--format', '{{.ID}}']);
      if (owned) {
        if (!/^[0-9a-f]{12,64}$/.test(owned)) throw new Error('Ambiguous owned container cleanup; manual inspection required');
        run('podman', ['rm', '--force', owned]);
      }
    }
  }
}
async function main() {
  const api = validateApiDirectory(process.env.CIVICPULSE_CI_API_DIRECTORY);
  const webEnv = Object.fromEntries(['PATH', 'HOME', 'LANG', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'TMPDIR'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  const steps = [
    () => command(process.execPath, ['--import', 'tsx', 'scripts/test-db.mjs'], { cwd: api, env: webEnv, stdio: 'inherit' }),
    () => command(process.execPath, ['scripts/test-publication-fixture.mjs'], { cwd: api, env: webEnv, stdio: 'inherit' }),
    () => command(process.execPath, ['tests/m1-sql-to-artifact.mjs'], { cwd: root, env: { ...webEnv, CIVICPULSE_M1_FIXTURE_DIRECTORY: api }, stdio: 'inherit' }),
  ];
  for (const [index, task] of steps.entries()) {
    console.log(`Sequential SQL CI harness ${index + 1}/${steps.length}: fresh offline pinned container`);
    await withFreshDatabase(task);
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
