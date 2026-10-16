"""Regression checks for official Georgia district vintages and PSC derivation."""
import importlib.util
import json
from pathlib import Path
import unittest
from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('districts', ROOT / 'scripts/import-election-districts.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def data(name):
    return json.loads((ROOT / 'public/data' / (name + '.geojson')).read_text())['features']


class ElectionDistrictTests(unittest.TestCase):
    def test_complete_statewide_counts_and_unique_identifiers(self):
        for key, count in [('us-house-districts',14), ('state-house-districts',180), ('state-senate-districts',56), ('psc-districts',5), ('georgia-statewide',1)]:
            features = data(key)
            self.assertEqual(len(features), count)
            self.assertEqual(len({f['id'] for f in features}), count)
            for f in features:
                self.assertTrue(shape(f['geometry']).is_valid, f['id'])
                self.assertIn(shape(f['geometry']).geom_type, ['Polygon','MultiPolygon'])
                self.assertTrue(f['properties']['sourceUrl'].startswith('https://'))

    def test_correct_congress_and_state_vintages(self):
        self.assertEqual({f['properties']['CDSESSN'] for f in data('us-house-districts')}, {'120'})
        for name in ['state-house-districts', 'state-senate-districts']:
            self.assertEqual({f['properties']['LSY'] for f in data(name)}, {'2026'})

    def test_psc_is_exact_county_partition_and_dissolve(self):
        counties = {f['properties']['BASENAME']:shape(f['geometry']) for f in module.load('georgia-counties')}
        assignment = json.loads((module.SOURCE/'psc-counties.json').read_text())['districts']
        names = [name for group in assignment.values() for name in group]
        self.assertEqual(len(names),159)
        self.assertEqual(set(names),set(counties))
        for feature in data('psc-districts'):
            props = feature['properties']
            self.assertTrue(props['derived'])
            expected = unary_union([counties[name] for name in props['counties']])
            self.assertLess(shape(feature['geometry']).symmetric_difference(expected).area, 1e-10)
            self.assertIn('statewide',props['electionNote'])
        self.assertIn('Bibb',assignment['001'])
        self.assertIn('Chattooga',assignment['005'])

    def test_bibb_filter_matches_spatial_intersection(self):
        bibb = next(shape(f['geometry']) for f in module.load('georgia-counties') if f['properties']['GEOID']=='13021')
        for key in ['us-house-districts','state-house-districts','state-senate-districts']:
            for feature in data(key):
                self.assertEqual(feature['properties']['includesBibb'],shape(feature['geometry']).intersection(bibb).area>1e-8)
        self.assertEqual([f['properties']['districtNumber'] for f in data('us-house-districts') if f['properties']['includesBibb']], ['2','8'])


if __name__ == '__main__':
    unittest.main()
