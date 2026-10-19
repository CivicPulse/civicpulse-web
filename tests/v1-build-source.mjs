// Credential-free actual-git source provenance checks.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertCleanSourceCommit } from '../scripts/v1-build-source.mjs';

const repo = await mkdtemp(path.join(tmpdir(), 'civicpulse-v1-source-'));
try {
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  git('init'); git('config', 'user.email', 'fixture@example.test'); git('config', 'user.name', 'Fixture');
  await writeFile(path.join(repo, 'tracked.txt'), 'clean\n');
  git('add', 'tracked.txt'); git('commit', '-m', 'fixture'); const head = git('rev-parse', 'HEAD');
  assert.deepEqual(assertCleanSourceCommit({ repository: repo, sourceSha: head }), { head_sha: head, clean: true });
  assert.throws(() => assertCleanSourceCommit({ repository: repo, sourceSha: '0'.repeat(40) }), /HEAD does not match/);
  await writeFile(path.join(repo, 'tracked.txt'), 'dirty\n');
  assert.throws(() => assertCleanSourceCommit({ repository: repo, sourceSha: head }), /clean reviewed source/);
  console.log('V1 source provenance: clean control PASS; mismatched SHA and dirty tracked source reject.');
} finally { await rm(repo, { recursive: true, force: true }); }
