import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = ts.transpileModule(await readFile(new URL('../src/scripts/release-notice.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
async function controller({ pinned = 'a'.repeat(64), marker = 'b'.repeat(64), fail = false } = {}) {
  const listeners = new Map(), notices = [], requests = [];
  const document = {
    visibilityState: 'visible',
    querySelector: selector => selector.startsWith('meta') ? pinned && { content: pinned } : selector === 'main' ? { prepend: element => notices.push(element) } : null,
    getElementById: id => notices.find(item => item.id === id),
    createElement: tag => ({ tag, children: [], setAttribute(name, value) { this[name] = value; }, append(...children) { this.children.push(...children); } }),
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  const window = { addEventListener: (name, callback) => listeners.set(name, callback) };
  const fetch = async (url, init) => { requests.push({ url, init }); if (fail) throw Error('fixture marker outage'); return { ok: true, json: async () => ({ manifest_sha256: marker }) }; };
  new Function('document', 'window', 'fetch', 'location', source)(document, window, fetch, { href: 'https://example.org/maps/?layers=one' });
  await tick(); await tick();
  return { requests, notices, listeners };
}

test('actual shipped static marker controller warns without reloading or mixing data and throttles checks', async () => {
  const { notices, requests, listeners } = await controller();
  assert.equal(requests.length, 1); assert.deepEqual(requests[0], { url: '/data/cms-snapshot.json', init: { cache: 'no-store' } });
  assert.equal(notices.length, 1); assert.equal(notices[0].role, 'status');
  assert.equal(notices[0].children[1].href, 'https://example.org/maps/?layers=one');
  listeners.get('focus')(); listeners.get('visibilitychange')(); await tick();
  assert.equal(requests.length, 1); assert.equal(notices.length, 1);
});

test('same release, invalid marker, marker outage and local-source pages preserve rendered content', async () => {
  for (const options of [{ marker: 'a'.repeat(64) }, { marker: 'invalid' }, { fail: true }, { pinned: undefined, marker: 'a'.repeat(64) }]) {
    const result = await controller(options); assert.equal(result.notices.length, 0);
  }
  const local = await controller({ pinned: null });
  assert.equal(local.requests.length, 0); assert.equal(local.notices.length, 0);
});
