import type { FeatureCollection, Point } from 'geojson';
import { events, type CommunityEvent } from './events';
import { deriveEventLocations } from './event-geojson.mjs';

// Derive the map from calendar records; never guess a location.
const derived = deriveEventLocations(events);
export const mappedEvents: CommunityEvent[] = derived.eligibleEvents;
export const eventLocations: FeatureCollection<Point, { name: string; organizationId: string; fulladd: string; events: CommunityEvent[] }> = derived.collection;
