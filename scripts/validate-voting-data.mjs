import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const sources = [
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
