import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.env.TEST_BASE_URL || 'http://localhost:4330';
const catalog = JSON.parse(await readFile(new URL('../src/data/election-districts.json', import.meta.url)));
const browser = await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
const errors=[];
try {
 await mkdir('/tmp/civicpulse-election-review',{recursive:true});
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
  const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/maps/?map=us-house');
  for(const [mapId,layerId] of [['us-house','us-house-districts'],['state-house','state-house-districts'],['state-senate','state-senate-districts'],['psc','psc-districts'],['statewide','georgia-statewide']]) {
   if(mapId!=='us-house')await page.locator('#map-choice').selectOption(mapId);
   const meta=catalog.datasets.find(d=>d.id===layerId);
   await expect(page.locator('#map-status')).toHaveText('1 layer visible · State & federal districts',{timeout:20000});
   await expect(page.locator('.place-row')).toHaveCount(meta.featureCount);
   await expect(page.locator('#election-map-note')).toBeVisible();
   await expect(page.locator('#map path.leaflet-interactive')).toHaveCount(meta.featureCount);
   if(meta.featureCount>1)expect(await page.locator('#map path.leaflet-interactive').evaluateAll(paths=>new Set(paths.map(p=>p.getAttribute('fill'))).size)).toBeGreaterThan(1);
   const raw=await (await page.request.get(base+meta.data)).json();
   expect(raw.features.length).toBe(meta.featureCount);
   await page.getByRole('searchbox',{name:'Search places, precincts or addresses'}).fill('Bibb');
   const bibbCount=raw.features.filter(f=>f.properties.includesBibb).length;
   await expect(page.locator('.place-row')).toHaveCount(bibbCount);
   await page.locator('.place-row button').first().click();
   await expect(page.locator('.leaflet-popup')).toContainText('Bibb County');
   await expect(page.locator('.leaflet-popup a[href="https://mvp.sos.ga.gov/s/"]')).toHaveCount(1);
   if(mapId==='psc') {
    await expect(page.locator('.leaflet-popup')).toContainText('voters statewide elect');
    await expect(page.locator('.leaflet-popup')).toContainText('Derived by dissolving');
   } else if(mapId==='statewide')await expect(page.locator('.leaflet-popup')).toContainText('no separate U.S. Senate districts');
   else await expect(page.locator('.leaflet-popup')).toContainText('January 1, 2026');
   await page.getByRole('searchbox',{name:'Search places, precincts or addresses'}).fill('');
   await page.locator(`.layer-control input[value="${layerId}"]`).uncheck();
   await expect(page.locator('.place-row')).toHaveCount(0);
   await expect(page.locator('#election-map-note')).toBeHidden();
   await page.locator(`.layer-control input[value="${layerId}"]`).check();
   await expect(page.locator('.place-row')).toHaveCount(meta.featureCount);
   if(mapId==='us-house') {
    await page.getByLabel('Show street basemap').uncheck();
    await page.getByRole('button',{name:'Fit map to visible layers'}).click();
    await page.locator('.map-workspace').screenshot({path:`/tmp/civicpulse-election-review/${device}.png`});
   }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.goto(base+'/data/#election-district-sources');
  for(const title of ['U.S. House districts','Georgia House districts','Georgia Senate districts','PSC residency districts','Georgia statewide electorate']) {
   const link=page.getByRole('link',{name:`Download ${title} GeoJSON`,exact:true});
   await expect(link).toHaveCount(1);expect((await page.request.get(new URL(await link.getAttribute('href'),base).href)).status()).toBe(200);
  }
  console.log(`${device}: five district presets, official GeoJSON counts, distinct polygon colors, Bibb search, popup sources, PSC statewide election note, layer toggles and downloads passed`);
  await page.close();
 }
 expect(errors).toEqual([]);
} finally {await browser.close();}
