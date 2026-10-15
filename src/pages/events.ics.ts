import { calendarFile, events } from '../lib/events';
export function GET() {
  return new Response(calendarFile(events), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="maconbibb-events.ics"' } });
}
