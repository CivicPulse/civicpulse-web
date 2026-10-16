#!/usr/bin/env python3
"""Rebuild BCSD events from saved ICS and visually reviewed PDF dates, offline.

Uses the existing RFC5545 recurrence importer and python-dateutil. Reruns replace
one snapshot, use stable source IDs, and merge matching feed/PDF academic dates.
"""
import hashlib
import importlib.util
import json
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/bcsd-events'
spec = importlib.util.spec_from_file_location('calendar_ics', ROOT / 'scripts/import-mgdsa.py')
ics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ics)


def identity(value):
    return 'bcsd-' + hashlib.sha256(value.encode()).hexdigest()[:20]


def base_event(manifest):
    return dict(category='Education', organizer='Bibb County School District',
                organizationId='bcsd', sourceGroup='bcsd', sample=False,
                sourceChecked=manifest['captured'])


def build_records(manifest, feed_text, academic):
    lower = datetime.fromisoformat(manifest['windowStart']).replace(tzinfo=ics.EASTERN)
    upper = datetime.fromisoformat(manifest['windowEndExclusive']).replace(tzinfo=ics.EASTERN)
    output = {}
    for uid, original, event, start in ics.expand(ics.components(feed_text), lower, upper):
        if 'DURATION' in event:
            raise ValueError('DURATION requires explicit review')
        title = ics.text_value(event, 'SUMMARY')
        if not title:
            continue
        all_day = event['DTSTART'][0][0].get('VALUE') == 'DATE'
        base = ics.date(event['DTSTART'][0])
        end = ics.date(event['DTEND'][0]) if 'DTEND' in event else base + timedelta(days=1) if all_day else base
        finish = start + (end - base)
        location = ics.text_value(event, 'LOCATION')
        record = dict(**base_event(manifest), id=identity(f'{uid}|{original.isoformat()}'),
                      title=title, start=start.astimezone(ics.EASTERN).isoformat(),
                      end=finish.astimezone(ics.EASTERN).isoformat(), allDay=all_day,
                      location=location or 'District-wide',
                      address=location or 'Bibb County School District — no single venue specified.',
                      description=ics.text_value(event, 'DESCRIPTION') or 'Published on the BCSD district calendar.',
                      note='Saved public BCSD calendar snapshot. Confirm changes and meeting arrangements with the district.',
                      sourceUrl=manifest['feedUrl'], sourceLabel='View BCSD calendar feed',
                      sourceEventId=uid, calendarIds=['bcsd-district'])
        if not all_day and 'DTEND' not in event:
            record['endTimeUnknown'] = True
        output[record['id']] = record

    for row in academic:
        start = datetime.fromisoformat(row['start']).replace(tzinfo=ics.EASTERN)
        end = datetime.fromisoformat(row['endExclusive']).replace(tzinfo=ics.EASTERN)
        if not lower <= start < end <= upper:
            raise ValueError(f'Academic date outside import window: {row}')
        # Names differing between the PDF/feed require explicit reviewed aliases.
        candidates = [e for e in output.values() if e['allDay'] and
                      e['title'] == row.get('feedTitle', row['title']) and
                      e['start'][:10] == row['start'] and e['end'][:10] == row['endExclusive']]
        if len(candidates) > 1:
            raise ValueError(f'Ambiguous academic date: {row}')
        record = candidates[0] if candidates else dict(**base_event(manifest),
            id=identity(f"academic|{row['title']}|{row['start']}"),
            start=start.isoformat(), end=end.isoformat(), allDay=True,
            location='District-wide', address='Bibb County School District — no single venue specified.',
            calendarIds=[])
        merged = bool(candidates)
        record.update(title=row['title'], description=row['description'],
                      sourceUrl=manifest['pdfUrl'], sourceLabel='View BCSD 2026–27 academic calendar',
                      note='Academic calendar approved March 19, 2026. ' +
                      ('Also listed in the saved district feed. ' if merged else '') +
                      'Confirm updates with BCSD; this is a saved snapshot.',
                      calendarIds=sorted(set(record['calendarIds'] + ['bcsd-academic'])))
        output[record['id']] = record
    return sorted(output.values(), key=lambda e: (e['start'], e['id']))


def build():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    events = build_records(manifest, (SOURCE / 'district.ics').read_text(),
                           json.loads((SOURCE / 'academic-dates.json').read_text()))
    (ROOT / 'src/data/bcsd-events.json').write_text(json.dumps(events, indent=2, ensure_ascii=False) + '\n')
    report = dict(events=len(events), feedOccurrences=sum('bcsd-district' in e['calendarIds'] for e in events),
                  academicPeriods=sum('bcsd-academic' in e['calendarIds'] for e in events),
                  mergedPeriods=sum(len(e['calendarIds']) == 2 for e in events),
                  mappedOccurrences=0, windowStart=manifest['windowStart'],
                  windowEndExclusive=manifest['windowEndExclusive'])
    (SOURCE / 'import-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    build()
