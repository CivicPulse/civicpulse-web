import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, lstat, readFile, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPinnedSnapshot } from './read-pinned-snapshot.mjs';
import { loadV1Capture } from './v1-public-capture.mjs';
import { sha256, stableSerialize } from './snapshot-integrity.mjs';

/** Content/build foundation only: no uploader, claim, live receipt or authority. */
export async function buildCmsArtifact({ repository, sourceSha, snapshotDirectory, attemptsDirectory, dependencyDirectory }) {
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('Explicit lowercase source commit required');
  const manifestBytes = await readFile(path.join(snapshotDirectory, 'manifest.json'));
  const publicManifest = JSON.parse(manifestBytes.toString('utf8'));
  const snapshot = publicManifest?.format === 'civicpulse-v1-direct-capture'
    ? await loadV1Capture(snapshotDirectory)
    : await loadPinnedSnapshot(snapshotDirectory);
  if (snapshot.manifest.source_sha !== sourceSha) throw new Error('Build source differs from pinned snapshot source');
  const version = process.versions.node.split('.').map(Number);
  if (version[0] < 22 || version[0] === 22 && version[1] < 22) throw new Error('Node 22.22.0 or newer required');
  attemptsDirectory = path.resolve(attemptsDirectory);
  let component = path.parse(attemptsDirectory).root;
  for (const part of attemptsDirectory.slice(component.length).split(path.sep).filter(Boolean)) {
    component = path.join(component, part);
    try { if ((await lstat(component)).isSymbolicLink()) throw new Error('Build attempts path cannot contain a symlink'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await mkdir(attemptsDirectory, { recursive: true });
  if ((await lstat(attemptsDirectory)).isSymbolicLink()) throw new Error('Build attempts root cannot be a symlink');
  const attempt = await mkdtemp(path.join(attemptsDirectory, 'cms-build-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => ['PATH', 'TMPDIR', 'LANG', 'CI'].includes(name)));
  env.HOME = path.join(attempt, 'home');
  await mkdir(env.HOME);
  const source = path.join(attempt, 'source');
  await mkdir(source);
  const archive = spawnSync('git', ['archive', '--format=tar', sourceSha], { cwd: repository, maxBuffer: 128 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error('Cannot archive committed build source');
  const unpack = spawnSync('tar', ['-x', '-C', source], { input: archive.stdout });
  if (unpack.status !== 0) throw new Error('Cannot unpack build source');
  if (dependencyDirectory) {
    // Explicit local dependency reuse requires byte-identical lockfiles. It is
    // not a release trust claim; production installation remains runner-owned.
    const dependencyRoot = path.dirname(dependencyDirectory);
    if (!(await readFile(path.join(source, 'package-lock.json'))).equals(await readFile(path.join(dependencyRoot, 'package-lock.json')))) throw new Error('Dependency lock mismatch');
    await symlink(path.resolve(dependencyDirectory), path.join(source, 'node_modules'), 'dir');
  } else {
    const install = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: source, env, encoding: 'utf8' });
    await writeFile(path.join(attempt, 'install.log'), `${install.stdout || ''}${install.stderr || ''}`);
    if (install.status !== 0) throw new Error('Locked CMS dependency install failed');
  }
  // Do not inherit hosted credentials or caller source selection. This stage
  // builds only the supplied immutable public snapshot; no API call is needed.
  Object.assign(env, { PUBLIC_CONTENT_SOURCE: 'supabase', CIVICPULSE_SNAPSHOT_DIR: snapshot.directory, ASTRO_TELEMETRY_DISABLED: '1' });
  const build = spawnSync('npm', ['run', 'build'], { cwd: source, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  await writeFile(path.join(attempt, 'build.log'), `${build.stdout || ''}${build.stderr || ''}`);
  if (build.status !== 0) throw new Error(`CMS build failed; candidate not releasable (${path.basename(attempt)})`);
  const artifact = path.join(source, 'dist');
  const artifactStat = await lstat(artifact);
  if (!artifactStat.isDirectory() || artifactStat.isSymbolicLink()) throw new Error('Build artifact root must be a real directory');
  const files = [];
  async function inventory(directory, prefix = '') {
    for (const name of await readdir(directory)) {
      const file = path.join(directory, name), relative = `${prefix}${name}`, stat = await lstat(file);
      if (stat.isSymbolicLink()) throw new Error('Build artifact symlink rejected');
      if (stat.isDirectory()) await inventory(file, `${relative}/`);
      else if (stat.isFile()) {
        if (stat.nlink !== 1) throw new Error('Build artifact hardlink rejected');
        const bytes = await readFile(file); files.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
      }
      else throw new Error('Build artifact special file rejected');
    }
  }
  await inventory(artifact);
  files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  // M2's artifact identity is ONLY the canonical complete file inventory, with
  // no newline. Source/snapshot claims remain separate provenance, not authority.
  const manifest = { schema_version: 1, files };
  const bytes = stableSerialize(manifest);
  await writeFile(path.join(attempt, 'artifact-manifest.json'), bytes, { flag: 'wx' });
  await writeFile(path.join(attempt, 'build-provenance.json'), `${stableSerialize({ source_sha: sourceSha, snapshot_sha256: snapshot.manifest.sha256, artifact_sha256: sha256(bytes) })}\n`, { flag: 'wx' });
  return { attempt, artifact, manifest, sha256: sha256(bytes) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  buildCmsArtifact({ repository, sourceSha: process.env.CIVICPULSE_SOURCE_SHA, snapshotDirectory: process.env.CIVICPULSE_SNAPSHOT_DIR,
    attemptsDirectory: path.join(repository, '.civicpulse/build-attempts') })
    .then(result => console.log(JSON.stringify({ artifact: result.artifact, sha256: result.sha256 })))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
