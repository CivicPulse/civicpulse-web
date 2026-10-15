"""Generate intentionally illustrative WGS84 features; not official GIS data."""
import json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/data'
def write(name,features):
 (OUT/f'{name}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{'sample':True,**props},'geometry':geom} for props,geom in features]},indent=2)+'\n')
def point(name,description,lon,lat):
 return ({'name':name,'description':description},{'type':'Point','coordinates':[lon,lat]})
write('parks',[point('Tattnall Square Park','Sample park marker; location is approximate.',-83.6491,32.8277),point('Amerson River Park','Sample park marker; location is approximate.',-83.6695,32.8767),point('Central City Park','Sample park marker; location is approximate.',-83.6187,32.8326)])
write('libraries',[point('Washington Memorial Library','Sample library marker; not a service directory.',-83.6384,32.8403),point('Riverside Branch Library','Illustrative location for the map demonstration.',-83.6835,32.8870)])
write('community-spaces',[point('Downtown gathering space','Illustrative community space.',-83.6288,32.8360),point('West Macon gathering space','Illustrative community space.',-83.6972,32.8142),point('East Macon gathering space','Illustrative community space.',-83.6060,32.8460)])
write('neighborhoods',[
 ({'name':'Central area','description':'Illustrative area, not an official neighborhood boundary.'},{'type':'Polygon','coordinates':[[[-83.658,32.825],[-83.627,32.825],[-83.623,32.847],[-83.652,32.850],[-83.658,32.825]]]}),
 ({'name':'Riverside area','description':'Illustrative area, not an official neighborhood boundary.'},{'type':'Polygon','coordinates':[[[-83.680,32.855],[-83.654,32.855],[-83.639,32.88],[-83.674,32.889],[-83.680,32.855]]]})])
write('trails',[({'name':'Sample riverside connection','description':'Illustrative line only. Not a navigable route or official trail.'},{'type':'LineString','coordinates':[[-83.666,32.877],[-83.650,32.866],[-83.635,32.852],[-83.628,32.843],[-83.615,32.833]]})])
events=json.loads((OUT.parents[1]/'src/data/events.json').read_text())
write('events',[({'id':e['id'],'name':e['title'],'description':'Fictional event location for demonstration.'},{'type':'Point','coordinates':e['coordinates']}) for e in events])
print('Generated 6 labeled sample GeoJSON files.')
