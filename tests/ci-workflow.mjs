import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { withFreshDatabase, image } from '../scripts/validate-sql-ci.mjs';
const workflow = parse(await readFile(new URL('../.github/workflows/validate.yml', import.meta.url), 'utf8'));
test('final actual workflow gate rejects every failure, cancellation, skipped or absent dependency result', () => {
  const gate = workflow.jobs['civicpulse-validate'];
  assert.equal(gate.if, '${{ always() }}'); assert.deepEqual(gate.needs, ['web', 'sql']); assert.deepEqual(gate.permissions, {});
  const script = gate.steps[0].run;
  for (const web of ['success', 'failure', 'cancelled', 'skipped', '']) for (const sql of ['success', 'failure', 'cancelled', 'skipped', '']) {
    const result = spawnSync('bash', ['-e', '-c', script], { env: { PATH: process.env.PATH, WEB_RESULT: web, SQL_RESULT: sql } });
    assert.equal(result.status, web === 'success' && sql === 'success' ? 0 : 1, `${web}/${sql}`);
  }
});
test('workflow has PR/main coverage, exact checkout/runtime pins and no credential or promotion lane', () => {
  assert.deepEqual(Object.keys(workflow.on), ['pull_request', 'push']); assert.deepEqual(workflow.on.push, { branches: ['main'] });
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.environment, undefined); assert.equal(job['continue-on-error'], undefined);
    for (const step of job.steps) {
      if (step.uses) assert.match(step.uses, /^actions\/(checkout|setup-node)@[0-9a-f]{40}$/);
      if (step.uses?.startsWith('actions/checkout')) assert.equal(step.with['persist-credentials'], false);
      if (step.uses?.startsWith('actions/setup-node')) { assert.equal(step.with['node-version'], '22.23.2'); assert.equal(step.with['package-manager-cache'], false); }
      assert.equal(step['continue-on-error'], undefined);
    }
  }
});
function fakeRuntime({ existing = false, startupFailure = false } = {}) {
  const calls = []; const pin = { Id: 'fixed-image', Os: 'linux', Architecture: 'amd64', RepoDigests: [image] };
  const run = (command, args) => {
    calls.push(args);
    if (args[0] === 'ps') return args.includes('name=^civicpulse-api-db-test$') ? existing ? 'existing-id' : '' : 'a'.repeat(64);
    if (args.includes('/proc/1/comm')) return 'postgres';
    if (args[0] === 'image') return JSON.stringify([pin]);
    if (args[0] === 'run' && startupFailure) throw Error('uncertain run');
    return '';
  };
  return { run, calls };
}
test('actual SQL lifecycle refuses preexisting containers and never cleans unrelated state', async () => {
  const runtime = fakeRuntime({ existing: true }); let ran = false;
  await assert.rejects(withFreshDatabase(() => { ran = true; }, runtime.run), /must not be replaced/);
  assert.equal(ran, false); assert.equal(runtime.calls.some(args => args[0] === 'rm' || args[0] === 'run'), false);
});
test('actual SQL lifecycle cleans only ownership-labelled container after task failure or uncertain start', async () => {
  for (const startupFailure of [false, true]) {
    const runtime = fakeRuntime({ startupFailure });
    await assert.rejects(withFreshDatabase(() => { throw Error('task failed'); }, runtime.run), /uncertain run|task failed/);
    assert.deepEqual(runtime.calls.at(-1), ['rm', '--force', 'a'.repeat(64)]);
    const start = runtime.calls.find(args => args[0] === 'run'); assert.ok(start.includes('--network=none')); assert.ok(start.includes('--pull=never')); assert.ok(start.includes('--read-only'));
  }
});

test('SQL readiness ignores the temporary init server before final postgres PID 1', async () => {
  const runtime = fakeRuntime(); let count = 0, executed = false;
  const run = (binary, args) => args.includes('/proc/1/comm') ? ++count === 1 ? 'bash' : 'postgres' : runtime.run(binary, args);
  await withFreshDatabase(() => { executed = true; assert.equal(count, 2); }, run, async () => {});
  assert.equal(executed, true);
  assert.equal(runtime.calls.filter(args => args.includes('pg_isready')).length, 1);
});
