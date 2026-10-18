import { electionLayers, electionMaps } from './election-districts';
import { educationTransitLayers, educationTransitMaps } from './education-transit';
import cms from './cms-published.json';
import { resolvePublicContentSource } from '../lib/content-source.mjs';
import { cmsContentPrefix } from '../lib/cms-release';
// Validate unknown configuration, then keep source selection statically foldable.
resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE);
const useCmsSnapshot = typeof import.meta.env !== 'undefined' && import.meta.env.PUBLIC_CONTENT_SOURCE === 'supabase';
const localLayers = useCmsSnapshot ? [] : [
  ...electionLayers,
  ...educationTransitLayers,
  { id: 'recreation-centers', name: 'Recreation centers', description: '11 county centers with published hours and amenities', color: '#26726b', kind: 'point' },
  { id: 'libraries', name: 'MGRLS libraries', description: '18 library and book-locker locations in seven counties', color: '#2166ac', kind: 'point' },
  { id: 'commission-districts', name: 'Commission districts', description: 'Nine county districts and commissioner contact details', color: '#4d6a8c', kind: 'area' },
  { id: 'event-locations', name: 'Calendar events', description: 'Events grouped at their mapped venues', color: '#8a4565', kind: 'point' },
  { id: 'polling-places', name: 'Polling places', description: 'Uploaded locations and record status', color: '#ae583b', kind: 'point' },
  { id: 'voting-precincts', name: 'Voting precincts', description: 'Uploaded precinct boundaries', color: '#3d704c', kind: 'area' },
] as const;
const localMaps = useCmsSnapshot ? [] : [
  { id: 'voting', name: 'Polling places & precincts', description: 'Uploaded polling locations and voting precincts, including historical records.', layers: ['polling-places', 'voting-precincts'] },
  { id: 'commissioners', name: 'Find your commissioner', description: 'Explore the nine commission districts and commissioner details from Macon-Bibb County Government IT GIS.', layers: ['commission-districts'] },
  { id: 'events', name: 'Community events', description: 'Explore calendar events by venue. Online events and listings without coordinates remain in the calendar.', layers: ['event-locations'] },
  { id: 'recreation', name: 'Macon-Bibb recreation centers', description: 'Explore 11 county recreation, community, senior and boxing centers, with published hours and amenities. Locations are approximate street-address matches.', layers: ['recreation-centers'] },
  { id: 'libraries', name: 'MGRLS libraries', description: 'Find Middle Georgia Regional Library locations, published opening hours and contact details. Book markers are colored by county.', layers: ['libraries'] },
  ...electionMaps,
  ...educationTransitMaps,
] as const;
type CmsLayer = { id: string; name: string; description: string; color: string; kind: string; [key: string]: unknown };
type MapLayer = { id: string; name: string; description: string; color: string; kind: string; [key: string]: unknown };
type CmsMap = { id: string; name: string; description: string; layers: readonly string[]; [key: string]: unknown };
const cmsLayers = cms.layers as unknown as CmsLayer[];
export const cmsLayerIds = new Set(useCmsSnapshot ? cmsLayers.map(layer => layer.id) : []);
export const layers: readonly MapLayer[] = useCmsSnapshot ? cmsLayers : localLayers;
export const maps: readonly CmsMap[] = useCmsSnapshot ? cms.maps as unknown as CmsMap[] : localMaps;

export function layerUrl(id: string) {
  if (useCmsSnapshot) {
    const layer = cmsLayers.find(layer => layer.id === id);
    if (!layer) throw new Error('Layer is absent from the pinned published catalog');
    return layer.dynamic === 'events' ? `${cmsContentPrefix}/data/calendar-events.geojson`
      : `${cmsContentPrefix}/data/cms/${encodeURIComponent(id)}.geojson`;
  }
  const filename = id === 'commission-districts' ? 'commission_districts' : id === 'polling-places' ? 'polling_places' : id === 'voting-precincts' ? 'voting_precincts' : id === 'event-locations' ? 'calendar-events' : id;
  return `/data/${filename}.geojson`;
}
