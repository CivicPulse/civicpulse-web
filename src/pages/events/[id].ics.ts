import { calendarFile, events } from '../../lib/events';
export function getStaticPaths() { return events.map(event => ({ params: { id: event.id }, props: { event } })); }
export function GET({ props }: { props: { event: (typeof events)[number] } }) {
  return new Response(calendarFile([props.event]), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${props.event.id}.ics"` } });
}
