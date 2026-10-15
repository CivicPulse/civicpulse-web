"""Offline checks for Google Calendar recurrence import behavior."""
import importlib.util
from datetime import datetime
from pathlib import Path
import unittest
import json
from tempfile import TemporaryDirectory
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('mgdsa', Path(__file__).resolve().parents[1] / 'scripts/import-mgdsa.py')
mgdsa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mgdsa)

class CalendarImportTests(unittest.TestCase):
    def expand(self, source):
        return list(mgdsa.expand(mgdsa.components(source), datetime(2026, 10, 1, tzinfo=mgdsa.EASTERN), datetime(2026, 12, 1, tzinfo=mgdsa.EASTERN)))

    def test_weekly_dst_exclusion_and_moved_occurrence(self):
        source = '''BEGIN:VEVENT
UID:weekly
DTSTART;TZID=America/New_York:20261022T110000
DTEND;TZID=America/New_York:20261022T123000
RRULE:FREQ=WEEKLY;COUNT=5
EXDATE;TZID=America/New_York:20261029T110000
SUMMARY:Meal making
END:VEVENT
BEGIN:VEVENT
UID:weekly
RECURRENCE-ID;TZID=America/New_York:20261112T110000
DTSTART;TZID=America/New_York:20261113T120000
DTEND;TZID=America/New_York:20261113T133000
SUMMARY:Moved meal making
END:VEVENT'''
        events = self.expand(source)
        self.assertEqual([e[3].isoformat() for e in events], ['2026-10-22T11:00:00-04:00','2026-11-05T11:00:00-05:00','2026-11-13T12:00:00-05:00','2026-11-19T11:00:00-05:00'])

    def test_cancelled_override_without_start(self):
        events = self.expand('''BEGIN:VEVENT
UID:cancel
DTSTART;TZID=America/New_York:20261022T110000
RRULE:FREQ=WEEKLY;COUNT=2
END:VEVENT
BEGIN:VEVENT
UID:cancel
RECURRENCE-ID;TZID=America/New_York:20261029T110000
STATUS:CANCELLED
END:VEVENT''')
        self.assertEqual(len(events), 1)

    def test_all_day_unfolding_and_nested_alarm(self):
        event = mgdsa.components('''BEGIN:VEVENT
UID:all-day
DTSTART;VALUE=DATE:20261022
DTEND;VALUE=DATE:20261024
SUMMARY:A long
  title
DESCRIPTION:One\\, two\\nThree
BEGIN:VALARM
DESCRIPTION:Alarm
END:VALARM
END:VEVENT''')[0]
        self.assertEqual(mgdsa.text_value(event, 'SUMMARY'), 'A long title')
        self.assertEqual(mgdsa.text_value(event, 'DESCRIPTION'), 'One, two\nThree')
        self.assertEqual((mgdsa.date(event['DTEND'][0])-mgdsa.date(event['DTSTART'][0])).days, 2)

    def test_same_occurrence_in_two_calendars_keeps_both_memberships(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source'
            for path in [source, root / 'src/data', root / 'public/data']:
                path.mkdir(parents=True)
            (source / 'manifest.json').write_text(json.dumps(dict(windowStart='2026-10-01', windowEndExclusive='2026-11-01', sourcePage='https://example.com/calendar', captured='2026-10-15', feeds=[dict(file='a.ics', calendarId='a'), dict(file='b.ics', calendarId='b')])))
            (source / 'venues.json').write_text('[]')
            (root / 'src/data/calendars.json').write_text(json.dumps(dict(calendars=[dict(id='first', sourceCalendar='a'), dict(id='second', sourceCalendar='b')])))
            event = 'BEGIN:VEVENT\nUID:shared\nDTSTART;TZID=America/New_York:20261022T110000\nDTEND;TZID=America/New_York:20261022T120000\nSUMMARY:Shared meeting\nEND:VEVENT'
            for name in ['a.ics', 'b.ics']:
                (source / name).write_text(event)
            with patch.object(mgdsa, 'ROOT', root), patch.object(mgdsa, 'SOURCE', source):
                mgdsa.build()
            imported = json.loads((root / 'src/data/mgdsa-events.json').read_text())
            self.assertEqual(len(imported), 1)
            self.assertEqual(imported[0]['organizationId'], 'mgdsa')
            self.assertEqual(imported[0]['calendarIds'], ['first', 'second'])

if __name__ == '__main__': unittest.main()
