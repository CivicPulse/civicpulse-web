"""Build the library GeoJSON offline from the reviewed MGRLS snapshot."""
from pathlib import Path
import json
import re
from html import escape
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/mgrls'

def build():
    branches = json.loads((SOURCE / 'branches.json').read_text())
    census = json.loads((SOURCE / 'geocoder-responses.json').read_text())
    alternatives = json.loads((SOURCE / 'alternate-geocoder-responses.json').read_text())
    overrides = json.loads((SOURCE / 'geocoder-overrides.json').read_text())
    features = []
    for branch in branches:
        if branch['kind'] == 'mobile':
            continue
        assert branch['address'] and branch['hours'] and branch['county']
        if branch['id'] in overrides:
            result = alternatives[overrides[branch['id']]]
            assert len(result['response']) == 1, f"Ambiguous alternative: {branch['name']}"
            match = result['response'][0]
            assert match['address']['county'] == branch['county']
            coordinates = [float(match['lon']), float(match['lat'])]
            geocoder = 'OpenStreetMap library feature'
            geocode_source = f"https://www.openstreetmap.org/{match['osm_type']}/{match['osm_id']}"
        else:
            matches = census[branch['url']]['response']['result']['addressMatches']
            assert len(matches) == 1, f"Review unmatched/ambiguous address: {branch['name']}"
            match = matches[0]
            assert match['geographies']['Counties'][0]['NAME'] == branch['county'], f"Wrong county: {branch['name']}"
            coordinates = [match['coordinates']['x'], match['coordinates']['y']]
            geocoder = 'US Census address interpolation'
            geocode_source = 'https://geocoding.geo.census.gov/'
        assert -85 < coordinates[0] < -82 and 31 < coordinates[1] < 34
        features.append(dict(type='Feature', geometry=dict(type='Point', coordinates=coordinates), properties=dict(
            id=branch['id'], name=branch['name'], county=branch['county'], fulladd=branch['address'], phone=branch['phone'],
            kind=branch['kind'], hours=branch['hours'], sourceUrl=branch['url'], sourceChecked=branch['sourceChecked'],
            geocoder=geocoder, geocodeSource=geocode_source)))
    assert len(features) == 18 and len({f['properties']['county'] for f in features}) == 7
    (ROOT / 'public/data/libraries.geojson').write_text(json.dumps(dict(type='FeatureCollection', features=features), indent=2, ensure_ascii=False)+'\n')
    counties = json.loads((ROOT / 'src/data/library-counties.json').read_text())
    template = (ROOT / 'scripts/library-marker.svg').read_text()
    assert {c['name'] for c in counties} == {f['properties']['county'] for f in features}
    for county in counties:
        assert re.fullmatch(r'#[0-9a-fA-F]{6}', county['color'])
        target = ROOT / 'public' / county['icon'].lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(template.replace('__COLOR__', county['color']).replace('__COUNTY__', escape(county['name'])))
    print(f'Built {len(features)} fixed MGRLS locations in 7 counties; Library WOW remains a mobile-service link.')

if __name__ == '__main__': build()
