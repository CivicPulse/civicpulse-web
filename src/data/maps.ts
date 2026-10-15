export const layers = [
  { id: 'polling-places', name: 'Polling places', description: 'Uploaded locations and record status', color: '#ae583b', kind: 'point', sample: false },
  { id: 'voting-precincts', name: 'Voting precincts', description: 'Uploaded precinct boundaries', color: '#3d704c', kind: 'area', sample: false },
  { id: 'parks', name: 'Parks', description: 'Sample green spaces', color: '#3d704c', kind: 'point', sample: true },
  { id: 'community-spaces', name: 'Community spaces', description: 'Sample gathering places', color: '#ae583b', kind: 'point', sample: true },
  { id: 'libraries', name: 'Libraries', description: 'Sample learning places', color: '#335e78', kind: 'point', sample: true },
  { id: 'neighborhoods', name: 'Neighborhood areas', description: 'Illustrative boundaries', color: '#8a7045', kind: 'area', sample: true },
  { id: 'trails', name: 'Trail connections', description: 'Illustrative route only', color: '#527767', kind: 'line', sample: true },
  { id: 'events', name: 'Event locations', description: 'Fictional community events', color: '#854e71', kind: 'point', sample: true },
] as const;
export const maps = [
  { id: 'voting', name: 'Polling places & precincts', description: 'Uploaded polling locations and voting precincts, including historical records.', layers: ['polling-places', 'voting-precincts'] },
  { id: 'community', name: 'Around the community', description: 'Parks, libraries and places to gather.', layers: ['parks', 'community-spaces', 'libraries'] },
  { id: 'outdoors', name: 'Green spaces & trails', description: 'Explore sample parks, connections and surrounding areas.', layers: ['parks', 'trails', 'neighborhoods'] },
  { id: 'gatherings', name: 'Places to come together', description: 'See sample event locations and community spaces.', layers: ['events', 'community-spaces', 'neighborhoods'] },
];

export function layerUrl(id: string) {
  const filename = id === 'polling-places' ? 'polling_places' : id === 'voting-precincts' ? 'voting_precincts' : id;
  return `/data/${filename}.geojson`;
}
