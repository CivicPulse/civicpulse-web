import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const details = await import(`data:text/javascript;base64,${Buffer.from(compile(await readFile(new URL('../src/lib/published-map-details.ts', import.meta.url), 'utf8'))).toString('base64')}`);
const controller = compile(await readFile(new URL('../src/scripts/cms-map.ts', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const tick = () => new Promise(resolve => setImmediate(resolve));
class Element {
  ownerDocument = { createElement: () => new Element() };
  children = []; listeners = new Map(); hidden = true; value = ''; textContent = ''; style = {}; dataset = {};
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(key, value) { this.listeners.set(key, value); }
  querySelector() { return this.children[0] ||= new Element(); }
  focus() {} scrollIntoView() {}
}
async function run({ empty = false, noMaps = false, fail = false } = {}) {
  const nodes = new Map();
  const byId = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const ids = ['__proto__', 'constructor'];
  const layers = empty ? [] : ids.map(id => ({ id, name: `${id} published layer`, kind: 'point', color: '#123456' }));
  const maps = empty || noMaps ? [] : [{ id: '__proto__', name: 'Published map', description: 'Published description', layers: [ids[0]] }, { id: 'other', name: 'Other', description: 'Other description', layers: [ids[1]] }];
  const checks = layers.map(item => Object.assign(new Element(), { value: item.id }));
  const requests = [], groups = [], popups = [];
  const map = { createPane: () => ({ style: {} }), attributionControl: { setPrefix() {} }, removeLayer() {}, fitBounds() {}, setView() { return this; }, closePopup() {} };
  const L = { map: () => map, tileLayer: () => ({ addTo: () => ({ on() {} }) }), point() {}, circleMarker: () => ({}),
    latLngBounds: () => ({ extend() {}, isValid: () => true }),
    geoJSON(data, options) {
      for (const feature of data.features) {
        const layer = { bindPopup(callback) { popups.push(callback); }, bindTooltip() {}, getLatLng() {}, openPopup() {}, getPopup() {} };
        options.pointToLayer(feature, [0, 0]); options.style(feature); options.onEachFeature(feature, layer);
      }
      const group = { addTo() {}, getBounds() {} }; groups.push(group); return group;
    } };
  const document = { getElementById: id => ['layer-selection', 'map-settings'].includes(id) ? null : byId(id), createElement: () => new Element(), querySelectorAll: () => checks, querySelector: () => null };
  const location = { search: '', href: 'https://example.org/maps/', hash: '', reload() {} };
  const fetch = async url => { requests.push(url); return { ok: !fail, json: async () => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { name: 'Published stop', stop_id: '42', routeNumbers: ['9'], routeNames: ['Published route'], sourceUrl: 'https://example.org/source' } }] }) }; };
  new Function('L','layers','maps','layerUrl','appendPublishedDetails','publishedFeatureColor','document','matchMedia','location','history','fetch',controller)(L,layers,maps,id => `/_content/fixture/${encodeURIComponent(id)}`,details.appendPublishedDetails,details.publishedFeatureColor,document,() => ({ matches: false }),location,{ replaceState() {} },fetch);
  await tick(); await tick();
  return { nodes, byId, requests, groups, checks, popups };
}
test('actual CMS map controller selects arbitrary published IDs, searches, reveals and changes maps without local routing', async () => {
  const state = await run();
  assert.deepEqual(state.requests, ['/_content/fixture/__proto__']);
  assert.match(state.byId('map-status').textContent, /1 layer visible/);
  assert.equal(state.byId('place-list').children.length, 1);
  const popup = state.popups[0]();
  assert.ok(popup.children.some(line => line.textContent === 'Stop ID: 42'));
  assert.ok(popup.children.some(line => line.textContent === 'Scheduled route: 9'));
  state.byId('place-search').value = 'no match'; state.byId('place-search').listeners.get('input')();
  assert.match(state.byId('place-list').children[0].textContent, /No places match/);
  state.byId('map-choice').value = 'other'; await state.byId('map-choice').listeners.get('change')();
  assert.deepEqual(state.requests, ['/_content/fixture/__proto__', '/_content/fixture/constructor']);
  assert.equal(state.byId('map-description').textContent, 'Other description');
});
test('actual CMS map controller supports empty catalogs and static layer failures without fallback', async () => {
  const empty = await run({ empty: true }); assert.deepEqual(empty.requests, []); assert.match(empty.byId('map-status').textContent, /0 layers/);
  const unlisted = await run({ noMaps: true }); assert.equal(unlisted.requests.length, 0);
  unlisted.checks[0].checked = true; await unlisted.checks[0].listeners.get('change')();
  assert.equal(unlisted.requests.length, 1); assert.match(unlisted.byId('map-status').textContent, /1 layer/);
  const failed = await run({ fail: true }); assert.equal(failed.requests.length, 1); assert.equal(failed.byId('map-error').hidden, false); assert.match(failed.byId('map-status').textContent, /0 layers/);
});
test('published popup preserves source text, validates links and uses published transit properties only', () => {
  for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,unsafe', 'not a URL']) {
    const element = new Element(); details.appendPublishedDetails(element, { properties: { sourceUrl, attribution: '<unsafe>', stop_id: '7' } });
    assert.ok(element.children.some(line => line.textContent === 'Source: <unsafe>'));
    assert.equal(element.children.flatMap(line => line.children).length, 0);
  }
  const element = new Element(); details.appendPublishedDetails(element, { properties: { sourceUrl: 'https://example.org/a%2Fb', routeNames: ['Route'], route_color: '00ff00' } });
  assert.equal(element.children.at(-1).children[0].href, 'https://example.org/a%2Fb');
  assert.equal(details.publishedFeatureColor({ route_color: '00ff00' }, '#123456'), '#00ff00');
  assert.equal(details.publishedFeatureColor({ route_color: 'invalid' }, '#123456'), '#123456');
});
