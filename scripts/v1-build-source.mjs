import { execFileSync } from 'node:child_process';

/** Every v1 capture/build invocation must use the exact clean reviewed source. */
export function assertCleanSourceCommit({ repository, sourceSha } = {}) {
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('A full lowercase source commit SHA is required');
  const head = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
  if (head !== sourceSha) throw new Error('V1 capture source HEAD does not match the declared source commit');
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: repository, encoding: 'utf8' }).trim();
  if (dirty) throw new Error('V1 capture requires a clean reviewed source checkout');
  return Object.freeze({ head_sha: head, clean: true });
}
