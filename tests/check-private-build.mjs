import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { PRIVATE_LOCATION } from '../src/lib/private-event-policy.mjs';

const root = path.resolve('dist');
const publicFiles = [];
async function collect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) await collect(target);
    else publicFiles.push(target);
  }
}
await collect(root);

const paths = publicFiles.map(file => path.relative(root, file).split(path.sep).join('/'));
assert.equal(paths.some(file => file.endsWith('mobilize-events.json')), false);
const textualOutputs = await Promise.all(publicFiles
  .filter(file => /\.(?:html|json|geojson|ics|js|css|txt|xml)$/u.test(file))
  .map(async file => [file, await readFile(file, 'utf8')]));
assert.equal(textualOutputs.some(([, content]) => content.includes('PRIVATE_ADDRESS_SENTINEL_9F42')), false);
assert(textualOutputs.some(([file, content]) => file.endsWith('.html') && content.includes(PRIVATE_LOCATION)));

const events = JSON.parse(await readFile('src/data/mobilize-events.public.json', 'utf8'));
const privateEvents = events.filter(event => event.addressPrivate === true);
assert.equal(privateEvents.length, 81);
for (const event of privateEvents) {
  const file = path.join(root, 'events', `${event.id}.ics`);
  const ics = await readFile(file, 'utf8');
  assert(ics.includes(`LOCATION:${PRIVATE_LOCATION}`));
  assert.equal(ics.includes('\nGEO:'), false);
}
const fullCalendar = await readFile(path.join(root, 'events.ics'), 'utf8');
assert.equal([...fullCalendar.matchAll(/^LOCATION:Private location — see organizer for details$/gmu)].length, privateEvents.length);
assert.equal(fullCalendar.includes('\nGEO:'), false);

const geojson = JSON.parse(await readFile(path.join(root, 'data/calendar-events.geojson'), 'utf8'));
for (const feature of geojson.features) {
  for (const event of feature.properties.events) {
    assert.notEqual(event.addressPrivate, true);
    assert.notEqual(event.isVirtual, true);
  }
}
const privateIds = new Set(privateEvents.map(event => event.id));
assert.equal(geojson.features.some(feature => feature.properties.events.some(event => privateIds.has(event.id))), false);
process.stdout.write(`Verified ${privateEvents.length} private event pages, ${geojson.features.length} public map features, and ${publicFiles.length} static files.\n`);
