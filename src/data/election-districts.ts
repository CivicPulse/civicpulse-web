import snapshot from './election-districts.json';
import { resolvePublicContentSource } from '../lib/content-source.mjs';
resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE);
const useCmsSnapshot = typeof import.meta.env !== 'undefined' && import.meta.env.PUBLIC_CONTENT_SOURCE === 'supabase';
export const electionLayers = [
  { id: 'us-house-districts', name: 'U.S. House districts', description: '14 Georgia districts · 120th Congress / 2026 elections', color: '#2166ac', kind: 'area' },
  { id: 'state-house-districts', name: 'Georgia House districts', description: '180 districts · 2026 legislative boundaries', color: '#a15b29', kind: 'area' },
  { id: 'state-senate-districts', name: 'Georgia Senate districts', description: '56 districts · 2026 legislative boundaries', color: '#287556', kind: 'area' },
  { id: 'psc-districts', name: 'PSC residency districts', description: '5 county-based districts · commissioners elected statewide', color: '#6a51a3', kind: 'area' },
  { id: 'georgia-statewide', name: 'Georgia statewide electorate', description: 'U.S. Senate and statewide offices · one statewide boundary', color: '#82651d', kind: 'area' },
] as const;
export const electionMaps = [
  { id: 'us-house', name: 'U.S. House districts — Georgia', description: 'All 14 Georgia districts for the 120th Congress and 2026 election cycle, from Census TIGERweb. Full district boundaries extend beyond Bibb County. Search Bibb in the directory to find districts that intersect the county.', layers: ['us-house-districts'] },
  { id: 'state-house', name: 'Georgia House districts', description: 'All 180 Georgia House districts, using the Census Bureau’s 2026 state legislative boundaries. Search Bibb in the directory for districts intersecting Macon-Bibb.', layers: ['state-house-districts'] },
  { id: 'state-senate', name: 'Georgia Senate districts', description: 'All 56 Georgia Senate districts, using the Census Bureau’s 2026 state legislative boundaries. Search Bibb in the directory for districts intersecting Macon-Bibb.', layers: ['state-senate-districts'] },
  { id: 'psc', name: 'Georgia PSC residency districts', description: 'Five commissioner residency districts derived from the enacted PSC-2022 county assignments and official Census county GIS. Commissioners must live in their district; voters statewide elect each commissioner. Bibb County is in District 1.', layers: ['psc-districts'] },
  { id: 'statewide', name: 'U.S. Senate & statewide offices', description: 'Both U.S. senators represent all of Georgia. This state boundary also provides geographic context for statewide offices; there are no separate U.S. Senate districts within the state.', layers: ['georgia-statewide'] },
];
export const electionLayerIds = new Set<string>(useCmsSnapshot ? [] : snapshot.datasets.map(source => source.id));
export function isElectionLayer(id: string) { return electionLayerIds.has(id); }
export const censusElectionAttribution = '<a href="https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer">U.S. Census Bureau · TIGERweb</a>';
export function electionAttribution(id: string) { return censusElectionAttribution + (id === 'psc-districts' ? ' · <a href="https://psc.ga.gov/site/downloads/psc-2022-map-packet.pdf">Georgia PSC / General Assembly</a>' : ''); }
