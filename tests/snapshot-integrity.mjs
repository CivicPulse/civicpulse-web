import assert from 'node:assert/strict';
import test from 'node:test';
import { stableSerialize } from '../scripts/snapshot-integrity.mjs';

test('canonical JSON rejects unsupported values without coercion or toJSON', () => {
  const cycle = {}; cycle.self = cycle;
  const sparse = new Array(1);
  const accessor = Object.defineProperty({}, 'value', { enumerable: true, get() { throw new Error('getter invoked'); } });
  for (const value of [Infinity, -Infinity, NaN, undefined, () => {}, Symbol('x'), 1n, sparse, cycle, new Date(), new Map(), accessor,
    { toJSON() { throw new Error('toJSON invoked'); } }, { [Symbol('key')]: true }]) {
    assert.throws(() => stableSerialize({ nested: value }), /Snapshot JSON/);
  }
  const dictionary = Object.create(null);
  dictionary.__proto__ = { finite: 1.25, values: [null, true, 'source', -12, 0] };
  assert.equal(stableSerialize(dictionary), '{"__proto__":{"finite":1.25,"values":[null,true,"source",-12,0]}}');
});
