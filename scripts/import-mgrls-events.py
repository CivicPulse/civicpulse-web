#!/usr/bin/env python3
"""Offline import of reviewed CalendarWiz month/detail snapshots; standard library only."""
from collections import Counter
from datetime import datetime, timedelta
import gzip
from html.parser import HTMLParser
import html
import json
from pathlib import Path
import re
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/sources/mgrls-events'
EASTERN = ZoneInfo('America/New_York')
START = datetime(2026,10,15,tzinfo=EASTERN)
END = datetime(2027,10,16,tzinfo=EASTERN)
CATEGORIES = {
 '303773': ('Adults','adults','#6b4e91'),
 '303798': ('Business and Nonprofit Center','business','#28746b'),
 '303771': ('Childrens','children','#a15b29'),
 '303776': ('Family','family','#35699b'),
 '303770': ('General Interest','general','#617340'),
 '315247': ('Technology Classes','technology','#9a466b'),
 '303834': ('Teens/ Young Adults','teens','#38667b'),
}
ROW = re.compile(r'<div[^>]*data-etimestamp="(\d+)"[^>]*data-event_id="(\d+)"[^>]*>.*?<a[^>]*class="cat(\d+)"[^>]*>(.*?)</a>',re.S)

class Node:
 def __init__(self,tag='',attrs=None): self.tag=tag;self.attrs=dict(attrs or []);self.children=[]
 def walk(self):
  yield self
  for child in self.children:
   if isinstance(child,Node): yield from child.walk()
 def text(self):
  if self.tag in ('script','style','head'): return ''
  return ('\n' if self.tag in ('br','p','div','tr','li') else ' ').join(child if isinstance(child,str) else child.text() for child in self.children)

class Document(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root];self.feed(text)
 def handle_starttag(self,tag,attrs):
  node=Node(tag,attrs);self.stack[-1].children.append(node)
  if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'): self.stack.append(node)
 def handle_startendtag(self,tag,attrs): self.handle_starttag(tag,attrs);self.handle_endtag(tag)
 def handle_endtag(self,tag):
  for index in range(len(self.stack)-1,0,-1):
   if self.stack[index].tag==tag: self.stack=self.stack[:index];break
 def handle_data(self,text): self.stack[-1].children.append(text)
 def by_id(self,id): return next((n for n in self.root.walk() if n.attrs.get('id')==id),None)

def clean(text): return re.sub(r'\s+',' ',html.unescape(text)).strip()
def plaintext(text): return clean(Document(text).root.text())
def decode(raw):
 # These pages declare ISO-8859-1; cp1252 also decodes the publisher's smart punctuation.
 return raw.decode('cp1252')

def month_records():
 records={}
 for page in json.loads((SOURCE/'months.json').read_text()):
  raw=(SOURCE/page['file']).read_bytes();text=decode(raw)
  expected_title=f'Calendar: {datetime(page["year"],page["month"],1):%B %Y}'
  if f'<title>{expected_title}</title>' not in text:raise ValueError(f'Unexpected calendar response: {page["file"]}')
  rows=ROW.findall(text)
  if len(rows)!=page['renderedEventRows']:raise ValueError(f'Incomplete month parsing: {page["file"]}')
  for stamp,id,category,anchor in rows:
   start=datetime.fromtimestamp(int(stamp),EASTERN)
   if not START<=start<END:continue
   title=plaintext(anchor)
   record=dict(sourceEventId=id,start=start.isoformat(),categoryId=category,rowText=title,sourcePage=page['file'])
   if id in records and records[id]!=record:raise ValueError('Conflicting repeated source event')
   records[id]=record
 return records

def times(date_text,start):
 dates=re.findall(r'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}, \d{4}',date_text)
 if not dates:raise ValueError(f'Unrecognized source date: {date_text}')
 first=datetime.strptime(dates[0],'%a, %b %d, %Y').date()
 if first!=start.date():raise ValueError(f'Detail/month dates disagree: {date_text}')
 clocks=re.findall(r'\b\d{1,2}:\d{2}[ap]m\b',date_text,re.I)
 all_day=not clocks
 if all_day:
  if start.hour or start.minute:raise ValueError('All-day row is not midnight')
  last=datetime.strptime(dates[-1],'%a, %b %d, %Y').date()
  return datetime.combine(last+timedelta(days=1),datetime.min.time(),EASTERN),True,False
 source_start=datetime.strptime(clocks[0].lower(),'%I:%M%p').time()
 if (start.hour,start.minute)!=(source_start.hour,source_start.minute):raise ValueError(f'Detail/month times disagree: {date_text}')
 if len(clocks)==1:return start,False,True
 if len(clocks)!=2:raise ValueError('Review source with more than two times')
 end_clock=datetime.strptime(clocks[1].lower(),'%I:%M%p').time()
 end_day=datetime.strptime(dates[-1],'%a, %b %d, %Y').date()
 end=datetime.combine(end_day,end_clock,EASTERN)
 if end<=start:end+=timedelta(days=1)
 return end,False,False

def details(id):
 doc=Document(decode(gzip.decompress((SOURCE/'events'/f'{id}.html.gz').read_bytes())))
 title=doc.by_id('event_title');date=doc.by_id('event_date');content=doc.by_id('event_details');category=doc.by_id('cw_category_span')
 if not all((title,date,content,category)):raise ValueError(f'Missing public details: {id}')
 location=next((n for n in content.walk() if n.tag=='a' and n.attrs.get('href')=='#location0'),None)
 description=next((n for n in content.walk() if n.tag=='div' and 'word-wrap' in n.attrs.get('style','')),None)
 return dict(title=clean(title.text()),dateText=clean(date.text()),location=clean(location.text()) if location else '',description=clean(description.text()) if description else '',categories=clean(category.text()),fullText=clean(content.text()))

def build():
 records=month_records()
 downloads=json.loads((SOURCE/'details.json').read_text())
 if any('error' in row for row in downloads):raise ValueError('Resolve failed event downloads before importing')
 if set(records)!={row['id'] for row in downloads}:raise ValueError('Detail download coverage disagrees with month pages')
 branches=json.loads((ROOT/'public/data/libraries.geojson').read_text())['features']
 aliases={'East Wilkinson County Library':'East Wilkinson County Public Library','Mary Vinson Memorial Library':'Mary Vinson Memorial'}
 reviewed=json.loads((SOURCE/'location-overrides.json').read_text()) if (SOURCE/'location-overrides.json').exists() else {}
 output=[];review=[]
 for id,row in records.items():
  info=details(id);start=datetime.fromisoformat(row['start']);end,all_day,unknown_end=times(info['dateText'],start)
  if row['categoryId'] not in CATEGORIES:raise ValueError('Review new publisher category')
  category_names=[entry[0] for entry in CATEGORIES.values() if re.search(r'(?<!\w)'+re.escape(entry[0])+r'(?!\w)',info['categories'])]
  if not category_names:category_names=[CATEGORIES[row['categoryId']][0]]
  calendar_ids=['mgrls-'+entry[1] for entry in CATEGORIES.values() if entry[0] in category_names]
  location=info['location']
  branch=next((b for b in branches if b['properties']['name']==aliases.get(location,location)),None)
  offsite=bool(re.search(r'\b(?:at|@)\s+(?:Sweet|Washington Park|Rose Hill|Smiley|John Wesley)|\b(?:off[ -]site|meet (?:us )?at)\b',info['title']+' '+info['description'],re.I))
  virtual=bool(re.search(r'\b(?:via zoom|on zoom|virtual event|virtual meeting|join us online|online program)\b',info['title']+' '+info['description'],re.I))
  if location=='Library Without Walls':offsite=True
  override=reviewed.get(id,{})
  offsite=offsite or override.get('offsite',False)
  if offsite or virtual:branch=None
  words=info['description'].split();budget=max(0,min(18,25-len(info['title'].split())))
  excerpt=' '.join(words[:budget]) + ('…' if len(words)>budget else '') if budget else ''
  description=excerpt or 'A Middle Georgia Regional Library program. See the source listing for program details and attendance requirements.'
  note='Saved from the public MGRLS CalendarWiz calendar on October 15, 2026. Confirm registration, age requirements and any changes in the source listing.'
  if virtual:note+=' Online program; no physical map marker is shown.'
  elif offsite:note+=' Off-site or mobile-library program; confirm the actual meeting location in the source listing.'
  elif not branch:note+=' The published location could not be matched to a fixed branch; no map marker is shown.'
  if unknown_end:note+=' The source does not publish an end time.'
  item=dict(id=f'mgrls-{id}',title=info['title'],start=start.isoformat(),end=end.isoformat(),allDay=all_day,category='Children' if CATEGORIES[row['categoryId']][0]=='Childrens' else CATEGORIES[row['categoryId']][0],location=override.get('location',location or 'Location not provided'),address=override.get('address',branch['properties']['fulladd'] if branch else location or 'See source for location'),description=description,note=note,sample=False,sourceUrl=f'https://www.calendarwiz.com/calendars/popup.php?op=view&id={id}&crd=mgrl',sourceLabel='View library event details',sourceChecked='2026-10-15',sourceGroup='mgrls',sourceEventId=id,sourceCalendar='mgrl',organizationId='mgrls',calendarIds=calendar_ids,organizer='Middle Georgia Regional Library System',isVirtual=virtual,sourceCategories=category_names,sourceLocation=location)
  if unknown_end:item['endTimeUnknown']=True
  if branch:
   item['coordinates']=branch['geometry']['coordinates'];item['venueId']=branch['properties']['id'];item['libraryBranchId']=branch['properties']['id']
  if override.get('coordinates') and not virtual:item['coordinates']=override['coordinates'];item['venueId']=override['venueId']
  if not branch:review.append(dict(sourceEventId=id,title=info['title'],location=location,offsite=offsite,isVirtual=virtual,mapped='coordinates' in item))
  output.append(item)
 output.sort(key=lambda e:(e['start'],e['id']))
 if len({e['id'] for e in output})!=len(output):raise ValueError('Duplicate MGRLS event IDs')
 (ROOT/'src/data/mgrls-events.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
 (SOURCE/'location-review.json').write_text(json.dumps(review,indent=2,ensure_ascii=False)+'\n')
 manifest=dict(captured='2026-10-15',sourceUrl='https://www.calendarwiz.com/calendars/week.php?crd=mgrl',windowStart=START.isoformat(),windowEndExclusive=END.isoformat(),method='13 saved monthly pages plus a compressed original detail page for every imported occurrence. The RSS feed was capped at 200 and was not used as the complete import.',events=len(output),firstStart=output[0]['start'],lastStart=output[-1]['start'],mappedEvents=sum('coordinates' in e for e in output),mappedVenues=len({tuple(e['coordinates']) for e in output if 'coordinates' in e}),allDayEvents=sum(e['allDay'] for e in output),endTimeUnknown=sum(e.get('endTimeUnknown',False) for e in output),categories=dict(Counter(e['category'] for e in output)),coordinateSource='Existing verified MGRLS branch GeoJSON, plus explicitly reviewed off-site locations; mobile/unknown locations are not guessed.',descriptionPolicy='Short attributed excerpts; complete original descriptions remain in the saved detail pages and linked source listings.')
 (SOURCE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps(manifest,indent=2))

if __name__=='__main__':build()
