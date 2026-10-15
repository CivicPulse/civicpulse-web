import importlib.util
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET
from datetime import datetime

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mgrls',ROOT/'scripts/import-mgrls-events.py')
mgrls=importlib.util.module_from_spec(spec);spec.loader.exec_module(mgrls)

class MGRLSEventsTests(unittest.TestCase):
 def setUp(self):self.events=json.loads((ROOT/'src/data/mgrls-events.json').read_text())
 def test_complete_uncapped_coverage_and_unique_source_ids(self):
  records=mgrls.month_records();self.assertEqual(len(records),446)
  self.assertEqual({e['sourceEventId'] for e in self.events},set(records))
  self.assertEqual(len({e['id'] for e in self.events}),446)
  feed=ET.fromstring((mgrls.SOURCE/'all-events.rss.xml').read_bytes())
  feed_ids={item.findtext('link').split('id=')[1].split('&')[0] for item in feed.findall('./channel/item')}
  self.assertEqual(len(feed_ids),200)
  self.assertTrue(feed_ids.issubset(set(records)))
 def test_all_day_dates_and_daylight_saving_offsets(self):
  all_day=[e for e in self.events if e['allDay']];self.assertEqual(len(all_day),7)
  for e in all_day:
   start=datetime.fromisoformat(e['start']);end=datetime.fromisoformat(e['end'])
   self.assertEqual((start.hour,start.minute,end.hour,end.minute),(0,0,0,0));self.assertGreater(end,start)
  self.assertTrue(any(e['start'].startswith('2026-10') and e['start'].endswith('-04:00') for e in self.events))
  self.assertTrue(any(e['start'].startswith('2026-11') and e['start'].endswith('-05:00') for e in self.events))
 def test_reviewed_locations_and_mobile_programs(self):
  mobile=[e for e in self.events if e['sourceLocation']=='Library Without Walls'];self.assertEqual(len(mobile),21)
  self.assertTrue(all('coordinates' not in e for e in mobile))
  sale=next(e for e in self.events if e['sourceEventId']=='192155044');self.assertNotIn('coordinates',sale)
  sweet=next(e for e in self.events if e['sourceEventId']=='192153892')
  self.assertIn('Sweet Eleanor',sweet['location']);self.assertIn('530 Poplar',sweet['address'])
  self.assertEqual(sweet['coordinates'],[-83.62924058101,32.834490488543])
  self.assertNotIn('libraryBranchId',sweet)
  mapped=[e for e in self.events if 'coordinates' in e];self.assertEqual(len(mapped),424)
  self.assertEqual(len({tuple(e['coordinates']) for e in mapped}),18)
 def test_category_memberships_match_catalog(self):
  catalog=json.loads((ROOT/'src/data/calendars.json').read_text());calendars={c['id']:c for c in catalog['calendars']}
  self.assertEqual(len({e['category'] for e in self.events}),7)
  for e in self.events:
   self.assertEqual(e['organizationId'],'mgrls');self.assertTrue(e['calendarIds'])
   self.assertTrue(all(calendars[c]['organizationId']=='mgrls' for c in e['calendarIds']))
 def test_unknown_end_and_mismatched_dates(self):
  start=datetime(2026,11,3,10,30,tzinfo=mgrls.EASTERN)
  end,all_day,unknown=mgrls.times('Tue, Nov 3, 2026 10:30am | US/Eastern',start)
  self.assertEqual(end,start);self.assertFalse(all_day);self.assertTrue(unknown)
  with self.assertRaises(ValueError):mgrls.times('Tue, Nov 3, 2026 11:30am - 12:30pm | US/Eastern',start)

if __name__=='__main__':unittest.main()
