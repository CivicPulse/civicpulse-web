#!/usr/bin/env python3
"""Offline Georgia election maps from saved official sources. Requires Shapely 2.x.

PSC geometry is derived from official county GIS and SB 472's enacted county
assignments; it is NOT presented as a native PSC GIS download.
"""
import gzip
import json
from pathlib import Path
from shapely import make_valid
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/election-districts'


def load(key):
    with gzip.open(SOURCE / (key + '.geojson.gz'), 'rt') as stream:
        data = json.load(stream)
    if data.get('exceededTransferLimit') or data.get('type') != 'FeatureCollection':
        raise ValueError(f'Incomplete source: {key}')
    for feature in data['features']:
        geometry = shape(feature['geometry'])
        if not geometry.is_valid:
            repaired = make_valid(geometry)
            if repaired.geom_type == 'GeometryCollection':
                repaired = unary_union([g for g in repaired.geoms if g.geom_type in ('Polygon', 'MultiPolygon')])
            feature['geometry'] = mapping(repaired)
            feature['properties']['webGeometryRepaired'] = True
    return data['features']


def build():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    sources = {s['id']: s for s in manifest['sources']}
    counties = {f['properties']['BASENAME']: f for f in load('georgia-counties')}
    if len(counties) != 159:
        raise ValueError('Expected all 159 Georgia counties')
    bibb = shape(counties['Bibb']['geometry'])
    output = []
    def save(key, features, **meta):
        if len(features) != len({f['id'] for f in features}):
            raise ValueError('Duplicate district IDs')
        for f in features:
            geom = shape(f['geometry'])
            if geom.is_empty or not geom.is_valid or geom.geom_type not in ('Polygon', 'MultiPolygon'):
                raise ValueError(f'Invalid polygon: {f["id"]}')
        path = ROOT / 'public/data' / (key + '.geojson')
        path.write_text(json.dumps(dict(type='FeatureCollection', features=features), separators=(',', ':'), allow_nan=False) + '\n')
        output.append(dict(id=key, data='/data/'+key+'.geojson', featureCount=len(features),
                           bibbDistricts=[f['properties']['districtNumber'] for f in features if f['properties']['includesBibb'] and 'districtNumber' in f['properties']], repairedFeatures=[f['id'] for f in features if f['properties'].get('webGeometryRepaired')], **meta))

    for key, field, label in [('us-house-districts','CD120','U.S. House'),
                              ('state-house-districts','SLDL','Georgia House'),
                              ('state-senate-districts','SLDU','Georgia Senate')]:
        features = []
        raw = load(key)
        if len(raw) != sources[key]['sourceFeatureCount']:
            raise ValueError('Wrong source count')
        for f in sorted(raw, key=lambda f: int(f['properties'][field])):
            p = f['properties']
            if p['STATE'] != '13' or (key == 'us-house-districts' and p['CDSESSN'] != '120') or (key != 'us-house-districts' and p['LSY'] != '2026'):
                raise ValueError('Unexpected boundary vintage')
            local = shape(f['geometry']).intersection(bibb).area > 1e-8
            number = str(int(p[field])); rid = key+':'+p['GEOID']
            props = dict(p, id=rid, name=f'{label} District {number}', districtNumber=number,
                         includesBibb=local, county='Bibb County' if local else '',
                         boundaryVintage='January 1, 2026', office=label,
                         planLabel='120th Congress · 2026 election cycle' if key == 'us-house-districts' else '2026 state legislative districts',
                         sourceUrl=sources[key]['url'], sourceChecked=manifest['checked'],
                         attribution=manifest['attribution'], derived=False,
                         geometryNote='Source GIS generalized to 0.00002 degrees for web display; full statewide district extents retained.')
            features.append(dict(type='Feature', id=rid, properties=props, geometry=f['geometry']))
        save(key, features, sourceUrl=sources[key]['url'], vintage=sources[key]['vintage'])

    assignments = json.loads((SOURCE / 'psc-counties.json').read_text())
    listed = [c for group in assignments['districts'].values() for c in group]
    if len(listed) != 159 or len(set(listed)) != 159 or set(listed) != set(counties):
        raise ValueError('PSC counties must partition all 159 Georgia counties exactly once')
    features=[]
    for number, names in assignments['districts'].items():
        rid='psc-districts:'+number
        geom=unary_union([shape(counties[c]['geometry']) for c in names])
        props=dict(id=rid,name=f'PSC Residency District {int(number)}',districtNumber=str(int(number)),
                   includesBibb='Bibb' in names,county=', '.join(c+' County' for c in names),counties=names,
                   office='Georgia Public Service Commission',boundaryVintage='PSC-2022 county assignments; January 1, 2026 county GIS',
                   planLabel='PSC-2022 · statewide elections',derived=True,
                   sourceUrl=assignments['sourceUrl'],sourceChecked=manifest['checked'],
                   attribution='Georgia General Assembly (SB 472 / PSC-2022); U.S. Census Bureau (county GIS)',
                   geometryNote='Derived by dissolving Census county polygons using the enacted PSC-2022 county assignments. Not a native PSC GIS layer.',
                   electionNote='Commissioners must reside in their district, but voters statewide elect each commissioner.')
        features.append(dict(type='Feature',id=rid,properties=props,geometry=mapping(geom)))
    save('psc-districts',features,sourceUrl=assignments['sourceUrl'],derived=True,vintage='PSC-2022 county assignments')
    f=load('georgia-statewide')[0];rid='georgia-statewide:13'
    props=dict(f['properties'],id=rid,name='Georgia — U.S. Senate / statewide electorate',includesBibb=True,
               county='All Georgia counties, including Bibb County',office='U.S. Senate and statewide offices',
               sourceUrl=sources['georgia-statewide']['url'],sourceChecked=manifest['checked'],
               attribution=manifest['attribution'],boundaryVintage='January 1, 2026',derived=False,
               planLabel='Georgia statewide boundary',geometryNote='Full Georgia state boundary from Census GIS.',
               electionNote='Both U.S. senators represent the entire state. There are no separate U.S. Senate districts within Georgia.')
    save('georgia-statewide',[dict(type='Feature',id=rid,properties=props,geometry=f['geometry'])],sourceUrl=sources['georgia-statewide']['url'],vintage='January 1, 2026')
    (ROOT/'src/data/election-districts.json').write_text(json.dumps(dict(checked=manifest['checked'],datasets=output),indent=2)+'\n')
    print(json.dumps(output,indent=2))


if __name__ == '__main__':
    build()
