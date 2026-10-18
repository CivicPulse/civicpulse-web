import data from '../data/events.json';
import mgdsa from '../data/mgdsa-events.json';
import mobilize from '../data/mobilize-events.public.json';
import mgrls from '../data/mgrls-events.json';
import bcsd from '../data/bcsd-events.json';
import cms from '../data/cms-published.json';
import { resolvePublicContentSource } from './content-source.mjs';
import { calendars, organizations } from './calendars';
import { assertPublicPrivateEvent, publicIcsLocation } from './private-event-policy.mjs';
export interface CommunityEvent {
  id: string; title: string; start: string; end: string; category: string;
  location: string; address: string; description: string; note: string;
  sample: boolean; coordinates?: number[]; sourceUrl?: string;
  sourceChecked?: string; organizer?: string; sourceLabel?: string;
  allDay?: boolean; sourceGroup?: string; venueId?: string;
  endTimeUnknown?: boolean; libraryBranchId?: string; sourceCategories?: string[]; sourceLocation?: string;
  organizationId?: string; calendarIds?: string[]; sourceCalendar?: string;
  mapMarker?: { fill?: string; border?: string };
  sourceEventId?: string; sourceCity?: string; isVirtual?: boolean; addressPrivate?: boolean;
}
// Fresh captured listings replace their earlier manual imports, retaining the same IDs.
const refreshedMobilizeUrls = new Set((mobilize as CommunityEvent[]).map(event => event.sourceUrl));
const useCmsSnapshot = resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE) === 'supabase';
const sourceEvents: CommunityEvent[] = useCmsSnapshot ? cms.events as CommunityEvent[] : [...data.filter(event => !refreshedMobilizeUrls.has(event.sourceUrl || '')), ...mgdsa, ...mobilize, ...mgrls, ...bcsd] as CommunityEvent[];
export const events: CommunityEvent[] = sourceEvents.map((item: CommunityEvent) => {
  assertPublicPrivateEvent(item);
  if (item.sample) throw new Error(`Sample events cannot be published: ${item.id}`);
  const organizationId = item.organizationId || (item.sourceGroup === 'mgdsa' ? 'mgdsa' : undefined);
  const inferred = calendars.find(calendar => 'sourceCalendar' in calendar && calendar.sourceCalendar === item.sourceCalendar) || calendars.find(calendar => calendar.organizationId === organizationId);
  const calendarIds = [...new Set(item.calendarIds || (inferred ? [inferred.id] : []))];
  if (!organizations.some(organization => organization.id === organizationId) || !calendarIds.length || calendarIds.some(id => !calendars.some(calendar => calendar.id === id && calendar.organizationId === organizationId))) {
    throw new Error(`Invalid organization/calendar membership for event ${item.id}`);
  }
  return { ...item, organizationId, calendarIds };
}).toSorted((a, b) => a.start.localeCompare(b.start));
export const timeZone = 'America/New_York';
export function eventDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(new Date(value));
}
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
export function eventDays(event: CommunityEvent): [string, string] {
  const start = dayFormatter.format(new Date(event.start));
  // RFC 5545 DTEND is exclusive, including date-only school break periods.
  const end = Math.max(new Date(event.start).getTime(), new Date(event.end).getTime() - 1);
  return [start, dayFormatter.format(new Date(end))];
}
export function eventDateRange(event: CommunityEvent) {
  const [first, last] = eventDays(event);
  const start = eventDate(event.start, { weekday: 'long', month: 'long', day: 'numeric' });
  return first === last ? start : `${start} – ${eventDate(last + 'T12:00:00-05:00', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}
export function eventTime(event: CommunityEvent) {
  if (event.allDay) return 'All day';
  if (event.endTimeUnknown) return eventDate(event.start, { hour: 'numeric', minute: '2-digit' });
  return `${eventDate(event.start, { hour: 'numeric', minute: '2-digit' })} – ${eventDate(event.end, { hour: 'numeric', minute: '2-digit' })}`;
}
export function escapeICS(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
}
function utc(value: string) { return new Date(value).toISOString().replaceAll(/[-:]/g, '').replace('.000', ''); }
export function calendarFile(items: CommunityEvent[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivicPulse//Macon-Bibb Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Macon-Bibb community events'];
  for (const item of items) {
    assertPublicPrivateEvent(item);
    lines.push('BEGIN:VEVENT', `UID:${item.id}@civicpulse`, 'DTSTAMP:20261015T120000Z', item.allDay ? `DTSTART;VALUE=DATE:${item.start.slice(0, 10).replaceAll('-', '')}` : `DTSTART:${utc(item.start)}`, ...(item.endTimeUnknown ? [] : [item.allDay ? `DTEND;VALUE=DATE:${item.end.slice(0, 10).replaceAll('-', '')}` : `DTEND:${utc(item.end)}`]), `SUMMARY:${escapeICS(item.title)}`, `LOCATION:${publicIcsLocation(item)}`, `DESCRIPTION:${escapeICS([item.note, item.description, item.organizer, item.sourceUrl].filter(Boolean).join('\n'))}`, ...(item.sourceUrl ? [`URL:${item.sourceUrl}`] : []), 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 folds at 75 octets; continuation begins with a space.
  return lines.map(line => {
    const chunks: string[] = []; let current = ''; let bytes = 0;
    for (const ch of line) {
      const length = new TextEncoder().encode(ch).length;
      if (bytes + length > 75) { chunks.push(current); current = ' '; bytes = 1; }
      current += ch; bytes += length;
    }
    chunks.push(current); return chunks.join('\r\n');
  }).join('\r\n') + '\r\n';
}
