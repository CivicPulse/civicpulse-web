import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const sources = [
  ['recreation-centers', 'recreation-centers', 'Point', 'id'],
  ['polling_places', 'polling-places', 'Point', 'pollingid'],
  ['voting_precincts', 'voting-precincts', 'MultiPolygon', 'precinctid'],
];
function validCoordinates(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (typeof value[0] === 'number') return value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
  return value.every(validCoordinates);
}
for (const [source, , geometry, key] of sources) {
  const raw = await readFile(new URL(`public/data/${source}.geojson`, root), 'utf8');
  const data = JSON.parse(raw);
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) throw new Error(`${source}: expected a nonempty FeatureCollection`);
  for (const feature of data.features) {
    if (feature.type !== 'Feature' || feature.geometry?.type !== geometry || !validCoordinates(feature.geometry.coordinates) || !feature.properties?.[key]) throw new Error(`${source}: invalid ${geometry} feature or missing ${key}; expected WGS84 coordinates`);
  }
  console.log(`${source}: validated ${data.features.length} features`);
}
const official = JSON.parse(await readFile(new URL('src/data/education-transit.json', root), 'utf8'));
for (const source of official.datasets) {
  const data = JSON.parse(await readFile(new URL(`public${source.data}`, root), 'utf8'));
  if (data.type !== 'FeatureCollection' || data.features.length !== source.featureCount || !data.features.length) throw new Error(`${source.id}: wrong feature count`);
  const ids = new Set();
  for (const feature of data.features) {
    if (!feature.id || ids.has(feature.id) || !feature.properties.name || !feature.properties.attribution || !validCoordinates(feature.geometry?.coordinates) || !['Point','Polygon','MultiPolygon','MultiLineString'].includes(feature.geometry?.type)) throw new Error(`${source.id}: invalid official feature`);
    ids.add(feature.id);
    if (feature.properties.zoneStatus === 'proposed') throw new Error('Proposed school zones must be excluded');
  }
  console.log(`${source.id}: validated ${data.features.length} features`);
}
