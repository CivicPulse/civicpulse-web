// LOCAL BROWSER FIXTURE ONLY. Never copied into a release artifact.
const org = 'local-fixture-organization', calendar = 'local-fixture-calendar';
export const fixture = {
  role: 'admin', session: { user: { id: 'local-fixture-user', email: 'local-fixture@example.org' } }, listeners: [],
  drafts: [
    { kind: 'organization', id: org, revision: 1, payload: { id: org, name: 'Neighborhood partners · local fixture', color: '#285e4c', importProvenance: { sourceHash: 'fixture-only', preserved: true } } },
    { kind: 'calendar', id: calendar, revision: 1, payload: { id: calendar, name: 'Community calendar · local fixture', organizationId: org } },
    { kind: 'event', id: 'local-fixture-event', revision: 1, payload: { id: 'local-fixture-event', title: 'Community gathering · local fixture', start: '2026-10-17T12:00:00-04:00', end: '2026-10-17T13:00:00-04:00', category: 'Community', addressPrivate: true, location: 'Private location — see organizer for details', address: 'Private location — see organizer for details', sourceUrl: 'https://example.org/fixture', sourceChecked: '2026-10-16', organizationId: org, calendarIds: [calendar], sample: false } },
    { kind: 'layer', id: 'local-fixture-layer', revision: 1, payload: { id: 'local-fixture-layer', name: 'Community places · local fixture', kind: 'point', geojson: { type: 'FeatureCollection', features: [] } } },
    { kind: 'map', id: 'local-fixture-map', revision: 1, payload: { id: 'local-fixture-map', name: 'Neighborhood map · local fixture', layers: ['local-fixture-layer'] } },
  ],
  published: [], history: [],
};
export const clone = value => structuredClone(value);
