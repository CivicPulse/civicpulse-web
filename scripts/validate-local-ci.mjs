import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePublicContentSource } from '../src/lib/content-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  if (resolvePublicContentSource(process.env.PUBLIC_CONTENT_SOURCE) !== 'local') {
    throw new Error('Local CI validation requires PUBLIC_CONTENT_SOURCE=local; CMS delivery is a separate gated lane');
  }
  const env = { ...process.env, PUBLIC_CONTENT_SOURCE: 'local' };
  const suites = ['admin-controller', 'admin-json', 'admin-fields', 'admin-publish-gate', 'admin-session', 'admin-request', 'private-event-publication', 'content-source', 'snapshot-integrity', 'published-snapshot-export'];
  const commands = [
    ...suites.map(suite => [process.execPath, [`tests/${suite}.mjs`]]),
    [process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']],
    [process.execPath, ['tests/check-private-build.mjs']],
  ];
  for (const [command, args] of commands) {
    process.stdout.write(`Local CI: ${args.join(' ')}\n`);
    const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Local CI step failed (${result.signal || result.status}): ${args.join(' ')}`);
  }
  process.stdout.write('Local CI validation passed. No delivery or deployment was attempted.\n');
}

try { main(); }
catch (error) {
  process.stderr.write(`Local CI validation failed: ${error.message}\n`);
  process.exitCode = 1;
}
