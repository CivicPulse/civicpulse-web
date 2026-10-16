import { isPublicMapEvent } from './private-event-policy.mjs';

/** Build the venue-grouped public event layer from the already captured events. */
export function deriveEventLocations(events) {
  if (!Array.isArray(events)) throw new Error('Event snapshot must be an array');
  const eligibleEvents = events.filter(event => isPublicMapEvent(event));
  const features = [];
  for (const event of eligibleEvents) {
    if (typeof event.organizationId !== 'string' || !event.organizationId) {
      throw new Error(`Mapped event has no organization: ${event.id}`);
    }
    const coordinates = event.coordinates;
    let venue = features.find(feature => feature.properties.organizationId === event.organizationId &&
      feature.geometry.coordinates.every((value, index) => value === coordinates[index]));
    if (!venue) {
      venue = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [...coordinates] },
        properties: { name: event.location, organizationId: event.organizationId, fulladd: event.address, events: [] },
      };
      features.push(venue);
    }
    venue.properties.events.push(event);
  }
  return {
    collection: { type: 'FeatureCollection', features },
    eligibleEvents,
    eligibleCount: eligibleEvents.length,
    groupedVenueCount: features.length,
  };
}
