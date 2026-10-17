import { parseCmsJson } from './admin-json.mjs';
import { canonicalJson } from './admin-publish-gate.mjs';

const name = { key: 'name', label: 'Name', section: 'Content', help: 'The name shown to residents.' };
const organization = { key: 'organizationId', label: 'Organization ID', section: 'Membership', help: 'Use the exact ID of a published organization.' };
const description = { key: 'description', label: 'Description', section: 'Content', type: 'multiline' };
const source = [
  { key: 'sourceUrl', label: 'Source URL', section: 'Source', help: 'Keep the original public source link. Publication validates private-event URLs.' },
  { key: 'sourceChecked', label: 'Source checked on', section: 'Source', help: 'Keep the recorded capture date, for example 2026-10-16.' },
];

/** A convenience view of existing payload fields, not a new API schema. */
export const fieldsByKind = {
  organization: [name, { key: 'color', label: 'Display color', section: 'Content', help: 'Optional CSS color, for example #285e4c.' }],
  calendar: [name, organization, { key: 'sourceCalendar', label: 'Source calendar', section: 'Source', help: 'Preserve the upstream calendar identifier when present.' }],
  event: [
    { key: 'title', label: 'Event title', section: 'Content' }, description,
    { key: 'category', label: 'Category', section: 'Content' },
    { key: 'start', label: 'Starts', section: 'Date & time', help: 'ISO date/time with timezone offset, for example 2026-10-17T12:00:00-04:00. Date-only values are retained unchanged.' },
    { key: 'end', label: 'Ends', section: 'Date & time', help: 'Use the source’s end date/time and explicit timezone offset.' },
    { key: 'allDay', label: 'All-day event', section: 'Date & time', type: 'boolean' },
    organization,
    { key: 'calendarIds', label: 'Calendar IDs', section: 'Membership', type: 'lines', help: 'One published calendar ID per line. Each must belong to the organization.' },
    { key: 'location', label: 'Location name', section: 'Location' },
    { key: 'address', label: 'Address', section: 'Location' },
    { key: 'addressPrivate', label: 'Private address', section: 'Location', type: 'boolean', help: 'Private events require BOTH location and address to be exactly “Private location — see organizer for details”, no coordinates and only permitted fields. Nothing is redacted automatically.' },
    { key: 'isVirtual', label: 'Online event', section: 'Location', type: 'boolean' },
    ...source,
  ],
  layer: [name, description, { key: 'color', label: 'Display color', section: 'Content' }],
  map: [name, description, { key: 'layers', label: 'Layer IDs', section: 'Map layers', type: 'lines', help: 'One published layer ID per line, in display order.' }],
};

export function parseEditorPayload(text) {
  const value = parseCmsJson(text);
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('The complete record must be a JSON object.');
  canonicalJson(value); // Reject numeric overflow instead of coercing it to null.
  return value;
}

export function editableFieldValue(payload, field) {
  const value = payload[field.key];
  if (!Object.hasOwn(payload, field.key)) return { editable: true, value: field.type === 'boolean' ? 'unset' : '' };
  if (field.type === 'boolean' && typeof value === 'boolean') return { editable: true, value: String(value) };
  if (field.type === 'lines' && Array.isArray(value) && value.every(item => typeof item === 'string' && !/[\r\n]/.test(item))) return { editable: true, value: value.join('\n') };
  if (!['boolean', 'lines'].includes(field.type) && typeof value === 'string') return { editable: true, value };
  return { editable: false, value: '', reason: 'This field has a value type that must be edited in Advanced JSON. Its original value is kept.' };
}

/** Changes one explicitly edited field; every other own JSON property survives. */
export function editPayloadField(text, kind, key, input) {
  const field = fieldsByKind[kind]?.find(item => item.key === key);
  if (!field) throw new Error('This field is not available for this content type.');
  const payload = parseEditorPayload(text);
  if (!editableFieldValue(payload, field).editable) throw new Error('Edit this value in Advanced JSON to preserve its type.');
  if (field.type === 'boolean') {
    if (!['unset', 'true', 'false'].includes(input)) throw new Error('Choose not specified, yes or no.');
    if (input === 'unset') delete payload[key];
    else payload[key] = input === 'true';
  } else if (field.type === 'lines') payload[key] = input === '' ? [] : input.split(/\r?\n/);
  else payload[key] = input;
  return JSON.stringify(payload, null, 2);
}

export function newPayload(kind, id = '') {
  return JSON.stringify(kind === 'event' ? { id, title: '', sample: false } : { id, name: '' }, null, 2);
}
