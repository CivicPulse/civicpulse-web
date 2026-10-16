import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as gate from '../src/lib/admin-publish-gate.mjs';
import * as session from '../src/lib/admin-session.mjs';
import * as request from '../src/lib/admin-request.mjs';
import { ApiError } from '../src/vendor/civicpulse-api/client.mjs';

// Executes the REAL shipped controller, with a minimal DOM and injected network/
// Auth boundaries. No credentials, hosted calls, alternate controller or writes.
class Element {
  constructor(id = '') { this.id = id; this.value = ''; this.hidden = false; this.disabled = false; this.dataset = {}; this.children = []; this.listeners = {}; this.attributes = {}; this._text = ''; }
  get textContent() { return this._text + this.children.map(e => e.textContent).join(''); }
  set textContent(value) { this._text = value; this.children = []; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  async event(type) { for (const callback of this.listeners[type] || []) await callback({ preventDefault() {} }); }
  append(...elements) { this.children.push(...elements.flatMap(e => e.id === 'fragment' ? e.children : [e])); }
  replaceChildren(...elements) { this.children = []; this._text = ''; this.append(...elements); }
  setAttribute(key, value) { this.attributes[key] = value; }
  toggleAttribute(key, force) { if (key === 'hidden') this.hidden = force; }
  querySelector() { return new Element('login-button'); }
  checkValidity() { return !!this.value && /^[a-z0-9][a-z0-9._-]*$/.test(this.value); }
  focus() {}
}
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function harness() {
  const elements = new Map(); const created = [];
  const el = id => { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); };
  el('kind-filter').value = el('editor-kind').value = 'organization';
  const timers = new Map(); let timerId = 0;
  const setTimeout = (work, delay) => { if (!delay) queueMicrotask(work); else timers.set(++timerId, work); return timerId; };
  const clearTimeout = id => timers.delete(id);
  const user = { user: { id: 'staff-a', email: 'synthetic@example.org' } };
  const payload = { id: 'qa-org', name: 'Original', unknown: { evidence: ['retain', { value: 3 }] } };
  const state = { draft: { kind: 'organization', id: payload.id, revision: 1, payload }, published: null, role: () => Promise.resolve('admin'), getDraft: null, getPublished: null, getHistory: null, save: null, publish: null, withdraw: null, calls: [], auth: null };
  const api = {
    role: () => state.role(),
    getDraft: async () => state.getDraft ? state.getDraft() : structuredClone(state.draft),
    saveDraft: async (...args) => { state.calls.push(['save', ...args]); if (state.save) return state.save(...args); const [kind, value, revision] = args; if (revision !== state.draft.revision) throw new ApiError(409, { code: '40001', message: 'Revision conflict' }); state.draft = { kind, id: value.id, revision: revision + 1, payload: structuredClone(value) }; return revision + 1; },
    publish: async (...args) => { state.calls.push(['publish', ...args]); if (state.publish) return state.publish(...args); state.published = structuredClone(state.draft); },
    withdraw: async (...args) => { state.calls.push(['withdraw', ...args]); if (state.withdraw) return state.withdraw(...args); state.published = null; },
  };
  const supabase = { auth: { getSession: async () => ({ data: { session: user }, error: null }), onAuthStateChange(callback) { state.auth = callback; }, signOut: async () => { state.auth('SIGNED_OUT', null); return {}; } }, from() { const query = { select() { return this; }, eq() { return this; }, order() { return this; }, range: async () => ({ data: [state.draft], error: null }), maybeSingle: async () => state.getPublished ? state.getPublished() : ({ data: structuredClone(state.published), error: null }), limit: async () => state.getHistory ? state.getHistory() : ({ data: [], error: null }) }; return query; } };
  const modules = {
    '../lib/cms-client': { getCmsSupabase: () => supabase },
    '../lib/admin-publish-gate.mjs': gate,
    '../lib/admin-session.mjs': { ...session, deferredAuthRefresh: refresh => session.deferredAuthRefresh(refresh, work => queueMicrotask(work)) },
    '../lib/admin-request.mjs': { ...request, withCmsDeadline: promise => request.withCmsDeadline(promise, 20, { setTimeout, clearTimeout }) },
    '../lib/cms-refresh-status': { cmsRefreshStatus: () => 'CMS-to-website refresh is not enabled in this build.' },
    '../vendor/civicpulse-api/client.mjs': { ApiError, createCivicPulseClient: () => api },
  };
  let code = ts.transpileModule(await readFile(new URL('../src/scripts/admin.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  code = code.replace(/^import (.*?) from ['"]([^'"]+)['"];$/gm, (_all, names, path) => `const ${names} = deps.modules[${JSON.stringify(path)}];`).replaceAll('import.meta.env', 'deps.env');
  const run = Object.getPrototypeOf(async function() {}).constructor;
  await new run('deps', 'const { document, location, confirm, setTimeout } = deps;\n' + code)({ modules, env: { PUBLIC_SUPABASE_URL: 'https://example.test', PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-fixture', PUBLIC_CONTENT_SOURCE: 'local' }, document: { getElementById: el, createElement() { const e = new Element(); created.push(e); return e; }, createDocumentFragment: () => new Element('fragment'), querySelectorAll: () => created.filter(e => e.className === 'record-button') }, location: { hash: '' }, confirm: () => true, setTimeout });
  await flush();
  async function select() { const button = created.filter(e => e.className === 'record-button').at(-1); await button.event('click'); await flush(); }
  async function edit(name) { el('payload').value = JSON.stringify({ ...JSON.parse(el('payload').value), name }); await el('payload').event('input'); }
  return { el, state, select, edit, flush, async auth(next = user) { state.auth('TOKEN_REFRESHED', next); await flush(); }, timeout() { for (const work of [...timers.values()]) work(); timers.clear(); }, async submit() { const work = el('editor-form').event('submit'); await flush(); return work; } };
}

test('same-user Auth preserves dirty payload and baseline; transient role errors block without discarding; revoke/switch/signout clear', async () => {
  const h = await harness(); await h.select(); await h.edit('Unsaved'); const original = h.el('payload').value;
  await h.auth(); assert.equal(h.el('payload').value, original); assert.equal(h.el('record-id').value, 'qa-org'); assert.equal(h.el('publish').disabled, true);
  h.state.role = () => Promise.reject(new Error('Network down')); await h.auth();
  assert.equal(h.el('payload').value, original); assert.equal(h.el('workspace').hidden, true); assert.equal(h.el('save-draft').disabled, true);
  h.state.role = () => Promise.resolve('admin'); await h.auth(); assert.equal(h.el('payload').value, original); assert.equal(h.el('workspace').hidden, false);
  const pending = deferred(); h.state.role = () => pending.promise; const auth = h.auth(); await h.flush(); h.timeout(); await auth; await h.flush();
  assert.equal(h.el('payload').value, original); assert.equal(h.el('save-draft').disabled, true);
  h.state.role = () => Promise.resolve(null); await h.auth(); assert.equal(h.el('record-id').value, ''); assert.ok(!h.el('payload').value.includes('Unsaved'));
  await h.auth({ user: { id: 'staff-b' } }); assert.equal(h.el('record-id').value, '');
  await h.auth(null); assert.equal(h.el('record-id').value, ''); assert.equal(h.el('workspace').hidden, true);
});

test('unknown write blocks pending/failed/partial reconciliation; complete reload unlocks without second mutation', async () => {
  const h = await harness(); await h.select(); await h.edit('Uncertain'); const text = h.el('payload').value;
  const mutation = deferred(); h.state.save = () => mutation.promise;
  const submit = h.el('editor-form').event('submit'); await h.flush(); assert.equal(h.el('save-draft').disabled, true);
  h.timeout(); await submit; assert.equal(h.state.calls.length, 1); assert.equal(h.el('reload-record').hidden, false);
  assert.equal(h.el('save-draft').disabled, true); assert.match(h.el('editor-message').textContent, /outcome is not confirmed/);
  const pendingRead = deferred(); h.state.getDraft = () => pendingRead.promise;
  await h.el('reload-record').event('click'); await h.flush(); assert.equal(h.el('save-draft').disabled, true); assert.equal(h.el('payload').value, text);
  pendingRead.reject(new Error('Read failed')); await h.flush(); assert.equal(h.el('save-draft').disabled, true); assert.equal(h.el('payload').value, text);
  h.state.getDraft = null; h.state.getPublished = () => Promise.resolve({ data: null, error: new Error('Partial read failed') });
  await h.el('reload-record').event('click'); await h.flush(); assert.equal(h.el('save-draft').disabled, true); assert.equal(h.el('payload').value, text);
  h.state.getPublished = null; await h.el('reload-record').event('click'); await h.flush();
  assert.equal(h.el('save-draft').disabled, false); assert.equal(h.state.calls.length, 1); assert.equal(JSON.parse(h.el('payload').value).name, 'Original');
  assert.deepEqual(JSON.parse(h.el('payload').value).unknown, h.state.draft.payload.unknown);
});

test('delayed save and reconciliation cannot restore cleared or switched sessions', async () => {
  const h = await harness(); await h.select(); await h.edit('Delayed'); const delayed = deferred(); h.state.save = () => delayed.promise;
  const submit = h.el('editor-form').event('submit'); await h.flush(); await h.auth(null); delayed.resolve(2); await submit;
  assert.equal(h.el('record-id').value, ''); assert.equal(h.el('workspace').hidden, true); assert.ok(!h.el('payload').value.includes('Delayed'));
  const j = await harness(); await j.select(); const pending = deferred(); j.state.save = () => pending.promise;
  const write = j.el('editor-form').event('submit'); await j.flush(); j.timeout(); await write;
  const read = deferred(); j.state.getDraft = () => read.promise; await j.el('reload-record').event('click'); await j.flush();
  await j.auth({ user: { id: 'staff-b' } }); read.resolve(j.state.draft); await j.flush();
  assert.equal(j.el('record-id').value, ''); assert.equal(j.el('publish').disabled, true);
});

test('actual publish/withdraw controller keeps success after selection refresh and does not retry', async () => {
  const h = await harness(); await h.select(); await h.el('publish').event('click'); await h.flush();
  assert.match(h.el('editor-message').textContent, /Published revision 1/); assert.match(h.el('editor-message').textContent, /Resident pages are unchanged/);
  assert.deepEqual(h.state.calls.map(x => x[0]), ['publish']);
  await h.el('withdraw').event('click'); await h.flush(); assert.match(h.el('editor-message').textContent, /revision 1 withdrawn/);
  assert.deepEqual(h.state.calls.map(x => x[0]), ['publish', 'withdraw']);
});


test('controller rejects dirty, invalid and conflicted publish, preserves metadata, and exposes revision conflict recovery', async () => {
  const h = await harness(); await h.select();
  await h.edit('Dirty'); await h.el('publish').event('click'); assert.equal(h.state.calls.length, 0);
  h.el('payload').value = '{invalid'; await h.el('payload').event('input'); await h.el('publish').event('click'); assert.equal(h.state.calls.length, 0);
  h.el('payload').value = JSON.stringify({ ...h.state.draft.payload, name: 'Local' }); await h.el('payload').event('input');
  h.state.draft = { ...h.state.draft, revision: 2, payload: { ...h.state.draft.payload, name: 'Concurrent' } };
  await h.el('editor-form').event('submit'); await h.flush();
  assert.equal(h.el('conflict-panel').hidden, false); assert.equal(h.el('publish').disabled, true);
  assert.equal(JSON.parse(h.el('conflict-local').value).name, 'Local'); assert.equal(JSON.parse(h.el('conflict-latest').value).name, 'Concurrent');
  await h.el('publish').event('click'); assert.equal(h.state.calls.length, 1);
  await h.el('keep-local').event('click'); assert.equal(h.el('publish').disabled, true);
  await h.el('editor-form').event('submit'); await h.flush();
  assert.equal(h.state.draft.revision, 3); assert.deepEqual(h.state.draft.payload.unknown, { evidence: ['retain', { value: 3 }] });
  assert.equal(h.el('save-draft').disabled, false); assert.equal(h.el('publish').disabled, false);
});

test('older same-user reconciliation cannot unlock newer pending recovery; confirmed42501 clears retained text', async () => {
  const h = await harness(); await h.select(); await h.edit('Uncertain');
  h.state.save = () => new Promise(() => {}); const write = h.el('editor-form').event('submit'); await h.flush(); h.timeout(); await write;
  const first = deferred(), second = deferred(); let reads = 0;
  h.state.getDraft = () => (++reads === 1 ? first.promise : second.promise);
  await h.el('reload-record').event('click'); await h.flush(); await h.el('reload-record').event('click'); await h.flush();
  first.resolve(h.state.draft); await h.flush(); assert.equal(h.el('save-draft').disabled, true); assert.equal(JSON.parse(h.el('payload').value).name, 'Uncertain');
  second.reject(new Error('Latest read failed')); await h.flush(); assert.equal(h.el('save-draft').disabled, true);
  h.state.role = () => Promise.reject(new ApiError(403, { code: '42501', message: 'Revoked' })); await h.auth();
  assert.equal(h.el('record-id').value, ''); assert.ok(!h.el('payload').value.includes('Uncertain'));
});

test('successful mutation followed by failed reconciliation stays write-locked with persistent known-success feedback', async () => {
  const h = await harness(); await h.select(); h.state.getPublished = () => Promise.resolve({ error: new Error('Read failed') });
  await h.el('publish').event('click'); await h.flush();
  assert.match(h.el('editor-message').textContent, /Published revision 1/); assert.match(h.el('editor-message').textContent, /refresh failed/);
  assert.equal(h.el('save-draft').disabled, true); assert.equal(h.el('publish').disabled, true);
  await h.el('publish').event('click'); assert.equal(h.state.calls.length, 1);
});


test('publish and withdraw deadlines retain unknown lock through failed reads, with no implicit replay', async () => {
  for (const action of ['publish', 'withdraw']) {
    const h = await harness(); if (action === 'withdraw') h.state.published = structuredClone(h.state.draft);
    await h.select(); h.state[action] = () => new Promise(() => {});
    const pending = h.el(action).event('click'); await h.flush(); h.timeout(); await pending;
    assert.equal(h.state.calls.length, 1); assert.equal(h.el('save-draft').disabled, true); assert.equal(h.el(action).disabled, true);
    h.state.getDraft = () => Promise.reject(new Error('Offline'));
    await h.el('reload-record').event('click'); await h.flush(); assert.equal(h.el('save-draft').disabled, true);
    await h.el(action).event('click'); assert.equal(h.state.calls.length, 1);
  }
});


test('known save success stays locked through pending/failed published or history reads, without duplicate saves', async () => {
  for (const boundary of ['getPublished', 'getHistory']) {
    const h = await harness(); await h.select(); await h.edit('Intentionally saved');
    const pending = deferred(); h.state[boundary] = () => pending.promise;
    const save = h.el('editor-form').event('submit'); await h.flush();
    assert.equal(h.state.draft.revision, 2); assert.equal(h.state.calls.length, 1); assert.equal(h.el('save-draft').disabled, true);
    await h.el('editor-form').event('submit'); await h.el('publish').event('click'); await h.el('withdraw').event('click'); assert.equal(h.state.calls.length, 1);
    pending.resolve({ data: null, error: new Error('Follow-up read failed') }); await save;
    assert.match(h.el('editor-message').textContent, /saved.*revision 2/); assert.match(h.el('editor-message').textContent, /Do not repeat/);
    assert.equal(h.el('save-draft').disabled, true); assert.equal(h.el('publish').disabled, true);
    await h.el('editor-form').event('submit'); assert.equal(h.state.calls.length, 1); assert.equal(h.state.draft.revision, 2);
    h.state[boundary] = null; await h.el('reload-record').event('click'); await h.flush();
    assert.equal(h.el('save-draft').disabled, false); assert.equal(JSON.parse(h.el('payload').value).name, 'Intentionally saved');
    await h.edit('Deliberate next edit'); await h.el('editor-form').event('submit'); await h.flush();
    assert.equal(h.state.calls.length, 2); assert.equal(h.state.draft.revision, 3);
  }
});


test('known-save follow-up read arriving after user change cannot restore its payload or feedback', async () => {
  const h = await harness(); await h.select(); await h.edit('Former user save');
  const pending = deferred(); h.state.getHistory = () => pending.promise;
  const save = h.el('editor-form').event('submit'); await h.flush(); assert.equal(h.state.draft.revision, 2);
  await h.auth({ user: { id: 'staff-b' } }); pending.resolve({ data: [], error: null }); await save;
  assert.equal(h.el('record-id').value, ''); assert.ok(!h.el('payload').value.includes('Former user save'));
  assert.ok(!h.el('editor-message').textContent.includes('revision 2')); assert.equal(h.state.calls.length, 1);
});
