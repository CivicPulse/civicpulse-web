import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { layers, maps, layerUrl } from '../data/maps';
import qgisStyle from '../data/qgis-style.json';

type PrecinctStyle = (typeof qgisStyle.layers.voting_precincts)['EM1'];
type PollingStyle = (typeof qgisStyle.layers.polling_places)['EM1'];
const precinctStyles: Record<string, PrecinctStyle> = qgisStyle.layers.voting_precincts;
const pollingStyles: Record<string, PollingStyle> = qgisStyle.layers.polling_places;
function votingStyle(feature: Feature, source: string) {
  const code = String(feature.properties?.precinctid || feature.properties?.pollingid || '');
  return source === 'polling-places' ? pollingStyles[code] : source === 'voting-precincts' ? precinctStyles[code] : undefined;
}
import type { FeatureCollection, Feature } from 'geojson';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = byId('map-status');
const error = byId('map-error');
const tileError = byId('tile-error');
const directory = byId('place-list');
const directoryStatus = byId('directory-status');
const search = byId<HTMLInputElement>('place-search');
const mapChoice = byId<HTMLSelectElement>('map-choice');
const checks = [...document.querySelectorAll<HTMLInputElement>('.layer-control input')];
const mapElement = byId('map');
mapElement.replaceChildren();
const map = L.map(mapElement, { scrollWheelZoom: false, fadeAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches, zoomAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches }).setView([32.844, -83.649], 12);
map.createPane('boundaryLayers').style.zIndex = '400';
map.createPane('pointLayers').style.zIndex = '450';
map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
tiles.on('tileerror', () => { tileError.hidden = false; });
const loaded = new Map<string, L.GeoJSON>();
const failures: string[] = [];
type Place = { feature: Feature; layer: L.Layer; source: string; title: string };
const places: Place[] = [];
let selected = new Set<string>(maps[0].layers);
const params = new URLSearchParams(location.search);
const requested = maps.find(item => item.id === params.get('map'));
if (requested) { selected = new Set(requested.layers); mapChoice.value = requested.id; }
const requestedLayers = params.get('layers');
if (requestedLayers !== null) selected = new Set(requestedLayers.split(',').filter(id => layers.some(layer => layer.id === id)));

function recordStatus(feature: Feature) {
  const value = feature.properties?.active;
  return value ? String(value) : 'Activity not recorded';
}
function featureTitle(feature: Feature, source: string) {
  const name = String(feature.properties?.name || layers.find(item => item.id === source)!.name);
  const code = feature.properties?.precinctid || feature.properties?.pollingid;
  return code ? `${name} (${code})` : name;
}
function popup(feature: Feature, title: string, source: string) {
  const element = document.createElement('div');
  const heading = document.createElement('h3'); heading.textContent = title;
  element.append(heading);
  const properties = feature.properties || {};
  const add = (text: string) => { const p = document.createElement('p'); p.textContent = text; element.append(p); };
  if (source === 'polling-places') {
    add([properties.fulladd, properties.city, properties.state, properties.zip].filter(Boolean).join(', '));
    add(`Record activity: ${recordStatus(feature)}`);
    if (properties.operhours) add(`Hours in dataset: ${properties.operhours}`);
    if (properties.handicap) add(`Accessibility in dataset: ${properties.handicap}`);
    if (properties.comments) add(String(properties.comments));
    const precinct = places.find(place => place.source === 'voting-precincts' && place.feature.properties?.pollingid === properties.pollingid);
    if (precinct) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = `Show precinct ${properties.pollingid}`;
      button.addEventListener('click', () => { selected.add(precinct.source); sync(); reveal(precinct); }); element.append(button);
    }
  } else if (source === 'voting-precincts') {
    const polling = places.filter(place => place.source === 'polling-places' && place.feature.properties?.pollingid === properties.pollingid);
    if (properties.county) add(`County: ${properties.county}`);
    for (const place of polling) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${place.feature.properties?.name} · ${recordStatus(place.feature)}`;
      button.addEventListener('click', () => { selected.add(place.source); sync(); reveal(place); }); element.append(button);
    }
    if (!polling.length) add('No matching polling location in the uploaded data.');
  } else add(String(properties.description || 'Sample map feature.'));
  if (layers.find(item => item.id === source)!.sample) {
    const note = document.createElement('small');
    note.textContent = 'Sample data · Location is approximate';
    element.append(note);
  }
  return element;
}
function reveal(place: Place) {
  const featureLayer = place.layer as L.Marker | L.CircleMarker | L.Polygon;
  if ('getLatLng' in featureLayer) map.setView(featureLayer.getLatLng(), 15, { animate: false });
  else if ('getBounds' in featureLayer) map.fitBounds(featureLayer.getBounds(), { padding: [35, 35], maxZoom: 15, animate: false });
  featureLayer.openPopup();
  mapElement.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  status.textContent = `Showing ${place.title}. ${layers.find(layer => layer.id === place.source)!.sample ? 'Sample data; location is approximate.' : 'Uploaded voting data.'}`;
}
function renderDirectory() {
  const term = search.value.trim().toLocaleLowerCase();
  const visible = places.filter(place => selected.has(place.source) && `${place.title} ${place.feature.properties?.fulladd || ''} ${place.source === 'polling-places' ? recordStatus(place.feature) : ''}`.toLocaleLowerCase().includes(term));
  directory.replaceChildren();
  directoryStatus.textContent = `${visible.length} ${visible.length === 1 ? 'feature' : 'features'}${term ? ` matching “${search.value.trim()}”` : ' in selected layers'}`;
  if (!visible.length) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = selected.size ? 'No places match. Try another search or turn on more layers.' : 'Turn on a layer to see places here.';
    directory.append(p); return;
  }
  for (const place of visible) {
    const config = layers.find(layer => layer.id === place.source)!;
    const row = document.createElement('div'); row.className = 'place-row';
    const symbology = votingStyle(place.feature, place.source);
    const dot = document.createElement('span'); dot.className = 'place-dot'; dot.style.background = symbology?.color || config.color; dot.setAttribute('aria-hidden', 'true');
    if (place.source === 'polling-places' && symbology && 'icon' in symbology && typeof symbology.icon === 'string') {
      const icon = document.createElement('img'); icon.src = symbology.icon; icon.alt = ''; icon.width = 24; icon.height = 27;
      dot.className = 'place-ballot'; dot.style.background = ''; dot.append(icon);
    }
    const info = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = place.title;
    const subtitle = document.createElement('small'); subtitle.textContent = `${config.name} · ${config.sample ? 'Sample' : place.source === 'polling-places' ? recordStatus(place.feature) : 'Uploaded data'}`;
    info.append(title, subtitle);
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Show on map'; button.setAttribute('aria-label', `Show ${place.title} on map`); button.addEventListener('click', () => reveal(place));
    row.append(dot, info, button); directory.append(row);
  }
}
function fit() {
  const bounds = L.latLngBounds([]);
  for (const [id, layer] of loaded) if (selected.has(id)) bounds.extend(layer.getBounds());
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
  else map.setView([32.844, -83.649], 12, { animate: false });
}
function sync(updateUrl = true) {
  for (const [id, layer] of loaded) { if (selected.has(id)) layer.addTo(map); else map.removeLayer(layer); }
  for (const check of checks) { check.checked = selected.has(check.value); check.disabled = !loaded.has(check.value); }
  const active = [...selected].filter(id => loaded.has(id));
  const sampleCount = active.filter(id => layers.find(layer => layer.id === id)!.sample).length;
  const sourceLabel = !active.length ? 'No layers selected' : sampleCount === active.length ? 'Sample GeoJSON data' : sampleCount ? 'Uploaded voting data and sample layers' : 'Uploaded voting data';
  status.textContent = `${active.length} ${active.length === 1 ? 'layer' : 'layers'} visible · ${sourceLabel}`;
  byId('map-description').textContent = maps.find(item => item.id === mapChoice.value)!.description;
  if (updateUrl) {
    const next = new URL(location.href); next.searchParams.set('map', mapChoice.value); next.searchParams.set('layers', [...selected].join(','));
    history.replaceState(null, '', next);
  }
  renderDirectory();
}
async function init() {
  await Promise.all(layers.map(async config => {
    try {
      const response = await fetch(layerUrl(config.id));
      if (!response.ok) throw new Error('Could not load layer');
      const data = await response.json() as FeatureCollection;
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid layer');
      const group = L.geoJSON(data, {
        pane: config.kind === 'point' ? 'pointLayers' : 'boundaryLayers',
        style: (feature) => {
          const style = feature && votingStyle(feature, config.id);
          if (config.id === 'voting-precincts' && style) return {
            color: style.outline, weight: style.outlineWidth, opacity: style.outlineOpacity,
            fillColor: style.color, fillOpacity: style.fillOpacity, lineJoin: 'round',
          };
          return { color: config.color, weight: config.kind === 'line' ? 4 : 2, fillColor: config.color, fillOpacity: config.kind === 'point' ? 1 : .13, dashArray: config.kind === 'line' ? '8 5' : undefined };
        },
        pointToLayer: (feature, latlng) => {
          const style = pollingStyles[String(feature.properties?.pollingid || '')];
          if (config.id === 'polling-places' && style) {
            const width = style.size;
            const height = width * 72 / 64;
            return L.marker(latlng, { pane: 'markerPane', title: featureTitle(feature, config.id), alt: featureTitle(feature, config.id),
              icon: L.icon({ iconUrl: style.icon, iconSize: [width, height], iconAnchor: [width / 2, height], popupAnchor: [0, -height + 4] }),
            });
          }
          return L.circleMarker(latlng, { pane: 'pointLayers', radius: 8, color: '#fffcf6', weight: 2, fillColor: config.color, fillOpacity: 1 });
        },
        onEachFeature: (feature, layer) => {
          const title = featureTitle(feature, config.id);
          layer.bindPopup(() => popup(feature, title, config.id));
          if (config.id === 'voting-precincts') layer.bindTooltip(String(feature.properties?.precinctid || title), { sticky: true });
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
  sync(false); fit();
  const focus = params.get('event');
  if (focus) {
    const place = places.find(item => item.feature.properties?.id === focus);
    if (place) { selected.add(place.source); sync(false); reveal(place); }
  }
}
mapChoice.addEventListener('change', () => { selected = new Set(maps.find(item => item.id === mapChoice.value)!.layers); search.value = ''; sync(); fit(); });
for (const check of checks) check.addEventListener('change', () => { if (check.checked) selected.add(check.value); else selected.delete(check.value); sync(); });
search.addEventListener('input', renderDirectory);
byId('fit-map').addEventListener('click', fit);
byId('retry-map').addEventListener('click', () => location.reload());
byId<HTMLInputElement>('basemap').addEventListener('change', event => {
  if ((event.target as HTMLInputElement).checked) tiles.addTo(map);
  else { map.removeLayer(tiles); tileError.hidden = true; }
});
void init();
