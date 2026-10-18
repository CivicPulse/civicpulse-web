import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { materializePinnedSnapshot } from './materialize-pinned-snapshot.mjs';
import { loadPinnedSnapshot } from './read-pinned-snapshot.mjs';

const assets = JSON.parse(await readFile(new URL('./cms-public-assets.json', import.meta.url), 'utf8'));

/** Normal CMS prebuild. Only disposable attempt workspaces may consume CMS data. */
export async function prepareCmsBuild(root, snapshotPath) {
  const snapshot = await loadPinnedSnapshot(snapshotPath);
  if ((await lstat(path.join(root, 'public'))).isSymbolicLink()) throw new Error('CMS source public root cannot be a symlink');
  const generated = path.join(root, '.civicpulse');
  await mkdir(generated, { recursive: true });
  if ((await lstat(generated)).isSymbolicLink()) throw new Error('CMS build root cannot be a symlink');
  const stage = path.join(generated, `.public-${randomUUID()}`);
  const target = path.join(generated, 'cms-public');
  await mkdir(stage);
  try {
    for (const relative of assets) {
      if (path.isAbsolute(relative) || relative.split('/').includes('..')) throw new Error('Unsafe CMS static asset');
      const source = path.join(root, 'public', relative);
      let current = path.join(root, 'public');
      for (const component of relative.split('/')) {
        current = path.join(current, component);
        if ((await lstat(current)).isSymbolicLink()) throw new Error('CMS static asset path contains a symlink');
      }
      if (!(await lstat(source)).isFile()) throw new Error('CMS static asset must be a regular file');
      const destination = path.join(stage, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination, { errorOnExist: true, force: false });
    }
    await materializePinnedSnapshot(snapshot.directory, { dataDirectory: path.join(root, 'src/data'), publicDirectory: stage });
    // All generated content revalidates, including presently data-bearing JS.
    await writeFile(path.join(stage, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: public, max-age=0, must-revalidate\n/data/cms-snapshot.json\n  Cache-Control: no-store\n');
    await rm(target, { recursive: true, force: true });
    await rename(stage, target);
    // Resolve static local imports without processing or shipping raw evidence.
    await writeFile(path.join(root, 'src/data/mobilize-events.public.json'), '[]\n');
    await rm(path.join(root, 'dist'), { recursive: true, force: true });
    return { snapshot, publicDirectory: target };
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  prepareCmsBuild(root, process.env.CIVICPULSE_SNAPSHOT_DIR).catch(error => { console.error(error.message); process.exitCode = 1; });
}
