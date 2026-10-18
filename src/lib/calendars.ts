import catalog from '../data/calendars.json';
import cms from '../data/cms-published.json';
import { resolvePublicContentSource } from './content-source.mjs';
const useCmsSnapshot = resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE) === 'supabase';
interface Organization { id: string; name: string; color: string; }
interface Calendar { id: string; name: string; organizationId: string; color: string; sourceCalendar?: string; }
// Color is optional in the API. Supply a presentation-only fallback without
// changing the materialized snapshot or its original payload metadata.
const displayColor = <T extends { color?: string }>(item: T) => ({ ...item, color: item.color || '#285e4c' });
export const organizations = ((useCmsSnapshot ? cms.organizations : catalog.organizations) as (Omit<Organization, 'color'> & { color?: string })[]).map(displayColor);
export const calendars = ((useCmsSnapshot ? cms.calendars : catalog.calendars) as (Omit<Calendar, 'color'> & { color?: string })[]).map(displayColor);
export function organizationFor(id?: string) {
  return organizations.find(organization => organization.id === id)!;
}
export function calendarsFor(event: { calendarIds?: string[] }) {
  return calendars.filter(calendar => event.calendarIds?.includes(calendar.id));
}
