// CMS maps consume only the verified published catalog and snapshot-bound files.
// No local GIS helpers, feed metadata, IDs or fallback datasets enter this graph.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { layers, maps, layerUrl } from '../data/maps';
import type { FeatureCollection, Feature } from 'geojson';
import { appendPublishedDetails, publishedFeatureColor } from '../lib/published-map-details';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = byId('map-status');
const error = byId('map-error');
const tileError = byId('tile-error');
const directory = byId('place-list');
const directoryStatus = byId('directory-status');
const search = byId<HTMLInputElement>('place-search');
const choice = byId<HTMLSelectElement>('map-choice');
const checks = [...document.querySelectorAll<HTMLInputElement>('.layer-control input')];
const mapElement = byId('map');
mapElement.replaceChildren();
const map = L.map(mapElement, { scrollWheelZoom: false, fadeAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches, zoomAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches }).setView([32.844, -83.649], 12);
map.createPane('boundaryLayers').style.zIndex = '400';
map.createPane('pointLayers').style.zIndex = '450';
map.createPane('routeLayers').style.zIndex = '425';
map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
tiles.on('tileerror', () => { tileError.hidden = false; });
const loaded = new Map<string, L.GeoJSON>();
const failures: string[] = [];
type Place = { feature: Feature; layer: L.Layer; source: string; title: string };
const places: Place[] = [];
const params = new URLSearchParams(location.search);
let currentMap = maps.find(item => item.id === params.get('map')) || maps[0] || { id: '', name: 'No published maps', description: 'No maps are published in this snapshot.', layers: [] };
let selected = new Set<string>(currentMap.layers);
const requestedLayers = params.get('layers');
if (requestedLayers !== null) {
  const valid = requestedLayers.split(',').flatMap(id => [id]).filter(id => layers.some(layer => layer.id === id));
  if (valid.length || requestedLayers === '') selected = new Set(valid);
}

function featureTitle(feature: Feature, source: string) {
  const p = feature.properties || {};
  return String(p.name || p.title || p.stop_name || p.route_long_name || p.route_short_name || layers.find(item => item.id === source)?.name || source);
}
function popup(feature: Feature, title: string) {
  const element = document.createElement('div');
  const heading = document.createElement('h3'); heading.textContent = title; element.append(heading);
  appendPublishedDetails(element, feature);
  return element;
}
function renderDirectory() {
  const term = search.value.trim().toLocaleLowerCase();
  const visible = places.filter(place => selected.has(place.source) && `${place.title} ${JSON.stringify(place.feature.properties || {})}`.toLocaleLowerCase().includes(term));
  directory.replaceChildren();
  directoryStatus.textContent = `${visible.length} ${visible.length === 1 ? 'feature' : 'features'}${term ? ' matching your search' : ' in selected layers'}`;
  if (!visible.length) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = selected.size ? 'No places match. Try another search or turn on more layers.' : 'Turn on a layer to see places here.';
    directory.append(p); return;
  }
  for (const place of visible) {
    const config = layers.find(layer => layer.id === place.source)!;
    const row = document.createElement('div'); row.className = 'place-row';
    const dot = document.createElement('span'); dot.className = 'place-dot'; dot.style.background = publishedFeatureColor(place.feature.properties || {}, config.color); dot.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = place.title;
    const subtitle = document.createElement('small'); subtitle.textContent = `${config.name} · Published snapshot`;
    info.append(title, subtitle);
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Show on map'; button.setAttribute('aria-label', `Show ${place.title} on map`); button.addEventListener('click', () => reveal(place));
    row.append(dot, info, button); directory.append(row);
  }
}
function sync(updateUrl = true, _resetGroups = false) {
  choice.value = currentMap.id;
  byId('layer-selection').textContent = `Map layers · ${selected.size} selected`;
  byId('map-description').textContent = currentMap.description;
  for (const [id, layer] of loaded) { if (selected.has(id)) layer.addTo(map); else map.removeLayer(layer); }
  for (const check of checks) { check.checked = selected.has(check.value); check.disabled = failures.includes(layers.find(layer => layer.id === check.value)!.name); }
  const active = [...selected].filter(id => loaded.has(id));
  status.textContent = `${active.length} ${active.length === 1 ? 'layer' : 'layers'} visible · Published snapshot`;
  if (updateUrl) {
    const next = new URL(location.href); next.searchParams.set('map', currentMap.id); next.searchParams.set('layers', [...selected].join(','));
    history.replaceState(null, '', next);
  }
  renderDirectory();
}
async function loadLayers(ids: string[]) {
  await Promise.all(layers.filter(config => ids.includes(config.id) && !loaded.has(config.id)).map(async config => {
    try {
      const response = await fetch(layerUrl(config.id));
      if (!response.ok) throw new Error('Could not load layer');
      const data = await response.json() as FeatureCollection;
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid layer');
      const group = L.geoJSON(data, {
        pane: config.kind === 'line' ? 'routeLayers' : config.kind === 'point' ? 'pointLayers' : 'boundaryLayers',
        style: feature => ({ color: publishedFeatureColor(feature?.properties || {}, config.color), weight: config.kind === 'line' ? 4 : 1.5, fillOpacity: .35 }),
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, { pane: 'pointLayers', radius: 6, color: '#fffcf6', weight: 2, fillColor: publishedFeatureColor(feature.properties || {}, config.color), fillOpacity: 1 }),
        onEachFeature: (feature, layer) => {
          const title = featureTitle(feature, config.id);
          layer.bindPopup(() => popup(feature, title), { maxHeight: 300, maxWidth: 280 });
          layer.bindTooltip(title, { sticky: config.kind !== 'point' });
          places.push({ feature, layer, source: config.id, title });
        },
      });
      loaded.set(config.id, group);
    } catch { failures.push(config.name); selected.delete(config.id); }
  }));
  if (failures.length) {
    error.hidden = false;
    error.querySelector('p')!.textContent = `Could not load: ${failures.join(', ')}. Other layers are still available. Reload to try again.`;
  }
}
async function init() {
  loadingState(); await loadLayers([...selected]); choice.disabled = false; sync(); fit();
  const eventId = params.get('event');
  const place = places.find(place => place.feature.properties?.events?.some((item: {id: string}) => item.id === eventId));
  if (place) reveal(place);
}
function reveal(place: Place) {
  const featureLayer = place.layer as L.Marker | L.CircleMarker | L.Polygon;
  if ('getLatLng' in featureLayer) map.setView(featureLayer.getLatLng(), 15, { animate: false });
  else if ('getBounds' in featureLayer) map.fitBounds(featureLayer.getBounds(), { padding: [35, 35], maxZoom: 15, animate: false });
  featureLayer.openPopup();
  const popupHeading = featureLayer.getPopup()?.getElement()?.querySelector('h3');
  if (popupHeading) { popupHeading.tabIndex = -1; popupHeading.focus({ preventScroll: true }); }
  mapElement.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  status.textContent = `Showing ${place.title}.`;
}
function fit() {
  const bounds = L.latLngBounds([]);
  for (const [id, layer] of loaded) if (selected.has(id)) bounds.extend(layer.getBounds());
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
  else map.setView([32.844, -83.649], 12, { animate: false });
}
function loadingState() {
  choice.disabled = true;
  for (const check of checks) check.disabled = true;
  status.textContent = 'Loading map layers…';
}
choice.addEventListener('change', async () => {
  currentMap = maps.find(item => item.id === choice.value)!;
  selected = new Set(currentMap.layers);
  search.value = '';
  const next = new URL(location.href); next.searchParams.delete('event'); history.replaceState(null, '', next);
  map.closePopup(); sync(true, true); loadingState();
  await loadLayers([...selected]);
  choice.disabled = false; sync(); fit();
});
for (const check of checks) check.addEventListener('change', async () => { if (check.checked) { selected.add(check.value); loadingState(); await loadLayers([check.value]); choice.disabled = false; } else selected.delete(check.value); sync(); });
search.addEventListener('input', renderDirectory);
byId('fit-map').addEventListener('click', fit);
byId('retry-map').addEventListener('click', () => location.reload());
byId<HTMLInputElement>('basemap').addEventListener('change', event => {
  if ((event.target as HTMLInputElement).checked) tiles.addTo(map);
  else { map.removeLayer(tiles); tileError.hidden = true; }
});
void init();

const layerSettings = byId<HTMLDetailsElement>('map-settings');
if (layerSettings) layerSettings.open = matchMedia('(min-width: 601px)').matches;
document.querySelector<HTMLAnchorElement>('.map-shortcuts a[href="#map-settings"]')?.addEventListener('click', () => { if (layerSettings) layerSettings.open = true; });
if (layerSettings && location.hash === '#map-settings') layerSettings.open = true;
