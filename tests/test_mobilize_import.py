"""Offline regression checks for the saved Mobilize import."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('mobilize', ROOT / 'scripts/import-mobilize.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class MobilizeImportTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((module.SOURCE / 'browser-snapshot.json').read_text())
        self.events = json.loads((ROOT / 'src/data/mobilize-events.json').read_text())

    def test_all_captured_shifts_and_legacy_links_are_preserved_once(self):
        self.assertEqual(len(self.snapshot['events']), 25)
        self.assertEqual(len(self.events), 119)
        expected = sum(len(page['slots']) or 1 for page in self.snapshot['events'])
        self.assertEqual(len(self.events), expected)
        self.assertEqual(len({(e['sourceEventId'],e['start']) for e in self.events}), expected)
        self.assertEqual(len({e['id'] for e in self.events}), expected)
        legacy = json.loads((ROOT / 'src/data/events.json').read_text())
        imported_ids = {e['id'] for e in self.events}
        for e in legacy:
            if e.get('sourceUrl','').startswith('https://www.mobilize.us/'):
                self.assertIn(e['id'], imported_ids)

    def test_multiple_daily_shifts_and_distinct_listings_survive(self):
        same_day = [e for e in self.events if e['sourceEventId']=='1032004' and e['start'].startswith('2026-10-15')]
        self.assertEqual([e['start'][11:16] for e in same_day], ['16:00','18:00'])
        self.assertEqual(len([e for e in self.events if e['sourceEventId']=='1032025']), 25)

    def test_private_and_virtual_locations_are_not_plotted(self):
        for e in self.events:
            if e['addressPrivate'] or e['isVirtual']:
                self.assertNotIn('coordinates', e)
        mapped = [e for e in self.events if 'coordinates' in e]
        self.assertEqual(len(mapped), 29)
        self.assertEqual(len({tuple(e['coordinates']) for e in mapped}), 9)
        self.assertTrue(all(module.distance(self.snapshot['center'], e['coordinates']) <= 35 for e in mapped))
        self.assertNotIn('\ufffd', json.dumps(self.snapshot,ensure_ascii=False))

    def test_source_timezone_change_and_single_event_end(self):
        walk = next(e for e in self.events if e['sourceEventId']=='1066318' and e['start'].startswith('2026-11-01'))
        self.assertEqual(walk['start'], '2026-11-01T13:00:00-05:00')
        evening = next(e for e in self.events if e['sourceEventId']=='1066323')
        self.assertEqual(evening['end'], '2026-10-23T22:00:00-04:00')

    def test_year_rollover_and_invalid_source_offset(self):
        page = {'url':'fixture','times':[{'datetime':'2026-12-28T23:00:00Z','text':'Mondays'}], 'slots':['Mon, Dec 28, 6:00pm–7:00pm EST','Mon, Jan 4, 6:00pm–7:00pm EST']}
        self.assertEqual(module.scheduled_times(page)[1][0].year, 2027)
        page['slots'][0]='Mon, Dec 28, 6:00pm–7:00pm EDT'
        with self.assertRaises(ValueError): module.scheduled_times(page)

if __name__=='__main__': unittest.main()
