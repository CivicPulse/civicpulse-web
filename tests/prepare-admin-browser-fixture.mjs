import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Test-only source archive. No provider/API transport, credentials or deployment.
const [commit, modulesArgument] = process.argv.slice(2);
if (!/^[0-9a-f]{40}$/.test(commit || '') || !modulesArgument) throw new Error('Usage: node tests/prepare-admin-browser-fixture.mjs FULL_COMMIT LOCKED_NODE_MODULES_DIRECTORY');
const modules = await realpath(modulesArgument);
const parent = await mkdtemp(path.join(os.tmpdir(), 'civicpulse-admin-design-'));
const source = path.join(parent, 'source');
await mkdir(source, { mode: 0o700 });
const archive = execFileSync('git', ['archive', '--format=tar', commit], { maxBuffer: 512 * 1024 * 1024 });
execFileSync('tar', ['-x', '-C', source], { input: archive });
const archivedLock = await readFile(path.join(source, 'package-lock.json'));
const installedLock = await readFile(path.join(modules, '..', 'package-lock.json'));
if (!archivedLock.equals(installedLock)) throw new Error('Fixture dependency reuse requires the identical lockfile.');
await symlink(modules, path.join(source, 'node_modules'));
for (const [from, to] of [
  ['cms-client.ts.txt', 'src/lib/cms-client.ts'],
  ['client.mjs.txt', 'src/vendor/civicpulse-api/client.mjs'],
  ['state.mjs', 'src/lib/admin-browser-fixture.mjs'],
]) await writeFile(path.join(source, to), await readFile(path.join(source, 'tests/fixtures/admin-browser', from)));
const page = path.join(source, 'src/pages/admin/index.astro');
await writeFile(page, (await readFile(page, 'utf8')).replace('<main id="main" class="admin-main">', '<main id="main" class="admin-main"><p class="notice"><strong>LOCAL MOCKED CMS.</strong> Browser fixture only. No real authentication, API calls or hosted writes.</p>'));
await writeFile(path.join(source, '.env.production.local'), 'PUBLIC_CONTENT_SOURCE=local\nPUBLIC_SUPABASE_URL=https://example.invalid\nPUBLIC_SUPABASE_PUBLISHABLE_KEY=local-public-fixture\n', { mode: 0o600 });
await writeFile(path.join(parent, 'FIXTURE-ONLY-NOT-FOR-DEPLOYMENT.json'), JSON.stringify({ commit, source, mocked: true, dependencies: 'reused node_modules with identical lockfile; not a fresh install' }, null, 2) + '\n');
console.log(JSON.stringify({ commit, source, mocked: true, dependenciesReused: true }));
