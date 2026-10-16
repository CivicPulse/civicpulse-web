import type { FeatureCollection, Point } from 'geojson';
import { events, type CommunityEvent } from './events';
import { isPublicMapEvent } from './private-event-policy.mjs';

// Derive the map from calendar records; never guess a location.
export const mappedEvents = events.filter(event => isPublicMapEvent(event));

interface VenueProperties {
  name: string;
  organizationId: string;
  fulladd: string;
  events: CommunityEvent[];
}
export const eventLocations: FeatureCollection<Point, VenueProperties> = { type: 'FeatureCollection', features: [] };
for (const event of mappedEvents) {
  const coordinates = event.coordinates!;
  let venue = eventLocations.features.find(feature => feature.properties.organizationId === event.organizationId && feature.geometry.coordinates.every((value, index) => value === coordinates[index]));
  if (!venue) {
    venue = { type: 'Feature', geometry: { type: 'Point', coordinates }, properties: {
      name: event.location, organizationId: event.organizationId!, fulladd: event.address, events: [],
    } };
    eventLocations.features.push(venue);
  }
  venue.properties.events.push(event);
}
