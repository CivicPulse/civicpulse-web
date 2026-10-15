import { eventLocations } from '../../lib/event-map';

export function GET() {
  return new Response(JSON.stringify(eventLocations), {
    headers: { 'Content-Type': 'application/geo+json; charset=utf-8' },
  });
}
