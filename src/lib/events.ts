import data from '../data/events.json';
export type CommunityEvent = (typeof data)[number];
export const events = data.toSorted((a, b) => a.start.localeCompare(b.start));
export const timeZone = 'America/New_York';
export function eventDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(new Date(value));
}
export function eventTime(event: CommunityEvent) {
  return `${eventDate(event.start, { hour: 'numeric', minute: '2-digit' })} – ${eventDate(event.end, { hour: 'numeric', minute: '2-digit' })}`;
}
export function escapeICS(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
}
function utc(value: string) { return new Date(value).toISOString().replaceAll(/[-:]/g, '').replace('.000', ''); }
export function calendarFile(items: CommunityEvent[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Macon-Bibb Community Preview//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Macon-Bibb sample events'];
  for (const item of items) lines.push('BEGIN:VEVENT', `UID:${item.id}@maconbibb-sample.invalid`, 'DTSTAMP:20261015T120000Z', `DTSTART:${utc(item.start)}`, `DTEND:${utc(item.end)}`, `SUMMARY:${escapeICS('[SAMPLE] ' + item.title)}`, `LOCATION:${escapeICS(item.address)}`, `DESCRIPTION:${escapeICS(item.note + '\n' + item.description)}`, 'STATUS:TENTATIVE', 'END:VEVENT');
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
