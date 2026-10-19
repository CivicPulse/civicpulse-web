// Credential-free helper and actual-driver provenance regressions.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { APPROVED_PUBLIC_SUPABASE_URL, validateApprovedPublicConfig } from '../scripts/public-supabase-config.mjs';
import { assertCleanSourceCommit } from '../scripts/v1-build-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Public-only test client configuration. It contains no Auth or service-role authority.
const PUBLIC_TEST_PUBLISHABLE_KEY = 'sb_publishable_RaV0tnG5xJ2sBxFAarnxJg_TpPCL5fA';
const publicConfig = validateApprovedPublicConfig({ url: APPROVED_PUBLIC_SUPABASE_URL, publishableKey: PUBLIC_TEST_PUBLISHABLE_KEY });
assert.equal(publicConfig.config_sha256, '2ed4bfc577c8b63fb94b20332fbb9335a12a3581ea83fe92215c3476f2fbcfc6');

const helperRepo = await mkdtemp(path.join(tmpdir(), 'civicpulse-v1-source-helper-'));
try {
  const git = (...args) => execFileSync('git', args, { cwd: helperRepo, encoding: 'utf8' }).trim();
  git('init'); git('config', 'user.email', 'fixture@example.test'); git('config', 'user.name', 'Fixture');
  await writeFile(path.join(helperRepo, 'tracked.txt'), 'clean\n');
  git('add', 'tracked.txt'); git('commit', '-m', 'fixture'); const head = git('rev-parse', 'HEAD');
  assert.deepEqual(assertCleanSourceCommit({ repository: helperRepo, sourceSha: head }), { head_sha: head, clean: true });
  assert.throws(() => assertCleanSourceCommit({ repository: helperRepo, sourceSha: '0'.repeat(40) }), /HEAD does not match/);
  await writeFile(path.join(helperRepo, 'tracked.txt'), 'dirty\n');
  assert.throws(() => assertCleanSourceCommit({ repository: helperRepo, sourceSha: head }), /clean reviewed source/);
  process.stdout.write('Helper control PASS: clean HEAD accepted; mismatched SHA and dirty tracked source rejected.\n');
} finally { await rm(helperRepo, { recursive: true, force: true }); }

const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const driverSandbox = await mkdtemp(path.join(tmpdir(), 'civicpulse-v1-driver-'));
const gitEnv = {
  PATH: process.env.PATH || '',
  ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
  ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
  GIT_TERMINAL_PROMPT: '0',
};
const runGit = (cwd, ...args) => execFileSync('git', args, { cwd, env: gitEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();
const exists = async (file) => { try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
try {
  const denyNetworkPath = path.join(driverSandbox, 'deny-network.mjs');
  const networkAttemptPath = path.join(driverSandbox, 'network-attempts.log');
  await writeFile(denyNetworkPath, `import { appendFileSync } from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
const require = createRequire(import.meta.url);
const markAndDeny = (name) => (...args) => {
  appendFileSync(process.env.CIVICPULSE_NETWORK_ATTEMPT_FILE, name + '\\n');
  throw new Error('Network denied by v1 provenance test: ' + name);
};
globalThis.fetch = markAndDeny('fetch');
for (const name of ['node:http', 'node:https']) {
  const mod = require(name);
  for (const method of ['request', 'get']) mod[method] = markAndDeny(name + '.' + method);
}
for (const name of ['node:net', 'node:tls']) {
  const mod = require(name);
  for (const method of ['connect', 'createConnection']) if (typeof mod[method] === 'function') mod[method] = markAndDeny(name + '.' + method);
}
const dns = require('node:dns');
for (const method of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'reverse']) if (typeof dns[method] === 'function') dns[method] = markAndDeny('node:dns.' + method);
for (const method of ['lookup', 'resolve', 'resolve4', 'resolve6']) if (typeof dns.promises[method] === 'function') dns.promises[method] = markAndDeny('node:dns.promises.' + method);
syncBuiltinESMExports();
`);
  const preload = pathToFileURL(denyNetworkPath).href;
  const cloneRepo = async (name) => {
    const repo = path.join(driverSandbox, name);
    runGit(driverSandbox, 'clone', '--quiet', '--shared', '--no-checkout', root, repo);
    runGit(repo, 'checkout', '--quiet', '--detach', sourceSha);
    assert.equal(runGit(repo, 'rev-parse', 'HEAD'), sourceSha, 'isolated checkout must be at the source commit');
    assert.equal(runGit(repo, 'status', '--porcelain', '--untracked-files=all'), '', 'isolated checkout starts clean');
    return repo;
  };
  const candidatePaths = (repo) => ({
    capture: path.join(repo, '.civicpulse', 'test-v1-captures'),
    build: path.join(repo, '.civicpulse', 'build-attempts'),
  });
  const assertNoOutputsOrNetwork = async (repo, label) => {
    const candidates = candidatePaths(repo);
    assert.equal(await exists(candidates.capture), false, `${label}: capture candidate directory must not exist`);
    assert.equal(await exists(candidates.build), false, `${label}: build candidate directory must not exist`);
    assert.equal(await exists(networkAttemptPath), false, `${label}: driver attempted network access`);
  };
  const makeEnv = (repo, captureRoot, inventoryPath, source) => ({
    PATH: gitEnv.PATH,
    ...(gitEnv.HOME ? { HOME: gitEnv.HOME } : {}),
    ...(gitEnv.TMPDIR ? { TMPDIR: gitEnv.TMPDIR } : {}),
    NODE_OPTIONS: `--import=${preload}`,
    CIVICPULSE_NETWORK_ATTEMPT_FILE: networkAttemptPath,
    PUBLIC_CONTENT_SOURCE: 'supabase',
    PUBLIC_SUPABASE_URL: APPROVED_PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLIC_TEST_PUBLISHABLE_KEY,
    CIVICPULSE_SOURCE_SHA: source,
    CIVICPULSE_V1_INVENTORY: inventoryPath,
    CIVICPULSE_V1_CAPTURE_ROOT: captureRoot,
  });
  const invokeDriver = (repo, env) => spawnSync(process.execPath, ['scripts/build-cms-v1-from-api.mjs'], {
    cwd: repo, env, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  const assertRejectedBeforeOutput = async (result, repo, label) => {
    assert.equal(result.error, undefined, `${label}: child spawn must succeed`);
    assert.equal(result.signal, null, `${label}: child must not be signalled`);
    assert.notEqual(result.status, 0, `${label}: driver must reject`);
    assert.equal(result.stdout, '', `${label}: rejected driver should produce no candidate result`);
    await assertNoOutputsOrNetwork(repo, label);
  };

  // The clean matching source passes the source gate and reaches inventory loading.
  // loadV1Inventory runs before capture mkdir and before any API content read.
  const cleanRepo = await cloneRepo('clean');
  const cleanCandidates = candidatePaths(cleanRepo);
  const missingInventory = path.join(driverSandbox, 'deliberately-absent-inventory.json');
  assert.equal(await exists(missingInventory), false);
  const cleanResult = invokeDriver(cleanRepo, makeEnv(cleanRepo, cleanCandidates.capture, missingInventory, sourceSha));
  await assertRejectedBeforeOutput(cleanResult, cleanRepo, 'clean matching source control');
  assert.match(cleanResult.stderr, /V1 API build failed: ENOENT:/);
  assert.ok(cleanResult.stderr.includes(missingInventory), 'clean source must fail specifically while opening the absent inventory');
  process.stdout.write(`Driver clean-source control PASS: exit=${cleanResult.status}; expected ENOENT for absent inventory; no output dirs/network.\n`);

  // Full-length wrong SHA must fail at the actual CLI driver boundary.
  const wrongSha = '0'.repeat(40);
  assert.notEqual(wrongSha, sourceSha);
  const wrongResult = invokeDriver(cleanRepo, makeEnv(cleanRepo, cleanCandidates.capture, missingInventory, wrongSha));
  await assertRejectedBeforeOutput(wrongResult, cleanRepo, 'wrong source SHA');
  assert.equal(wrongResult.stderr.trim(), 'V1 API build failed: V1 capture source HEAD does not match the declared source commit');
  process.stdout.write(`Driver wrong-SHA regression PASS: exit=${wrongResult.status}; exact HEAD mismatch; no output dirs/network.\n`);

  // A tracked edit must fail the same actual CLI boundary before capture/build.
  const dirtyRepo = await cloneRepo('dirty');
  const dirtyCandidates = candidatePaths(dirtyRepo);
  const dirtyFile = path.join(dirtyRepo, 'README.md');
  const cleanReadme = await readFile(dirtyFile);
  await writeFile(dirtyFile, Buffer.concat([cleanReadme, Buffer.from('\ntracked provenance test dirt\n')]));
  assert.notEqual(runGit(dirtyRepo, 'status', '--porcelain', '--untracked-files=all'), '');
  const dirtyResult = invokeDriver(dirtyRepo, makeEnv(dirtyRepo, dirtyCandidates.capture, missingInventory, sourceSha));
  await assertRejectedBeforeOutput(dirtyResult, dirtyRepo, 'tracked dirty source');
  assert.equal(dirtyResult.stderr.trim(), 'V1 API build failed: V1 capture requires a clean reviewed source checkout');
  await writeFile(dirtyFile, cleanReadme);
  process.stdout.write(`Driver tracked-dirty regression PASS: exit=${dirtyResult.status}; exact clean-checkout rejection; no output dirs/network.\n`);

  // Mutation rehearsal: remove only the unconditional driver call in a disposable clone.
  // The new wrong-SHA/dirty driver assertions must then fail by reaching ENOENT instead.
  const mutantRepo = await cloneRepo('mutant');
  const mutantDriverPath = path.join(mutantRepo, 'scripts/build-cms-v1-from-api.mjs');
  const mutantDriver = await readFile(mutantDriverPath, 'utf8');
  const gateCall = '  assertCleanSourceCommit({ repository: root, sourceSha });\n';
  assert.equal(mutantDriver.split(gateCall).length - 1, 1, 'mutant must remove exactly the unconditional gate invocation');
  await writeFile(mutantDriverPath, mutantDriver.replace(gateCall, '  // mutation rehearsal: source gate omitted\n'));
  const mutantCandidates = candidatePaths(mutantRepo);
  const mutantWrong = invokeDriver(mutantRepo, makeEnv(mutantRepo, mutantCandidates.capture, missingInventory, wrongSha));
  assert.equal(mutantWrong.error, undefined);
  assert.equal(mutantWrong.signal, null);
  assert.notEqual(mutantWrong.status, 0);
  assert.match(mutantWrong.stderr, /V1 API build failed: ENOENT:/);
  assert.ok(mutantWrong.stderr.includes(missingInventory));
  assert.doesNotMatch(mutantWrong.stderr, /HEAD does not match/);
  await assertNoOutputsOrNetwork(mutantRepo, 'omitted-gate wrong-SHA mutation');
  const mutantDirtyFile = path.join(mutantRepo, 'README.md');
  const mutantReadme = await readFile(mutantDirtyFile);
  await writeFile(mutantDirtyFile, Buffer.concat([mutantReadme, Buffer.from('\ntracked mutation rehearsal dirt\n')]));
  const mutantDirty = invokeDriver(mutantRepo, makeEnv(mutantRepo, mutantCandidates.capture, missingInventory, sourceSha));
  assert.equal(mutantDirty.error, undefined);
  assert.equal(mutantDirty.signal, null);
  assert.notEqual(mutantDirty.status, 0);
  assert.match(mutantDirty.stderr, /V1 API build failed: ENOENT:/);
  assert.ok(mutantDirty.stderr.includes(missingInventory));
  assert.doesNotMatch(mutantDirty.stderr, /clean reviewed source checkout/);
  await assertNoOutputsOrNetwork(mutantRepo, 'omitted-gate dirty-source mutation');
  process.stdout.write('Mutation proof PASS: omitting the driver gate makes wrong-SHA and tracked-dirty cases reach ENOENT, so the new exact-error assertions fail.\n');
} finally { await rm(driverSandbox, { recursive: true, force: true }); }
