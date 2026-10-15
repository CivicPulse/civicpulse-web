import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { layers, maps, layerUrl } from '../data/maps';
import qgisStyle from '../data/qgis-style.json';
import { commissionColor } from '../data/commission-style';
import { eventDate, eventTime, type CommunityEvent } from '../lib/events';
import { organizationMarker } from '../lib/organization-marker';
import { organizationFor } from '../lib/calendars';
import libraryCounties from '../data/library-counties.json';

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
const choice = byId<HTMLSelectElement>('map-choice');
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
const params = new URLSearchParams(location.search);
let currentMap = maps.find(item => item.id === params.get('map')) || maps.find(item => item.id === (params.has('event') ? 'events' : 'voting'))!;
let selected = new Set<string>(currentMap.layers);
const requestedLayers = params.get('layers');
if (requestedLayers !== null) {
  const valid = requestedLayers.split(',').filter(id => layers.some(layer => layer.id === id));
  if (valid.length || requestedLayers === '') selected = new Set(valid);
}

function recordStatus(feature: Feature) {
  const value = feature.properties?.active;
  return value ? String(value) : 'Activity not recorded';
}
function featureTitle(feature: Feature, source: string) {
  const name = String(feature.properties?.name || layers.find(item => item.id === source)!.name);
  if (source === 'commission-districts') return `${name} · ${feature.properties?.repname1 || 'Commissioner not recorded'}`;
  const code = feature.properties?.precinctid || feature.properties?.pollingid;
  return code ? `${name} (${code})` : name;
}
function popup(feature: Feature, title: string, source: string) {
  const element = document.createElement('div');
  const heading = document.createElement('h3'); heading.textContent = title;
  element.append(heading);
  const properties = feature.properties || {};
  const add = (text: string) => { const p = document.createElement('p'); p.textContent = text; element.append(p); };
  if (source === 'recreation-centers') {
    add(String(properties.fulladd));
    const hoursHeading = document.createElement('h4'); hoursHeading.textContent = 'Published hours'; element.append(hoursHeading);
    const hoursList = document.createElement('ul');
    for (const hours of properties.hours || []) { const item = document.createElement('li'); item.textContent = String(hours); hoursList.append(item); }
    element.append(hoursList);
    const amenitiesHeading = document.createElement('h4'); amenitiesHeading.textContent = 'Amenities'; element.append(amenitiesHeading);
    const amenitiesList = document.createElement('ul');
    for (const amenity of properties.amenities || []) { const item = document.createElement('li'); item.textContent = String(amenity); amenitiesList.append(item); }
    element.append(amenitiesList);
    add(`County information checked ${properties.sourceChecked}. Confirm hours before visiting. Map point is an approximate street-address location.`);
    const links = document.createElement('p');
    const sourceLink = document.createElement('a'); sourceLink.href = String(properties.sourceUrl); sourceLink.textContent = 'County recreation directory';
    const directions = document.createElement('a'); directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${properties.street}, Macon, GA`)}`; directions.textContent = 'Get directions';
    links.append(sourceLink, document.createElement('br'), directions); element.append(links);
  } else if (source === 'libraries') {
    add(String(properties.county));
    add(String(properties.fulladd));
    if (properties.kind === 'book-locker') add('Self-service book locker');
    if (properties.phone) {
      const line = document.createElement('p'); const link = document.createElement('a');
      link.href = `tel:${String(properties.phone).replace(/[^\d+]/g, '')}`; link.textContent = String(properties.phone); line.append(link); element.append(line);
    }
    for (const [index, schedule] of (properties.hours as {label: string; lines: string[]}[]).entries()) {
      const section = index ? document.createElement('details') : document.createElement('div');
      const label = document.createElement(index ? 'summary' : 'h4'); label.textContent = schedule.label; section.append(label);
      const list = document.createElement('ul');
      for (const hours of schedule.lines) { const line = document.createElement('li'); line.textContent = hours; list.append(line); }
      section.append(list); element.append(section);
    }
    add(`MGRLS hours checked ${properties.sourceChecked}. Confirm holiday hours before visiting. Map point is approximate.`);
    const actions = document.createElement('p');
    const sourceLink = document.createElement('a'); sourceLink.href = String(properties.sourceUrl); sourceLink.textContent = 'Current details from MGRLS';
    const directions = document.createElement('a'); directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(properties.fulladd)}`; directions.textContent = 'Get directions';
    actions.append(sourceLink, document.createElement('br'), directions); element.append(actions);
  } else if (source === 'polling-places') {
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
  } else if (source === 'commission-districts') {
    if (properties.repname1) add(`Commissioner: ${properties.repname1}`);
    if (properties.phone) add(`Phone: ${properties.phone}`);
    if (properties.email) {
      const email = String(properties.email);
      const link = document.createElement('a'); link.href = `mailto:${email.includes('@') ? email : `${email}@maconbibb.us`}`;
      link.textContent = email.includes('@') ? email : `${email}@maconbibb.us`;
      const line = document.createElement('p'); line.append('Email: ', link); element.append(line);
    }
    if (properties.party1) add(`Designation in source: ${properties.party1}`);
    add('Source: Macon-Bibb County Government IT GIS · October 15, 2026 snapshot.');
  } else if (source === 'event-locations') {
    add(String(properties.fulladd || ''));
    add('Approximate venue location. Confirm the meeting point with the organizer.');
    const items = (properties.events || []) as CommunityEvent[];
    const now = Date.now();
    const upcoming = items.filter(item => new Date(item.end).getTime() >= now);
    const shown = [...upcoming, ...items.filter(item => new Date(item.end).getTime() < now).toReversed()];
    const focused = items.find(item => item.id === new URLSearchParams(location.search).get('event'));
    if (focused) { shown.splice(shown.indexOf(focused), 1); shown.unshift(focused); }
    add(upcoming.length ? `${upcoming.length} upcoming events in this saved snapshot.` : 'Past events at this venue.');
    for (const item of shown) {
      const p = document.createElement('p');
      const symbol = organizationMarker([item]);
      if (symbol) { const image = document.createElement('img'); image.src = symbol.url; image.alt = ''; image.width = 22; image.height = 27; image.className = 'popup-event-marker'; p.append(image); }
      const link = document.createElement('a');
      link.href = `/calendar/?event=${encodeURIComponent(item.id)}`;
      link.textContent = `${item.title} · ${eventDate(item.start, { month: 'short', day: 'numeric', year: 'numeric' })} · ${eventTime(item)}${item.allDay ? '' : ' ET'}`;
      p.append(link); element.append(p);
    }
  }
  return element;
}
function reveal(place: Place) {
  const featureLayer = place.layer as L.Marker | L.CircleMarker | L.Polygon;
  if ('getLatLng' in featureLayer) map.setView(featureLayer.getLatLng(), 15, { animate: false });
  else if ('getBounds' in featureLayer) map.fitBounds(featureLayer.getBounds(), { padding: [35, 35], maxZoom: 15, animate: false });
  featureLayer.openPopup();
  mapElement.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  status.textContent = `Showing ${place.title}.`;
}
function renderDirectory() {
  const term = search.value.trim().toLocaleLowerCase();
  const visible = places.filter(place => selected.has(place.source) && `${place.title} ${place.feature.properties?.fulladd || ''} ${place.feature.properties?.county || ''} ${(place.feature.properties?.amenities || []).join(' ')} ${place.source === 'polling-places' ? recordStatus(place.feature) : ''} ${(place.feature.properties?.events || []).map((event: CommunityEvent) => event.title).join(' ')}`.toLocaleLowerCase().includes(term));
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
    const dot = document.createElement('span'); dot.className = 'place-dot'; dot.style.background = place.source === 'commission-districts' ? commissionColor(place.feature.properties?.commdist) : symbology?.color || config.color; dot.setAttribute('aria-hidden', 'true');
    if (place.source === 'polling-places' && symbology && 'icon' in symbology && typeof symbology.icon === 'string') {
      const icon = document.createElement('img'); icon.src = symbology.icon; icon.alt = ''; icon.width = 24; icon.height = 27;
      dot.className = 'place-ballot'; dot.style.background = ''; dot.append(icon);
    }
    const eventSymbol = place.source === 'event-locations' && organizationMarker(place.feature.properties?.events || [], params.get('event'));
    if (eventSymbol) { const icon = document.createElement('img'); icon.src = eventSymbol.url; icon.alt = ''; icon.width = 26; icon.height = 32; dot.className = 'place-ballot'; dot.style.background = ''; dot.append(icon); }
    if (place.source === 'recreation-centers') { const icon = document.createElement('img'); icon.src = '/icons/recreation/center.svg'; icon.alt = ''; icon.width = 26; icon.height = 32; dot.className = 'place-ballot'; dot.style.background = ''; dot.append(icon); }
    if (place.source === 'libraries') {
      const county = libraryCounties.find(county => county.name === place.feature.properties?.county)!;
      const icon = document.createElement('img'); icon.src = county.icon; icon.alt = ''; icon.width = 26; icon.height = 32;
      dot.className = 'place-ballot'; dot.style.background = ''; dot.append(icon);
    }
    const info = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = place.title;
    const subtitle = document.createElement('small'); subtitle.textContent = `${config.name} · ${place.source === 'polling-places' ? recordStatus(place.feature) : place.source === 'event-locations' ? `${organizationFor(place.feature.properties?.organizationId)?.name || 'Community'} · ${place.feature.properties?.events?.length || 0} saved events` : 'Uploaded data'}`;
    if (place.source === 'recreation-centers') subtitle.textContent = `${place.feature.properties?.street} · Macon-Bibb Recreation`;
    if (place.source === 'libraries') subtitle.textContent = `MGRLS · ${place.feature.properties?.county}${place.feature.properties?.kind === 'book-locker' ? ' · Book locker' : ''}`;
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
  choice.value = currentMap.id;
  byId('map-description').textContent = currentMap.description;
  byId('event-map-note').hidden = !selected.has('event-locations');
  byId('event-marker-key').hidden = !selected.has('event-locations');
  byId('library-marker-key').hidden = !selected.has('libraries');
  for (const [id, layer] of loaded) { if (selected.has(id)) layer.addTo(map); else map.removeLayer(layer); }
  for (const check of checks) { check.checked = selected.has(check.value); check.disabled = !loaded.has(check.value); }
  const active = [...selected].filter(id => loaded.has(id));
  status.textContent = `${active.length} ${active.length === 1 ? 'layer' : 'layers'} visible · ${active.length ? active.includes('recreation-centers') ? 'Recreation centers & selected layers' : active.includes('libraries') ? 'MGRLS libraries & selected layers' : active.includes('event-locations') ? 'Event venues & selected layers' : active.includes('commission-districts') ? 'County districts & selected layers' : 'Uploaded voting data' : 'No layers selected'}`;
  if (updateUrl) {
    const next = new URL(location.href); next.searchParams.set('map', currentMap.id); next.searchParams.set('layers', [...selected].join(','));
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
        attribution: config.id === 'recreation-centers' ? '<a href="https://www.maconbibb.us/recreation/recreation-center/">Macon-Bibb County Recreation</a> · <a href="https://geocoding.geo.census.gov/">US Census Geocoder</a>' : config.id === 'libraries' ? '<a href="https://bibblib.org/locations_hours.php">MGRLS</a>' : config.id === 'event-locations' ? '' : '<a href="https://www.maconbibb.us/">Macon-Bibb County Government IT GIS</a>',
        pane: config.kind === 'point' ? 'pointLayers' : 'boundaryLayers',
        style: (feature) => {
          const style = feature && votingStyle(feature, config.id);
          if (config.id === 'voting-precincts' && style) return {
            color: style.outline, weight: style.outlineWidth, opacity: style.outlineOpacity,
            fillColor: style.color, fillOpacity: style.fillOpacity, lineJoin: 'round',
          };
          if (config.id === 'commission-districts') return {
            color: '#374151', weight: 1.8, opacity: .9,
            fillColor: commissionColor(feature?.properties?.commdist), fillOpacity: .38, lineJoin: 'round',
          };
          return { color: config.color, weight: 2, fillColor: config.color, fillOpacity: config.kind === 'point' ? 1 : .13 };
        },
        pointToLayer: (feature, latlng) => {
          if (config.id === 'recreation-centers') return L.marker(latlng, {
            title: featureTitle(feature, config.id), alt: featureTitle(feature, config.id),
            icon: L.icon({ iconUrl: '/icons/recreation/center.svg', className: 'recreation-marker', iconSize: [36, 45], iconAnchor: [18, 43], popupAnchor: [0, -39] }),
          });
          if (config.id === 'libraries') {
            const county = libraryCounties.find(county => county.name === feature.properties?.county)!;
            return L.marker(latlng, { title: featureTitle(feature, config.id), alt: `${featureTitle(feature, config.id)}, ${county.name}`,
              icon: L.icon({ iconUrl: county.icon, className: `library-marker library-${county.id}`, iconSize: [36, 44], iconAnchor: [18, 42], popupAnchor: [0, -38] }),
            });
          }
          const eventSymbol = config.id === 'event-locations' && organizationMarker(feature.properties?.events || [], params.get('event'));
          if (eventSymbol) return L.marker(latlng, {
            title: featureTitle(feature, config.id), alt: `${organizationFor(eventSymbol.organizationId).name} events at ${featureTitle(feature, config.id)}`,
            icon: L.icon({ iconUrl: eventSymbol.url, className: `organization-event-marker org-${eventSymbol.organizationId}${eventSymbol.organizationId === 'mgdsa' ? ' dsa-event-marker' : ''}`, iconSize: [40, 49], iconAnchor: [20, 47], popupAnchor: [0, -43] }),
          });
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
          layer.bindPopup(() => popup(feature, title, config.id), config.id === 'recreation-centers' ? { maxHeight: 200, maxWidth: 280, autoPanPadding: L.point(12, 12) } : ['event-locations', 'libraries'].includes(config.id) ? { maxHeight: 300 } : {});
          if (config.id === 'commission-districts') layer.bindTooltip(title, { sticky: true });
          if (config.id === 'voting-precincts') layer.bindTooltip(String(feature.properties?.precinctid || title), { sticky: true });
          if (config.id === 'event-locations') layer.bindTooltip(title);
          if (config.id === 'libraries' || config.id === 'recreation-centers') layer.bindTooltip(title);
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
  choice.disabled = false;
  sync(); fit();
  const eventId = params.get('event');
  const place = places.find(place => place.source === 'event-locations' && place.feature.properties?.events?.some((item: {id: string}) => item.id === eventId));
  if (place) { selected.add(place.source); sync(); reveal(place); }
}
choice.addEventListener('change', () => {
  currentMap = maps.find(item => item.id === choice.value)!;
  selected = new Set(currentMap.layers.filter(id => loaded.has(id)));
  search.value = '';
  const next = new URL(location.href); next.searchParams.delete('event'); history.replaceState(null, '', next);
  map.closePopup(); sync(); fit();
});
for (const check of checks) check.addEventListener('change', () => { if (check.checked) selected.add(check.value); else selected.delete(check.value); sync(); });
search.addEventListener('input', renderDirectory);
byId('fit-map').addEventListener('click', fit);
byId('retry-map').addEventListener('click', () => location.reload());
byId<HTMLInputElement>('basemap').addEventListener('change', event => {
  if ((event.target as HTMLInputElement).checked) tiles.addTo(map);
  else { map.removeLayer(tiles); tileError.hidden = true; }
});
void init();
