import { renderMarkerSvg } from './marker-svg';
import template from '../../public/icons/dsa/marker.svg?raw';
import defaults from '../data/map-markers.json';
import { calendarsFor } from './calendars';
import type { CommunityEvent } from './events';

export function dsaMarkerSvg(colors: string[] = [defaults.dsa.fill], border = defaults.dsa.border) {
  return renderMarkerSvg(template, colors, border, defaults.dsa.fill);
}
export function dsaMarker(items: CommunityEvent[], eventId?: string | null) {
  const focused = items.find(item => item.id === eventId);
  const records = focused ? [focused] : items;
  if (!records.length || !records.every(item => item.organizationId === 'mgdsa')) return null;
  const colors = records.flatMap(item => item.mapMarker?.fill ? [item.mapMarker.fill] : calendarsFor(item).map(calendar => calendar.color));
  const border = records.find(item => item.mapMarker?.border)?.mapMarker?.border || defaults.dsa.border;
  const svg = dsaMarkerSvg(colors, border);
  return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, colors: [...new Set(colors)], border };
}
