import mgrls from '../../public/icons/organizations/mgrls/marker.svg?raw';
import bibb from '../../public/icons/organizations/macon-bibb-dems/marker.svg?raw';
import georgia from '../../public/icons/organizations/dpg26/marker.svg?raw';
import houston from '../../public/icons/organizations/houston-county-dems/marker.svg?raw';
import jasper from '../../public/icons/organizations/jasper-county-dems/marker.svg?raw';
import { dsaMarker } from './dsa-marker';
import { renderMarkerSvg } from './marker-svg';
import { calendarsFor, organizationFor } from './calendars';
import defaults from '../data/map-markers.json';
import type { CommunityEvent } from './events';

const templates: Record<string, string> = { mgrls, 'macon-bibb-dems': bibb, dpg26: georgia, 'houston-county-dems': houston, 'jasper-county-dems': jasper };
export function organizationMarker(items: CommunityEvent[], eventId?: string | null) {
  const focused = items.find(item => item.id === eventId);
  const records = focused ? [focused] : items;
  const organizationId = records[0]?.organizationId;
  if (!organizationId || !records.every(item => item.organizationId === organizationId)) return null;
  if (organizationId === 'mgdsa') { const marker = dsaMarker(records, eventId); return marker && { ...marker, organizationId }; }
  const template = templates[organizationId];
  if (!template) return null;
  const settings = (defaults.organizations as Record<string, { fill: string; border: string }>)[organizationId];
  const colors = records.flatMap(item => item.mapMarker?.fill ? [item.mapMarker.fill] : calendarsFor(item).map(calendar => calendar.color));
  const border = records.find(item => item.mapMarker?.border)?.mapMarker?.border || settings.border;
  const svg = renderMarkerSvg(template, colors, border, settings.fill || organizationFor(organizationId).color);
  return { organizationId, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, colors: [...new Set(colors)], border };
}
