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
  if (typeof value !== 'string' || value.length === 0 || /[^\x21-\x7e]/u.test(value) || value.includes('\\')) return false;
  const scheme = value.startsWith('https://') ? 'https://' : value.startsWith('http://') ? 'http://' : null;
  if (!scheme) return false;
  const remainder = value.slice(scheme.length);
  const tailIndex = remainder.search(/[/?#]/u);
  const authority = tailIndex < 0 ? remainder : remainder.slice(0, tailIndex);
  const tail = tailIndex < 0 ? '' : remainder.slice(tailIndex);
  if (!authority || /[@%\[\]]/u.test(authority)) return false;

  const colon = authority.indexOf(':');
  if (colon !== -1 && authority.indexOf(':', colon + 1) !== -1) return false;
  const host = colon === -1 ? authority : authority.slice(0, colon);
  if (colon !== -1) {
    const port = authority.slice(colon + 1);
    if (!/^[1-9][0-9]{0,4}$/u.test(port) || Number(port) > 65535) return false;
  }
  if (/^[0-9.]+$/u.test(host)) {
    const octets = host.split('.');
    if (octets.length !== 4 || octets.some(part => !/^(0|[1-9][0-9]{0,2})$/u.test(part) || Number(part) > 255)) return false;
  } else {
    if (host.length > 253 || host.endsWith('.')) return false;
    const labels = host.split('.');
    if (labels.length < 2 || labels.some(label => label.length < 1 || label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label) || label.startsWith('xn--'))) return false;
    if (!/^[a-z]{2,63}$/u.test(labels.at(-1))) return false;
  }
  if (tail && !/^[/?#]/u.test(tail)) return false;
  if (!/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?#\[\]%]*$/u.test(tail)) return false;
  for (let index = 0; index < tail.length; index += 1) {
    if (tail[index] !== '%') continue;
    const hex = tail.slice(index + 1, index + 3);
    if (!/^[0-9a-fA-F]{2}$/u.test(hex)) return false;
    const byte = Number.parseInt(hex, 16);
    if (byte <= 0x1f || byte === 0x7f || byte === 0x5c) return false;
    index += 2;
  }
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
  if (!safeSourceUrl(event.sourceUrl)) {
    throw new Error('Private event sourceUrl must match cp-source-url-v1');
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
