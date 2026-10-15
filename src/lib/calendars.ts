import catalog from '../data/calendars.json';
export const organizations = catalog.organizations;
export const calendars = catalog.calendars;
export function organizationFor(id?: string) {
  return organizations.find(organization => organization.id === id)!;
}
export function calendarsFor(event: { calendarIds?: string[] }) {
  return calendars.filter(calendar => event.calendarIds?.includes(calendar.id));
}
