import snapshot from './education-transit.json';
export const officialLayerIds = new Set(snapshot.datasets.map(source => source.id));
export const schoolTypeLayers = [
  { id: 'schools-elementary', name: 'Elementary schools', description: '22 locations · Elementary School in source', color: '#b45a16', icon: '/icons/schools/elementary.svg', kind: 'point' },
  { id: 'schools-middle', name: 'Middle schools', description: '6 locations · Middle School in source', color: '#2166ac', icon: '/icons/schools/middle.svg', kind: 'point' },
  { id: 'schools-high', name: 'High schools', description: '6 locations · High School in source', color: '#6a51a3', icon: '/icons/schools/high.svg', kind: 'point' },
  { id: 'schools-pre-k', name: 'Pre-K schools', description: '1 location · Pre-K in source', color: '#c51b7d', icon: '/icons/schools/pre-k.svg', kind: 'point' },
  { id: 'schools-administration', name: 'Administration & other facilities', description: '7 locations · Administration in source', color: '#5a5a5a', icon: '/icons/schools/administration.svg', kind: 'point' },
  { id: 'schools-specialty', name: 'Specialty schools', description: '1 location · Specialty School in source', color: '#1b9e77', icon: '/icons/schools/specialty.svg', kind: 'point' },
] as const;
export const schoolPointLayerIds = schoolTypeLayers.map(layer => layer.id);
export function isSchoolPointLayer(id: string) { return schoolTypeLayers.some(layer => layer.id === id); }
export function schoolIcon(id: string) { return schoolTypeLayers.find(layer => layer.id === id)?.icon || '/icons/schools/school.svg'; }
export const educationTransitLayers = [
  { id: 'rapid-service-area', name: 'Rapid Transit service area', description: '4 published on-demand service zones', color: '#e6ab02', kind: 'area' },
  ...schoolTypeLayers,
  { id: 'school-zones-elementary', name: 'Elementary attendance zones', description: '23 polygons · source school year 2025–26', color: '#2166ac', kind: 'area' },
  { id: 'school-zones-middle', name: 'Middle attendance zones', description: '6 polygons · source school year 2025–26', color: '#1b9e77', kind: 'area' },
  { id: 'school-zones-high', name: 'High attendance zones', description: '6 polygons · source school year 2025–26', color: '#c51b7d', kind: 'area' },
  { id: 'school-board-districts', name: 'School-board districts', description: '6 geographic districts and source member names', color: '#6a51a3', kind: 'area' },
  { id: 'transit-routes', name: 'Transit routes', description: '10 routes with 29 path variants · scheduled service', color: '#26726b', kind: 'line' },
  { id: 'transit-stops', name: 'Transit stops', description: '854 stops with scheduled route connections', color: '#26726b', kind: 'point' },
] as const;
export const educationTransitMaps = [
  { id: 'rapid', name: 'MBCTA Rapid service area', description: 'Published on-demand service zones from MBCTA Rapid’s own map: Downtown, South, East and Northwest Bibb. Both pickup and destination must be inside active service areas.', layers: ['rapid-service-area'] },
  { id: 'schools', name: 'Schools by type', description: '43 district-listed locations, grouped by their official source type. Toggle elementary, middle, high, pre-K, administration and specialty locations independently.', layers: [...schoolPointLayerIds] },
  { id: 'school-elementary', name: 'Elementary attendance zones', description: 'Published elementary boundaries with elementary school locations. The source labels these zones 2025–26; confirm enrollment assignments with BCSD.', layers: ['schools-elementary', 'school-zones-elementary'] },
  { id: 'school-middle', name: 'Middle attendance zones', description: 'Published middle-school boundaries with middle school locations. The source labels these zones 2025–26; confirm enrollment assignments with BCSD.', layers: ['schools-middle', 'school-zones-middle'] },
  { id: 'school-high', name: 'High attendance zones', description: 'Published high-school boundaries with high school locations. The source labels these zones 2025–26; confirm enrollment assignments with BCSD.', layers: ['schools-high', 'school-zones-high'] },
  { id: 'school-board', name: 'School-board districts', description: 'Six geographic school-board districts from the district-linked GIS map. Member names are those in the saved source.', layers: ['school-board-districts'] },
  { id: 'transit', name: 'Macon-Bibb transit', description: 'Official scheduled bus routes and stops from the transit authority’s GTFS feed. Route colors follow the authority’s data; this is not a live-arrival map.', layers: ['transit-routes', 'transit-stops'] },
];
export const mapLayerGroups = [
  { id: 'community', name: 'Community & elections' },
  { id: 'schools', name: 'School locations by type' },
  { id: 'education', name: 'Attendance & school-board districts' },
  { id: 'transit', name: 'Transit routes & stops' },
];
export function layerGroup(id: string) {
  return (id === 'schools' || id.startsWith('schools-')) ? 'schools' : id.startsWith('school') ? 'education' : (id.startsWith('transit-') || id === 'rapid-service-area') ? 'transit' : 'community';
}
export const schoolAttribution = '<a href="https://www.bcsdk12.net/about-us">Bibb County School District</a> · <a href="https://www.middlegeorgiarc.org/">Middle Georgia Regional Commission</a>';
export const rapidAttribution = '<a href="https://rapid.mbcta.net/">MBCTA Rapid Transit</a> · <a href="https://www.google.com/maps/d/viewer?mid=1XRJZHA2YN6PVYQcTneJiPw_QS1S6g9E">Published service-area map</a>';
export const transitAttribution = '<a href="https://mbcta.net/routes/">Macon-Bibb County Transit Authority</a>';
const colors = ['#2166ac', '#e66101', '#1b9e77', '#c51b7d', '#e6ab02', '#6a51a3', '#5a5a5a', '#8c510a', '#00a6ca'];
export function officialFeatureColor(properties: Record<string, any>, source: string): string {
  if (source === 'rapid-service-area') return colors[(Number(properties.zoneNumber) - 1) % colors.length] || '#e6ab02';
  if (source === 'schools' || isSchoolPointLayer(source)) return schoolTypeLayers.find(layer => layer.id === source)?.color || '#b45a16';
  if (source === 'transit-stops') return '#26726b';
  if (source === 'transit-routes') return /^[0-9a-f]{6}$/i.test(properties.route_color || '') ? `#${properties.route_color}` : '#26726b';
  const name = String(properties.DistrictID || properties.name || '');
  let hash = 0; for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}
function dateText(raw: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T12:00:00Z`));
}
export const transitServicePeriod = `${dateText(snapshot.transitFeed.serviceStart)} – ${dateText(snapshot.transitFeed.serviceEnd)}`;
export function transitFeedExpired(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).replaceAll('-', '');
  return today > snapshot.transitFeed.serviceEnd;
}
