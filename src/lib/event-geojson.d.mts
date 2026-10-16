import type { FeatureCollection, Point } from 'geojson';
import type { CommunityEvent } from './events';

export interface EventVenueProperties {
  name: string;
  organizationId: string;
  fulladd: string;
  events: CommunityEvent[];
}
export interface DerivedEventLocations {
  collection: FeatureCollection<Point, EventVenueProperties>;
  eligibleEvents: CommunityEvent[];
  eligibleCount: number;
  groupedVenueCount: number;
}
export function deriveEventLocations(events: CommunityEvent[]): DerivedEventLocations;
