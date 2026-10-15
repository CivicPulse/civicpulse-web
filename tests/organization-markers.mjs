import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://localhost:4321';
const out=process.env.TEST_SCREENSHOTS || '/tmp/civicpulse-organization-markers-qa';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {})});
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/maps/?map=events');
  const data=await (await p.request.get(base+'/data/calendar-events.geojson')).json();
  const orgs=[...new Set(data.features.map(f=>f.properties.organizationId))];
  for(const org of orgs)await expect(p.locator('#map img.org-'+org)).toHaveCount(data.features.filter(f=>f.properties.organizationId===org).length);
  await expect.poll(()=>p.locator('#map img.organization-event-marker').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width===40))).toBeTruthy();
  const svg=await p.locator('#map img.organization-event-marker').evaluateAll(imgs=>imgs.map(img=>decodeURIComponent(img.src.split(',')[1])));
  expect(svg.every(s=>s.includes('--marker-border:#000000'))).toBeTruthy();expect(new Set(svg).size).toBeGreaterThan(4);
  await p.locator('#event-marker-key summary').click();for(const org of orgs)await expect(p.locator('#event-marker-key img[src*="'+(org==='mgdsa'?'dsa/marker.svg':org+'/marker.svg')+'"]').first()).toBeVisible();
  await p.locator('#event-marker-key summary').click();await p.locator('.map-workspace').screenshot({path:out+'/'+name+'.png'});
  const row=p.locator('.place-row').filter({hasText:'Macon-Bibb Dems'}).first();await row.getByRole('button').click();await expect(p.locator('.leaflet-popup img.popup-event-marker').first()).toBeVisible();
  expect(errors).toEqual([]);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await p.close();
  console.log(name+': all '+orgs.length+' organizations use logo/initial pins with black outlines, matched legend and popup icons, no overflow or runtime errors');
 }
 const p=await b.newPage();await p.route('**/data/calendar-events.geojson',async route=>{const response=await route.fetch();const data=await response.json();for(const feature of data.features.filter(f=>f.properties.organizationId==='macon-bibb-dems'))for(const event of feature.properties.events)event.mapMarker={fill:'#123456',border:'#ff00ff'};await route.fulfill({response,json:data});});
 await p.goto(base+'/maps/?map=events');await expect.poll(()=>p.locator('#map img.org-macon-bibb-dems').evaluateAll(imgs=>imgs.length>0&&imgs.every(img=>decodeURIComponent(img.src).includes('--marker-fill:#123456')&&decodeURIComponent(img.src).includes('--marker-border:#ff00ff')))).toBeTruthy();console.log('Non-DSA per-record fill and outline overrides passed');
 const gallery=await b.newPage({viewport:{width:700,height:240}});await gallery.setContent(`<body style="margin:0;background:#f6f1e7;display:flex;justify-content:space-evenly;padding:24px;font:14px Arial;color:#173e34">${['mgdsa','macon-bibb-dems','dpg26','houston-county-dems','jasper-county-dems'].map(id=>`<figure style="margin:0;text-align:center"><img width="80" height="98" src="${base}${id==='mgdsa'?'/icons/dsa/marker.svg':'/icons/organizations/'+id+'/marker.svg'}"><figcaption style="margin-top:12px;max-width:105px">${id}</figcaption></figure>`).join('')}</body>`);await gallery.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await gallery.screenshot({path:out+'/marker-gallery.png'});
}finally{await b.close();}
