export const PRIVATE_LOCATION = 'Private location — see organizer for details';

export const PRIVATE_EVENT_KEYS = [
  'id', 'title', 'start', 'end', 'category', 'location', 'address', 'description', 'note',
  'sample', 'sourceUrl', 'sourceChecked', 'organizer', 'sourceLabel', 'sourceGroup',
  'sourceEventId', 'sourceCalendar', 'organizationId', 'calendarIds', 'allDay',
  'endTimeUnknown', 'isVirtual', 'addressPrivate', 'coordinates',
];
const privateEventKeys = new Set(PRIVATE_EVENT_KEYS);
const stringKeys = new Set([
  'id', 'title', 'start', 'end', 'category', 'location', 'address', 'description', 'note',
  'sourceUrl', 'sourceChecked', 'organizer', 'sourceLabel', 'sourceGroup', 'sourceEventId',
  'sourceCalendar', 'organizationId',
]);
const booleanKeys = new Set(['sample', 'allDay', 'endTimeUnknown', 'isVirtual', 'addressPrivate']);

function safeSourceUrl(value) {
  if (typeof value !== 'string' || /[\s\u0000-\u001f\u007f]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function assertPublicPrivateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event) || event.addressPrivate !== true) return event;
  for (const key of Object.keys(event)) {
    if (!privateEventKeys.has(key)) throw new Error(`Private event contains non-allowlisted field: ${key}`);
  }
  for (const [key, value] of Object.entries(event)) {
    if (stringKeys.has(key) && typeof value !== 'string') throw new Error(`Private event field must be a string: ${key}`);
    if (booleanKeys.has(key) && typeof value !== 'boolean') throw new Error(`Private event field must be a boolean: ${key}`);
  }
  if (event.sample !== false) throw new Error('Private event sample must be false');
  if (event.address !== PRIVATE_LOCATION || event.location !== PRIVATE_LOCATION) {
    throw new Error('Private event address and location must use the approved placeholder');
  }
  if (event.coordinates !== undefined && event.coordinates !== null) {
    throw new Error('Private event coordinates must be absent or null');
  }
  if (!Array.isArray(event.calendarIds) || !event.calendarIds.length || event.calendarIds.some(id => typeof id !== 'string')) {
    throw new Error('Private event calendarIds must be a nonempty string array');
  }
  if (event.sourceUrl !== undefined && !safeSourceUrl(event.sourceUrl)) {
    throw new Error('Private event sourceUrl must be an absolute HTTP(S) URL without credentials or whitespace');
  }
  return event;
}

export function isPublicMapEvent(event) {
  assertPublicPrivateEvent(event);
  return !event.sample && !event.addressPrivate && !event.isVirtual &&
    Array.isArray(event.coordinates) && event.coordinates.length === 2 &&
    event.coordinates.every(Number.isFinite) && Math.abs(event.coordinates[0]) <= 180 && Math.abs(event.coordinates[1]) <= 90;
}

export function publicIcsLocation(event) {
  assertPublicPrivateEvent(event);
  const value = event.addressPrivate === true ? PRIVATE_LOCATION : event.address;
  return String(value).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
}
