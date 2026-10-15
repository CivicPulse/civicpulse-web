import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://localhost:4321';
const out=process.env.TEST_SCREENSHOTS || '/tmp/civicpulse-dsa-qa'; await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {})});
try {
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
  const page=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/maps/?map=events');
  const markers=page.locator('#map img.dsa-event-marker');await expect(markers).toHaveCount(6);
  await expect.poll(()=>markers.evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width===40))).toBeTruthy();
  const svgs=await markers.evaluateAll(imgs=>imgs.map(img=>decodeURIComponent(img.src.split(',')[1])));
  expect(svgs.every(svg=>svg.includes('--marker-border:#000000')&&svg.includes('DSA event marker'))).toBeTruthy();
  expect(new Set(svgs).size).toBeGreaterThan(1);
  expect(svgs.some(svg=>svg.includes('fill="#287556"')||svg.includes('--marker-fill:#287556'))).toBeTruthy();
  await expect(page.locator('#event-marker-key')).toBeVisible();
  await page.locator('.map-workspace').screenshot({path:out+'/'+name+'.png'});
  await page.locator('.place-row').filter({has:page.locator('img[src^="data:image/svg+xml"]')}).first().getByRole('button').click();await expect(page.locator('.leaflet-popup .popup-event-marker').first()).toBeVisible();
  await page.locator('.leaflet-popup a[href*="/calendar/?event="]').first().click();
  await expect(page.locator('.calendar-event:visible details[open]')).toHaveCount(1);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.close();console.log(name+': six DSA pins, calendar color variants, black outlines, logo rendering, popup links and responsive layout passed');
 }
 const page=await b.newPage();
 await page.route('**/data/calendar-events.geojson',async route=>{const response=await route.fetch();const data=await response.json();for(const event of data.features[0].properties.events)event.mapMarker={fill:'#123456',border:'#ff00ff'};await route.fulfill({response,json:data});});
 await page.goto(base+'/maps/?map=events');
 await expect.poll(()=>page.locator('#map img.dsa-event-marker').evaluateAll(imgs=>imgs.some(img=>decodeURIComponent(img.src).includes('--marker-fill:#123456')&&decodeURIComponent(img.src).includes('--marker-border:#ff00ff')))).toBeTruthy();
 console.log('Per-record fill and outline overrides passed.');
}finally{await b.close();}
