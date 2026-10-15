#!/usr/bin/env python3
"""Build local event snapshots from saved MGDSA ICS files. Requires python-dateutil."""
import hashlib
import html
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from dateutil.rrule import rrulestr, rruleset

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/mgdsa'
EASTERN = ZoneInfo('America/New_York')

def components(text):
    """Read unfolded VEVENT properties, excluding nested alarms."""
    events, current, depth = [], None, 0
    for line in re.sub(r'\r?\n[ \t]', '', text).splitlines():
        if line == 'BEGIN:VEVENT':
            current, depth = {}, 0
        elif line == 'END:VEVENT':
            events.append(current)
            current = None
        elif current is not None:
            if line.startswith('BEGIN:'): depth += 1
            elif line.startswith('END:'): depth -= 1
            elif not depth and ':' in line:
                key, value = line.split(':', 1)
                parts = key.split(';')
                params = dict(p.split('=', 1) for p in parts[1:] if '=' in p)
                current.setdefault(parts[0], []).append((params, value))
    return events

def value(event, key, default=''):
    return event.get(key, [({}, default)])[0][1]

def text_value(event, key):
    text = re.sub(r'\\([nN,;\\])', lambda m: '\n' if m[1].lower() == 'n' else m[1], value(event, key))
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    return html.unescape(re.sub('<[^>]+>', '', text)).strip()

def date(prop):
    params, raw = prop
    zone = ZoneInfo(params.get('TZID', 'America/New_York').strip('"'))
    if params.get('VALUE') == 'DATE' or len(raw) == 8:
        return datetime.strptime(raw, '%Y%m%d').replace(tzinfo=zone)
    if raw.endswith('Z'):
        return datetime.strptime(raw, '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)
    return datetime.strptime(raw, '%Y%m%dT%H%M%S').replace(tzinfo=zone)

def expand(events, lower, upper):
    masters = {value(e, 'UID'): e for e in events if 'RECURRENCE-ID' not in e}
    overrides = {}
    for e in events:
        if 'RECURRENCE-ID' in e:
            if e['RECURRENCE-ID'][0][0].get('RANGE'):
                raise ValueError('RANGE overrides need explicit review')
            overrides[(value(e, 'UID'), date(e['RECURRENCE-ID'][0]))] = e
    emitted = set()
    for uid, master in masters.items():
        if value(master, 'STATUS') == 'CANCELLED': continue
        start = date(master['DTSTART'][0])
        dates = rruleset()
        dates.rdate(start)
        for _, rule in master.get('RRULE', []): dates.rrule(rrulestr(rule, dtstart=start))
        for key, method in [('RDATE', dates.rdate), ('EXDATE', dates.exdate)]:
            for params, raw in master.get(key, []):
                for item in raw.split(','): method(date((params, item)))
        for occurrence in dates.between(lower, upper, inc=True):
            key = (uid, occurrence)
            e = overrides.get(key, master)
            emitted.add(key)
            if value(e, 'STATUS') == 'CANCELLED': continue
            actual = date(e['DTSTART'][0]) if e is not master else occurrence
            if lower <= actual < upper and value(e, 'STATUS') != 'CANCELLED':
                yield uid, occurrence, e, actual
    # Include exceptions moved into the window, and standalone exception records.
    for key, e in overrides.items():
        if key in emitted or value(e, 'STATUS') == 'CANCELLED' or 'DTSTART' not in e: continue
        actual = date(e['DTSTART'][0])
        if lower <= actual < upper: yield key[0], key[1], e, actual

def build():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    lower = datetime.fromisoformat(manifest['windowStart']).replace(tzinfo=EASTERN)
    upper = datetime.fromisoformat(manifest['windowEndExclusive']).replace(tzinfo=EASTERN)
    venues = json.loads((SOURCE / 'venues.json').read_text())
    catalog = json.loads((ROOT / 'src/data/calendars.json').read_text())
    output = {}
    for feed in manifest['feeds']:
        for uid, original, e, start in expand(components((SOURCE / feed['file']).read_text()), lower, upper):
            title = text_value(e, 'SUMMARY')
            if not title or title.lower() in ('busy', 'private event'): continue
            all_day = e['DTSTART'][0][0].get('VALUE') == 'DATE'
            base = date(e['DTSTART'][0])
            end = date(e['DTEND'][0]) if 'DTEND' in e else base + timedelta(days=1) if all_day else base
            if 'DURATION' in e: raise ValueError('DURATION requires explicit support')
            finish = start + (end - base)
            event_id = 'mgdsa-' + hashlib.sha256(f'{uid}|{original.isoformat()}'.encode()).hexdigest()[:20]
            location = text_value(e, 'LOCATION')
            venue = next((v for v in venues if v['match'].lower() in location.lower()), None)
            virtual = bool(re.search(r'virtual|online|zoom|meet.google', location, re.I))
            item = dict(id=event_id, title=title, start=start.astimezone(EASTERN).isoformat(), end=finish.astimezone(EASTERN).isoformat(), allDay=all_day, category='Mid GA DSA', location=location or 'Location not provided', address=location or 'Check the source calendar for location details.', description=text_value(e, 'DESCRIPTION') or 'See the Middle Georgia DSA calendar for event details.', note='Imported from a saved public Google Calendar feed. Confirm current arrangements with the organizer.' + (' Virtual event.' if virtual else ''), sample=False, sourceUrl=manifest['sourcePage'], sourceLabel='View Mid GA DSA calendar', sourceChecked=manifest['captured'], organizer='Middle Georgia DSA', sourceGroup='mgdsa', sourceUid=uid, sourceCalendar=feed['calendarId'])
            if venue:
                item['coordinates'] = venue['coordinates']
                item['venueId'] = venue['id']
            item['organizationId'] = 'mgdsa'
            calendar = next(c for c in catalog['calendars'] if c.get('sourceCalendar') == feed['calendarId'])
            previous = output.get(event_id, {})
            item['calendarIds'] = sorted(set(previous.get('calendarIds', []) + [calendar['id']]))
            output[event_id] = item
    imported = sorted(output.values(), key=lambda e: (e['start'], e['id']))
    (ROOT / 'src/data/mgdsa-events.json').write_text(json.dumps(imported, indent=2, ensure_ascii=False) + '\n')
    features = []
    for venue in venues:
        items = [e for e in imported if e.get('venueId') == venue['id']]
        if not items: continue
        features.append(dict(type='Feature', geometry=dict(type='Point', coordinates=venue['coordinates']), properties=dict(id=venue['id'], name=venue['name'], fulladd=venue['address'], description='Mid GA DSA event venue · address geocoded by US Census', events=[dict(id=e['id'], title=e['title'], start=e['start'], end=e['end']) for e in items])))
    (ROOT / 'public/data/event-locations.geojson').write_text(json.dumps(dict(type='FeatureCollection', features=features), indent=2, ensure_ascii=False)+'\n')
    print(f'Imported {len(imported)} occurrences at {len(features)} mapped venues; window {lower.date()} to {upper.date()} (exclusive)')

if __name__ == '__main__': build()
