import { chromium, expect } from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL || 'http://localhost:4321';const out=process.env.TEST_SCREENSHOTS || '/tmp/civicpulse-library-qa';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {})});
try{
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/maps/?map=libraries');await expect(p.getByLabel('Choose a map')).toHaveValue('libraries');
  await expect(p.locator('.place-row')).toHaveCount(18);await expect(p.locator('#map img.library-marker')).toHaveCount(18);
  await expect.poll(()=>p.locator('#map img.library-marker').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBeTruthy();
  expect(await p.locator('#map img.library-marker').evaluateAll(imgs=>new Set(imgs.map(img=>img.src)).size)).toBe(7);
  await p.locator('#library-marker-key summary').click();await expect(p.locator('#library-marker-key img')).toHaveCount(7);await p.locator('#library-marker-key summary').click();
  await p.locator('.map-workspace').screenshot({path:out+'/'+name+'.png'});
  await p.getByRole('searchbox',{name:'Search places, precincts or addresses'}).fill('Baldwin County');await expect(p.locator('.place-row')).toHaveCount(3);
  await p.getByRole('searchbox',{name:'Search places, precincts or addresses'}).fill('Washington Memorial');await expect(p.locator('.place-row')).toHaveCount(1);await p.locator('.place-row button').click();
  await expect(p.locator('.leaflet-popup')).toContainText('1180 Washington Avenue');await expect(p.locator('.leaflet-popup')).toContainText('Open Access only');await expect(p.locator('.leaflet-popup')).toContainText('Genealogical & Historical Room');
  await expect(p.locator('.leaflet-popup a[href="tel:4783006744"]')).toBeVisible();await expect(p.locator('.leaflet-popup a[href="https://bibblib.org/directory_page_T49_R2.php"]')).toBeVisible();
  await p.getByRole('searchbox',{name:'Search places, precincts or addresses'}).fill('Book Locker');await p.locator('.place-row button').click();await expect(p.locator('.leaflet-popup')).toContainText('Self-service book locker');
  await p.getByLabel('Polling places',{exact:false}).check();await p.getByRole('searchbox',{name:'Search places, precincts or addresses'}).fill('');await expect(p.locator('.place-row')).toHaveCount(52);await p.reload();await expect(p.locator('.place-row')).toHaveCount(52);
  expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);await p.close();console.log(name+': library preset, 18 pins / 7 county colors, county search, hours / phone / source links, book locker, layer combinations and reload persistence passed');
 }
 const p=await b.newPage();await p.route('**/data/libraries.geojson',route=>route.abort());await p.goto(base+'/maps/?map=libraries');await expect(p.locator('#map-error')).toContainText('MGRLS libraries');await expect(p.locator('.layer-control input[value=libraries]')).toBeDisabled();await p.getByLabel('Choose a map').selectOption('voting');await expect(p.locator('.place-row')).toHaveCount(65);console.log('Unavailable library layer: clear error, voting preset remains usable.');
}finally{await b.close();}
