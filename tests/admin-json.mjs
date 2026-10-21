import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createCivicPulseClient, ApiError } from '../src/vendor/civicpulse-api/client.mjs';
import { createCmsJsonFetch, parseCmsJson, CmsJsonValueError, isCmsJsonValueError } from '../src/lib/admin-json.mjs';
import { canPublishReviewedDraft } from '../src/lib/admin-publish-gate.mjs';
const url = 'https://fixture.example.test';
const tokens = ['1e-400', '-1e-400', '0.1234567890123456789', '9007199254740993', '1e400', '1.0000000000000001'];

test('raw decimal numeric values reject rounding, underflow and overflow before native parsing; equivalent notation works', () => {
  for (const token of tokens) assert.throws(() => parseCmsJson(`{"nested":{"array":[${token}]},"private":"DO_NOT_LOG"}`), error => error instanceof CmsJsonValueError && !error.message.includes(token) && !error.message.includes('DO_NOT_LOG'));
  for (const token of ['0', '-0.0', '0e99999999999999999999', '1.0000', '1e3', '1E+03', '0.125', '-83.63212434307292', '9007199254740992']) assert.equal(parseCmsJson(`{"value":${token}}`).value, Number(token));
  const strings = { source: '1e-400', escaped: '\\" 0.1234567890123456789 "', unicode: '\\u0031e400' };
  assert.deepEqual(parseCmsJson(JSON.stringify(strings)), strings);
  assert.throws(() => parseCmsJson('['.repeat(129) + '0' + ']'.repeat(129)), CmsJsonValueError);
  assert.throws(() => parseCmsJson('1' + '0'.repeat(4096)), CmsJsonValueError);
  assert.throws(() => parseCmsJson(' '.repeat(16 * 1024 * 1024 + 1)), CmsJsonValueError);
  assert.throws(() => parseCmsJson('{invalid secret-fragment}'), error => !error.message.includes('secret-fragment'));
});

test('guarded native Response preserves status/headers/args, validates text/json/clones outside fetch, no guard retries', async () => {
  let calls = 0; const init = { method: 'GET', signal: new AbortController().signal, headers: { apikey: 'public-fixture' } };
  const fetch = createCmsJsonFetch(async (input, options) => { calls++; assert.equal(options, init); assert.equal(input, url + '/rest/v1/content'); return new Response('{"x":1.0000}', { status: 206, headers: { 'content-type': 'application/json', 'x-fixture': 'retained' } }); }, url);
  const response = await fetch(url + '/rest/v1/content', init);
  assert.ok(response instanceof Response); assert.equal(response.status, 206); assert.equal(response.headers.get('x-fixture'), 'retained');
  assert.deepEqual(await response.clone().json(), { x: 1 }); assert.equal(await response.text(), '{"x":1.0000}'); assert.equal(calls, 1);
});

test('ACTUAL vendored getDraft and installed Supabase content parser reject raw nested unsafe numbers without retry', async () => {
  for (const token of tokens) {
    let draftCalls = 0, publicCalls = 0;
    const draftFetch = createCmsJsonFetch(async () => { draftCalls++; return new Response(`[{"kind":"organization","id":"x","revision":1,"payload":{"id":"x","name":"Name","extra":{"n":${token}}}}]`, { headers: { 'content-type': 'application/json' } }); }, url);
    const client = createCivicPulseClient({ url, publishableKey: 'public-fixture', fetch: draftFetch });
    await assert.rejects(client.getDraft('organization', 'x'), CmsJsonValueError); assert.equal(draftCalls, 1);
    const publicFetch = createCmsJsonFetch(async () => { publicCalls++; return new Response(`{"kind":"organization","id":"x","revision":1,"payload":{"id":"x","name":"Name","extra":{"n":${token}}}}`, { headers: { 'content-type': 'application/json' } }); }, url);
    const sdk = createClient(url, 'public-fixture', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: publicFetch } });
    const result = await sdk.from('content').select('*').eq('kind', 'organization').eq('id', 'x').maybeSingle();
    assert.equal(result.data, null); assert.ok(isCmsJsonValueError(result.error)); assert.equal(publicCalls, 1);
  }
});

test('ordinary/equivalent raw values and HTTP error semantics survive actual clients', async () => {
  const raw = '{"kind":"organization","id":"x","revision":1,"payload":{"id":"x","name":"Name","a":1.0000,"b":1E+03,"c":0.125}}';
  const client = createCivicPulseClient({ url, publishableKey: 'public-fixture', fetch: createCmsJsonFetch(async () => new Response('[' + raw + ']'), url) });
  assert.deepEqual((await client.getDraft('organization', 'x')).payload, { id: 'x', name: 'Name', a: 1, b: 1000, c: .125 });
  const sdk = createClient(url, 'public-fixture', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: createCmsJsonFetch(async () => new Response(raw), url) } });
  assert.equal((await sdk.from('content').select('*').maybeSingle()).data.payload.b, 1000);
  const failing = createCivicPulseClient({ url, publishableKey: 'public-fixture', fetch: createCmsJsonFetch(async () => new Response('{"code":"40001","message":"Revision conflict"}', { status: 409 }), url) });
  await assert.rejects(failing.getDraft('organization', 'x'), error => error instanceof ApiError && error.status === 409 && error.code === '40001');
});

test('actual vendored client preserves PT409 and rejects malformed, non-409, and transport cases without retry', async () => {
  let calls = 0;
  const clientFor = fetch => createCivicPulseClient({ url, publishableKey: 'public-fixture', fetch: createCmsJsonFetch(async () => { calls++; return fetch(); }, url) });
  const pt409 = clientFor(async () => new Response('{"code":"PT409","message":"Revision conflict"}', { status: 409 }));
  await assert.rejects(pt409.getDraft('organization', 'x'), error => error instanceof ApiError && error.status === 409 && error.code === 'PT409' && error.detail.code === error.code);
  assert.equal(calls, 1);
  const wrongStatus = clientFor(async () => new Response('{"code":"PT409","message":"Revision conflict"}', { status: 500 }));
  await assert.rejects(wrongStatus.getDraft('organization', 'x'), error => error instanceof ApiError && error.status === 500 && error.code === 'PT409');
  assert.equal(calls, 2);
  const malformed = clientFor(async () => new Response('not-json', { status: 409 }));
  await assert.rejects(malformed.getDraft('organization', 'x'), error => error instanceof ApiError && error.status === 409 && error.code === undefined);
  assert.equal(calls, 3);
  const transport = createCivicPulseClient({ url, publishableKey: 'public-fixture', fetch: async () => { calls++; throw new Error('network unavailable'); } });
  await assert.rejects(transport.getDraft('organization', 'x'), /network unavailable/);
  assert.equal(calls, 4);
});

test('Advanced JSON with a rounded-to-baseline number cannot pass the handler publish gate', () => {
  const draft = { kind: 'organization', id: 'x', revision: 1, payload: { id: 'x', n: 0 } };
  assert.equal(canPublishReviewedDraft({ role: 'admin', kind: 'organization', id: 'x', expectedRevision: 1, draft, payloadText: '{"id":"x","n":1e-400}' }), false);
  assert.equal(canPublishReviewedDraft({ role: 'admin', kind: 'organization', id: 'x', expectedRevision: 1, draft, payloadText: '{"id":"x","n":0.0000}' }), true);
});

test('ACTUAL clients preserve non-2xx conflict classification with unsafe numeric error details without retries', async () => {
  const body = '{"code":"40001","message":"Revision conflict","details":{"n":1e-400}}';
  let draftCalls = 0, publicCalls = 0;
  const client = createCivicPulseClient({ url, publishableKey: 'public-fixture', fetch: createCmsJsonFetch(async () => {
    draftCalls++; return new Response(body, { status: 409, headers: { 'content-type': 'application/json' } });
  }, url) });
  await assert.rejects(client.getDraft('organization', 'x'), error => error instanceof ApiError && error.status === 409 && error.code === '40001' && !isCmsJsonValueError(error));
  assert.equal(draftCalls, 1);
  const sdk = createClient(url, 'public-fixture', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: createCmsJsonFetch(async () => {
    publicCalls++; return new Response(body, { status: 409, headers: { 'content-type': 'application/json' } });
  }, url) } });
  const result = await sdk.from('content').select('*').maybeSingle();
  assert.equal(result.status, 409); assert.equal(result.error.code, '40001');
  assert.equal(result.data, null); assert.equal(isCmsJsonValueError(result.error), false);
  assert.equal(publicCalls, 1);
});

test('project REST scope leaves other origins and Auth transport untouched', async () => {
  const guard = createCmsJsonFetch(async () => new Response('{"n":1e-400}'), url);
  assert.equal((await (await guard(url + '/auth/v1/user')).json()).n, 0);
  assert.equal((await (await guard('https://other.example.test/rest/v1/content')).json()).n, 0);
  const response = await guard(url + '/rest/v1/content');
  await assert.rejects(response.clone().text(), CmsJsonValueError);
  await assert.rejects(response.json(), CmsJsonValueError);
});
