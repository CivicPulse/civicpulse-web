#!/usr/bin/env python3
"""Rebuild school and transit GeoJSON from saved official sources; no network calls.
Uses only Python standard-library modules. Proposed-zone datasets are excluded.
"""
import csv
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BCSD = ROOT / 'data/sources/bcsd'
TRANSIT = ROOT / 'data/sources/mbcta'
PUBLIC = ROOT / 'public/data'
manifest = json.loads((BCSD / 'manifest.json').read_text())
outputs = []

def save(key, features, **meta):
    assert features, key
    assert len({f['id'] for f in features}) == len(features), key
    for f in features:
        assert f['geometry'], (key, f['id'])
        def positions(c):
            if isinstance(c[0], (int, float)):yield c
            else:
                for child in c:yield from positions(child)
        coords = list(positions(f['geometry']['coordinates']))
        assert coords and all(-84 < c[0] < -83 and 32 < c[1] < 34 for c in coords), (key, f['id'])
    path = PUBLIC / (key + '.geojson')
    path.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
    outputs.append({'id': key, 'data': '/data/' + key + '.geojson', 'featureCount': len(features), **meta})
    print(key, len(features))

for spec in manifest['datasets']:
    key = spec['id']
    raw = json.loads((BCSD / (key + '.geojson')).read_text())
    assert len(raw['features']) == spec['count'], key
    assert spec['status'] == 'existing', 'Only published datasets may be imported'
    credit = manifest['attributionExisting']
    common = {'sourceUrl': spec['url'], 'sourceChecked': manifest['checked'], 'attribution': credit, 'zoneStatus': 'existing'}
    features = []
    for f in raw['features']:
        p = f['properties']; rid = key + ':' + str(p['OBJECTID'])
        name = p.get('NAME') or p.get('Name') or 'Board of Education District ' + str(p.get('DistrictID') or p.get('DISTRICT'))
        props = {**p, **common, 'id': rid, 'name': name}
        if key == 'schools':
            props.update(fulladd=', '.join(str(p.get(x) or '') for x in ['ADDRESS1', 'CITY', 'STATE', 'POSTALCODE']), schoolType=p.get('Type'), recordStatus=p.get('Status'))
        if key.startswith('school-zones-'):props['sourceSchoolYear'] = p.get('TermName')
        features.append({'type': 'Feature', 'id': rid, 'properties': props, 'geometry': f['geometry']})
    save(key, features, sourceUrl=spec['url'], attribution=credit, zoneStatus='existing', sourceSchoolYear='2025–26' if key.startswith('school-zones-') else None)


# Retain the complete source download, and expose non-overlapping type subsets.
school_features = json.loads((PUBLIC / 'schools.geojson').read_text())['features']
school_types = {
    'Elementary School': 'elementary', 'Middle School': 'middle', 'High School': 'high',
    'Pre-K': 'pre-k', 'Administration': 'administration', 'Specialty School': 'specialty',
}
assert {f['properties']['schoolType'] for f in school_features} <= set(school_types), 'Review new school types'
for school_type, slug in school_types.items():
    subset = [f for f in school_features if f['properties']['schoolType'] == school_type]
    source = next(spec for spec in outputs if spec['id'] == 'schools')
    save('schools-' + slug, subset, sourceUrl=source['sourceUrl'], attribution=source['attribution'],
         zoneStatus='existing', derivedFrom='schools', schoolType=school_type)
assert sum(spec['featureCount'] for spec in outputs if spec.get('derivedFrom') == 'schools') == len(school_features)

with zipfile.ZipFile(TRANSIT / 'google_transit.zip') as z:
    def rows(filename):return list(csv.DictReader(io.StringIO(z.read(filename).decode('utf-8-sig'))))
    routes = rows('routes.txt'); stops = rows('stops.txt'); trips = rows('trips.txt'); times = rows('stop_times.txt'); points = rows('shapes.txt'); info = rows('feed_info.txt')[0]
    trip_by_id = {r['trip_id']: r for r in trips}
    route_by_id = {r['route_id']: r for r in routes}
    route_shapes = defaultdict(set); route_headsigns = defaultdict(set); stop_routes = defaultdict(set)
    shapes = defaultdict(list)
    for p in points:shapes[p['shape_id']].append((int(p['shape_pt_sequence']), float(p['shape_pt_lon']), float(p['shape_pt_lat'])))
    for trip in trips:
        assert trip['route_id'] in route_by_id and trip['shape_id'] in shapes
        route_shapes[trip['route_id']].add(trip['shape_id']); route_headsigns[trip['route_id']].add(trip['trip_headsign'])
    for t in times:
        assert t['trip_id'] in trip_by_id
        stop_routes[t['stop_id']].add(trip_by_id[t['trip_id']]['route_id'])
    assert set(stop_routes) <= {s['stop_id'] for s in stops}
    common = {'sourceUrl': 'https://myride.mbcta.net/gtfs/google_transit.zip', 'sourceChecked': '2026-10-15',
              'attribution': 'Macon-Bibb County Transit Authority', 'serviceStart': info['feed_start_date'], 'serviceEnd': info['feed_end_date'], 'feedVersion': info['feed_version'], 'liveArrivals': False}
    features = []
    for route in routes:
        rid = route['route_id']; name = 'Route ' + route['route_short_name'] + ' · ' + route['route_long_name']
        lines = [[[lon, lat] for _, lon, lat in sorted(shapes[sid])] for sid in sorted(route_shapes[rid])]
        assert lines and all(len(line) >= 2 for line in lines)
        props = {**route, **common, 'id': rid, 'name': name, 'shapeIds': sorted(route_shapes[rid]), 'variantCount': len(lines), 'directions': sorted(route_headsigns[rid])}
        features.append({'type': 'Feature', 'id': rid, 'properties': props, 'geometry': {'type': 'MultiLineString', 'coordinates': lines}})
    save('transit-routes', features, sourceUrl=common['sourceUrl'], attribution=common['attribution'], shapeCount=len(shapes), serviceStart=common['serviceStart'], serviceEnd=common['serviceEnd'])
    features = []
    for stop in stops:
        route_ids = sorted(stop_routes[stop['stop_id']], key=lambda rid: int(route_by_id[rid]['route_short_name']))
        props = {**stop, **common, 'id': stop['stop_id'], 'name': stop['stop_name'], 'routeIds': route_ids,
                 'routeNumbers': [route_by_id[rid]['route_short_name'] for rid in route_ids],
                 'routeNames': [route_by_id[rid]['route_long_name'] for rid in route_ids]}
        features.append({'type': 'Feature', 'id': stop['stop_id'], 'properties': props,
                         'geometry': {'type': 'Point', 'coordinates': [float(stop['stop_lon']), float(stop['stop_lat'])]}})
    save('transit-stops', features, sourceUrl=common['sourceUrl'], attribution=common['attribution'], serviceStart=common['serviceStart'], serviceEnd=common['serviceEnd'])
# Rapid's official KML is a separate on-demand service, not a GTFS schedule.
rapid_dir = ROOT / 'data/sources/mbcta-rapid'
rapid = json.loads((rapid_dir / 'manifest.json').read_text())
kml = ET.parse(rapid_dir / 'service-area.kml').getroot()
ns = {'k': 'http://www.opengis.net/kml/2.2'}
features = []
for i, placemark in enumerate(kml.findall('.//k:Placemark', ns), 1):
    def ring(element):
        values = [[float(n) for n in c.split(',')[:2]] for c in (element.text or '').split()]
        assert len(values) >= 4 and values[0] == values[-1]
        return values
    polygons = []
    for polygon in placemark.findall('.//k:Polygon', ns):
        outer = polygon.find('k:outerBoundaryIs/k:LinearRing/k:coordinates', ns)
        assert outer is not None
        rings = [ring(outer)] + [ring(inner) for inner in polygon.findall('k:innerBoundaryIs/k:LinearRing/k:coordinates', ns)]
        polygons.append(rings)
    assert polygons
    original = placemark.findtext('k:name', namespaces=ns)
    rid = 'rapid-zone-' + str(i)
    props = {'id': rid, 'name': rapid['publishedZoneNames'][i-1], 'zoneNumber': i, 'originalName': original,
             'originalDescription': placemark.findtext('k:description', default='', namespaces=ns),
             'sourceUrl': rapid['sourceUrl'], 'sourceMap': rapid['embeddedMap'], 'sourceChecked': rapid['checked'],
             'attribution': rapid['attribution'], 'serviceType': 'on-demand rideshare'}
    geom = {'type': 'Polygon', 'coordinates': polygons[0]} if len(polygons) == 1 else {'type': 'MultiPolygon', 'coordinates': polygons}
    features.append({'type': 'Feature', 'id': rid, 'properties': props, 'geometry': geom})
assert len(features) == rapid['expectedZones']
save('rapid-service-area', features, sourceUrl=rapid['sourceUrl'], sourceMap=rapid['embeddedMap'], attribution=rapid['attribution'], serviceType='on-demand rideshare')
summary = {'checked': manifest['checked'], 'schoolMap': manifest['officialMap'], 'transitFeed': common, 'datasets': outputs}
(ROOT / 'src/data/education-transit.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print('Verified and rebuilt', len(outputs), 'datasets offline.')
