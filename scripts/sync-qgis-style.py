"""Export the visible voting-layer symbology from the saved QGIS project."""
import json
import sys
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'polling_locations.qgz'
with zipfile.ZipFile(PROJECT) as archive:
    document = ET.fromstring(archive.read(next(name for name in archive.namelist() if name.endswith('.qgs'))))


def rgba(value):
    return [int(part) for part in value.split(',')[:4]]


def hex_color(channels):
    return '#' + ''.join(f'{part:02x}' for part in channels[:3])


result = {'source': 'polling_locations.qgz', 'layers': {}}
icons = ROOT / 'public/icons/polling'
icons.mkdir(parents=True, exist_ok=True)
for layer in document.findall('./projectlayers/maplayer'):
    name = layer.findtext('layername')
    if name not in ['polling_places', 'voting_precincts']:
        continue
    renderer = layer.find('renderer-v2')
    symbols = {symbol.get('name'): symbol for symbol in renderer.findall('./symbols/symbol')}
    categories = {}
    for category in renderer.findall('./categories/category'):
        symbol = symbols[category.get('symbol')]
        props = {option.get('name'): option.get('value') for option in symbol.findall('./layer/Option/Option')}
        fill, stroke = rgba(props['color']), rgba(props['outline_color'])
        alpha = float(layer.findtext('layerOpacity', '1')) * float(symbol.get('alpha', '1'))
        row = {'label': category.get('label'), 'color': hex_color(fill), 'fillOpacity': fill[3] / 255 * alpha, 'outline': hex_color(stroke), 'outlineOpacity': stroke[3] / 255 * alpha, 'outlineWidth': float(props['outline_width']) * 96 / 25.4}
        if name == 'polling_places':
            source = (PROJECT.parent / props['name']).resolve()
            svg = source.read_text().replace('param(fill) #f5a400', row['color']).replace('param(outline) #ffffff', row['outline']).replace('param(outline-width) 0.3', props['outline_width'])
            filename = f"ballot-{row['color'][1:]}.svg"
            (icons / filename).write_text(svg)
            row['icon'] = f'/icons/polling/{filename}'
            row['size'] = float(props['size']) * 96 / 25.4
        categories[category.get('value')] = row
    result['layers'][name] = categories
(ROOT / 'src/data/qgis-style.json').write_text(json.dumps(result, indent=2) + '\n')
print('Exported QGIS colors for', {name: len(styles) for name, styles in result['layers'].items()}, 'and', len(list(icons.glob('*.svg'))), 'ballot icons.')
