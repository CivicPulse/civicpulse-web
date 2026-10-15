#!/usr/bin/env python3
"""Generate local Mobilize occurrences from saved public browser captures (offline)."""
import json
import math
import re
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/mobilize-bibb'
EASTERN = ZoneInfo('America/New_York')
MONTHS = {name: index for index, name in enumerate(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 1)}
SLOT = re.compile(r'^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), ([A-Z][a-z]{2}) (\d{1,2}), (\d{1,2}:\d{2}[ap]m)–(\d{1,2}:\d{2}[ap]m) (EDT|EST)$')

def clock(text):
    return datetime.strptime(text, '%I:%M%p' if ':' in text else '%I%p').time()

def distance(center, point):
    lon1, lat1, lon2, lat2 = map(math.radians, [*center, *point])
    a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 3958.7613 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def scheduled_times(page):
    if len(page['times']) != 1 or not page['times'][0]['datetime']:
        raise ValueError(f'Missing source date: {page["url"]}')
    anchor = datetime.fromisoformat(page['times'][0]['datetime'].replace('Z', '+00:00')).astimezone(EASTERN)
    result = []
    year, previous_month = anchor.year, anchor.month
    for label in page['slots']:
        match = SLOT.fullmatch(label)
        if not match: raise ValueError(f'Unrecognized timeslot: {label}')
        weekday, month_name, day, start_time, end_time, zone = match.groups()
        month = MONTHS[month_name]
        if month < previous_month: year += 1
        previous_month = month
        start = datetime.combine(datetime(year, month, int(day)), clock(start_time), EASTERN)
        end = datetime.combine(start.date(), clock(end_time), EASTERN)
        if end <= start: end += timedelta(days=1)
        if start.strftime('%a') != weekday or start.tzname() != zone:
            raise ValueError(f'Date/timezone disagrees with source: {label}')
        result.append((start, end))
    if not result:
        display = page['times'][0]['text']
        match = re.search(r'(\d{1,2}(?::\d{2})?[ap]m)\s+(EDT|EST)$', display)
        if not match or re.search(r'Multiple times|more time|Weekdays|Mondays|Tuesdays|Wednesdays|Thursdays|Fridays|Saturdays|Sundays', display):
            raise ValueError(f'Expand all source times before importing: {page["url"]}')
        end = datetime.combine(anchor.date(), clock(match[1]), EASTERN)
        if end <= anchor: end += timedelta(days=1)
        if anchor.tzname() != match[2]: raise ValueError('Source timezone mismatch')
        result.append((anchor, end))
    if result[0][0] != anchor:
        raise ValueError(f'First available shift disagrees with source date: {page["url"]}')
    return sorted(set(result))

def build():
    snapshot = json.loads((SOURCE / 'browser-snapshot.json').read_text())
    metadata = json.loads((SOURCE / 'event-notes.json').read_text())
    venues = json.loads((SOURCE / 'venues.json').read_text())
    legacy = json.loads((ROOT / 'src/data/events.json').read_text())
    legacy_by_key = {(e.get('sourceUrl'), e['start']): e for e in legacy if not e['sample']}
    occurrences = {}
    report = []
    captured_ids = set()
    for page in snapshot['events']:
        source_id = page['url'].rstrip('/').split('/')[-1]
        captured_ids.add(source_id)
        meta = metadata[source_id]
        text = page['publishedText']
        lines = text.splitlines()
        title = lines[0]
        kind = lines[1].split(' · ')[0]
        category = {'Virtual Meeting':'Virtual meeting','Community Event':'Community','Virtual Community Event':'Virtual event','Friend-to-Friend Outreach':'Volunteer'}.get(kind, kind)
        location_lines = [line for line in text.split('\nLocation\n',1)[1].split('\nAbout this event\n',1)[0].splitlines() if line and line != 'Map']
        virtual = 'Virtual event' in location_lines
        private = any('address is private' in line for line in location_lines)
        venue = None if private or virtual else next((v for v in venues if v['match'].lower() in ' '.join(location_lines).lower()), None)
        if venue and distance(snapshot['center'], venue['coordinates']) > snapshot['radiusMiles']:
            report.append({'sourceId':source_id,'included':False,'reason':'Outside requested radius'})
            continue
        if meta['city'] not in ('Macon', 'Warner Robins', 'Monticello'):
            raise ValueError('Review geographic scope for newly added city')
        organization = meta['organizationId']
        calendars = ['dems-events'] if organization == 'macon-bibb-dems' else ['houston-dems-events'] if organization == 'houston-county-dems' else ['jasper-dems-events'] if organization == 'jasper-county-dems' else ['dpg26-nearby']
        if organization == 'macon-bibb-dems':
            if 'Subcommittee' in title: calendars += ['dems-committees']
            elif category == 'Training': calendars += ['dems-training']
            elif category in ('Volunteer','Canvass'): calendars += ['dems-outreach']
        for start, end in scheduled_times(page):
            old = legacy_by_key.get((page['url'],start.isoformat()))
            event_id = old['id'] if old else f'mobilize-{source_id}-{start:%Y-%m-%d-%H%M}'
            note = meta.get('note', 'Saved from a public Mobilize listing. Check the signup page for current arrangements.')
            if private: note += ' The meeting address is private and is provided by the organizer after signup. No map marker is shown.'
            elif virtual: note += ' Virtual event; register for joining instructions.'
            elif venue: note += ' Map marker is an approximate US Census address location; confirm the meeting point with the organizer.'
            else: note += ' No specific street address is published; coordinate arrangements through Mobilize.'
            item = dict(id=event_id,title=old['title'] if old else title,start=start.isoformat(),end=end.isoformat(),category=old['category'] if old else category,location='Virtual event — hosted in '+meta['city'] if virtual else meta['city']+' — address after signup' if private else location_lines[0],address='Online — hosted in '+meta['city']+', GA' if virtual else 'Private address — sign up on Mobilize' if private else ', '.join(location_lines),description=meta['description'],note=note,sample=False,sourceUrl=page['url'],sourceLabel='Details & sign up on Mobilize',sourceChecked=snapshot['captured'],sourceGroup='mobilize',sourceEventId=source_id,sourceCity=meta['city'],isVirtual=virtual,addressPrivate=private,organizationId=organization,calendarIds=calendars,organizer=lines[1].split(' · ',1)[1] if ' · ' in lines[1] else 'Democratic Party of Georgia 26')
            if venue:
                item['coordinates'] = venue['coordinates']
                item['venueId'] = venue['id']
            key = (source_id, start.isoformat())
            if key in occurrences and occurrences[key] != item: raise ValueError('Conflicting source occurrence')
            occurrences[key] = item
        report.append(dict(sourceId=source_id,included=True,city=meta['city'],timeslots=len(scheduled_times(page)),mapped=bool(venue),addressPrivate=private,isVirtual=virtual))
    if captured_ids != set(metadata): raise ValueError('Source metadata and captured pages disagree')
    data = sorted(occurrences.values(),key=lambda e:(e['start'],e['id']))
    if len({e['id'] for e in data}) != len(data): raise ValueError('Duplicate event IDs')
    (ROOT / 'src/data/mobilize-events.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    manifest = dict(captured=snapshot['captured'],sourceFeed=snapshot['sourceFeed'],sourceUrl=snapshot['searchPages'][0]['url'],center=snapshot['center'],radiusMiles=snapshot['radiusMiles'],method='Public rendered page capture; all available-times controls expanded. API and direct HTTP access returned 403; public API navigation was blocked by browser.',scope='Nearby listings from the supplied Democratic Party of Georgia 26 feed, plus locally hosted virtual events. This does not claim coverage of other Mobilize organization feeds.',searchPagesReviewed=len(snapshot['searchPages']),coverage='First 25 search results were in Macon, Warner Robins or Monticello. Public venue distances use a straight-line radius from the supplied Macon map center. Subsequent reviewed results were in Hawkinsville, Griffin, Dublin, Locust Grove, Madison, Covington, Stockbridge or Conyers, outside the requested nearby area.',listings=len(report),occurrences=len(data),mappedOccurrences=sum('coordinates' in e for e in data),mappedVenues=len({tuple(e['coordinates']) for e in data if 'coordinates' in e}),records=report)
    (SOURCE / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Imported {len(data)} dated shifts from {len(report)} listings, {manifest["mappedOccurrences"]} shifts at {manifest["mappedVenues"]} venues')

if __name__ == '__main__': build()
