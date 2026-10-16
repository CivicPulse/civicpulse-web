import catalog from '../data/calendars.json';
import cms from '../data/cms-published.json';
import { resolvePublicContentSource } from './content-source.mjs';
const useCmsSnapshot = resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE) === 'supabase';
export const organizations = useCmsSnapshot ? cms.organizations : catalog.organizations;
export const calendars = useCmsSnapshot ? cms.calendars : catalog.calendars;
export function organizationFor(id?: string) {
  return organizations.find(organization => organization.id === id)!;
}
export function calendarsFor(event: { calendarIds?: string[] }) {
  return calendars.filter(calendar => event.calendarIds?.includes(calendar.id));
}
