"""BCSD recurrence, source reconciliation and date-boundary regression checks."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bcsd', ROOT / 'scripts/import-bcsd-events.py')
bcsd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bcsd)
SOURCE = ROOT / 'data/sources/bcsd-events'


class BCSDImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((SOURCE / 'manifest.json').read_text())
        cls.feed = (SOURCE / 'district.ics').read_text()
        cls.academic = json.loads((SOURCE / 'academic-dates.json').read_text())
        cls.events = bcsd.build_records(cls.manifest, cls.feed, cls.academic)

    def test_shared_break_is_one_event_in_both_calendars(self):
        events = [e for e in self.events if e['title'] == 'Fall Break']
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]['calendarIds'], ['bcsd-academic', 'bcsd-district'])
        self.assertEqual(events[0]['end'][:10], '2026-10-17')
        self.assertEqual(sum(len(e['calendarIds']) == 2 for e in self.events), 9)

    def test_monthly_board_meetings_keep_local_time_across_dst(self):
        meetings = [e for e in self.events if e['title'] == 'BOE Board Meeting']
        for day, offset in [('2026-10-15', '-04:00'), ('2026-11-19', '-05:00')]:
            event = next(e for e in meetings if e['start'].startswith(day))
            self.assertEqual(event['start'], day + 'T18:30:00' + offset)
            self.assertEqual(event['end'], day + 'T19:30:00' + offset)
        self.assertFalse(any(e['start'].startswith('2026-05-21') for e in meetings))

    def test_job_fair_daily_recurrence_and_unfolded_location(self):
        events = [e for e in self.events if e['title'] == 'Transportation Job Fair']
        self.assertEqual([e['start'][:10] for e in events], ['2026-10-13', '2026-10-14', '2026-10-15'])
        self.assertTrue(all(e['location'] == '4580 Cavalier Drive, Macon, GA 31206' for e in events))
        board = next(e for e in self.events if e['title'] == 'BOE Board Meeting')
        self.assertIn('31204', board['location'])

    def test_academic_qualifiers_and_cross_year_range(self):
        last = next(e for e in self.events if e['title'].startswith('Last Day of School'))
        self.assertIn('Half-Day', last['title'])
        self.assertEqual(len(last['calendarIds']), 2)
        winter = next(e for e in self.events if e['title'].startswith('Winter Break'))
        self.assertIn('makeup', winter['description'])
        holiday = next(e for e in self.events if e['title'] == 'Holiday Break')
        self.assertEqual(holiday['start'][:10], '2026-12-21')
        self.assertEqual(holiday['end'][:10], '2027-01-02')

    def test_preplanning_excludes_unhighlighted_weekend(self):
        events = [e for e in self.events if e['title'] == 'Pre-Planning']
        self.assertEqual([(e['start'][:10], e['end'][:10]) for e in events],
                         [('2026-07-23', '2026-07-25'), ('2026-07-27', '2026-08-01')])

    def test_repeat_import_stable_and_no_guessed_markers(self):
        self.assertEqual(self.events, bcsd.build_records(self.manifest, self.feed, self.academic))
        self.assertEqual(len(self.events), len({e['id'] for e in self.events}))
        self.assertTrue(all('coordinates' not in e and not e['sample'] for e in self.events))


if __name__ == '__main__':
    unittest.main()
