import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.env.TEST_BASE_URL || 'http://localhost:4324';
const records = JSON.parse(await readFile(new URL('../src/data/bcsd-events.json', import.meta.url)));
const event = title => records.find(e => e.title === title);
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH}: {})});
const errors = [];
try {
  await mkdir('/tmp/bcsd-calendar-review', {recursive:true});
  for (const [name,width,height] of [['desktop',1440,1000], ['mobile',390,844]]) {
    const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    page.on('pageerror', e=>errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-15T16:00:00Z'));
    await page.goto(`${base}/calendar/?organization=bcsd`);
    await expect(page.locator('#month-title')).toHaveText('October 2026');
    await expect(page.locator('#event-count')).toHaveText('6 events');
    await page.getByRole('button', {name:'Thursday, October 15, 2026, 4 events',exact:true}).click();
    await expect(page.locator('.calendar-event:visible')).toHaveCount(4);
    await expect(page.locator(`#event-${event('Fall Break').id}`)).toBeVisible();
    await page.getByRole('button',{name:'Show whole month'}).click();
    await page.locator('input[value="bcsd-academic"]').uncheck();
    // Shared academic/feed entries still appear once via district membership.
    await expect(page.locator('#event-count')).toHaveText('6 events');
    await page.locator('input[value="bcsd-district"]').uncheck();
    await expect(page.locator('#event-count')).toHaveText('0 events');
    await page.locator('input[value="bcsd-academic"]').check();
    await expect(page.locator('#event-count')).toHaveText('1 event');
    await expect(page.getByRole('button',{name:'Friday, October 16, 2026, 1 event',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Saturday, October 17, 2026, 0 events',exact:true})).toBeVisible();
    await page.goto(`${base}/calendar/?organization=bcsd&calendars=bcsd-academic&event=${event('Holiday Break').id}`);
    await expect(page.locator('#month-title')).toHaveText('December 2026');
    await page.getByRole('button',{name:'Next month'}).click();
    await expect(page.locator('#month-title')).toHaveText('January 2027');
    await page.getByRole('button',{name:'Friday, January 1, 2027, 1 event',exact:true}).click();
    await expect(page.locator(`#event-${event('Holiday Break').id}`)).toBeVisible();
    await page.getByRole('button',{name:'Saturday, January 2, 2027, 0 events',exact:true}).click();
    await expect(page.locator('.calendar-event:visible')).toHaveCount(0);
    const halfDay = records.find(e=>e.title.startsWith('Last Day of School'));
    await page.goto(`${base}/calendar/?organization=bcsd&event=${halfDay.id}`);
    await expect(page.locator(`#event-${halfDay.id}`)).toContainText('Half-Day for Students');
    await page.locator(`#event-${halfDay.id} summary`).click();
    await expect(page.locator(`#event-${halfDay.id} a`).filter({hasText:'View BCSD 2026–27 academic calendar'})).toHaveAttribute('href',/\.pdf$/);
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`/tmp/bcsd-calendar-review/${name}.png`,fullPage:true});
    const ics = await (await page.request.get(`${base}/events/${event('Holiday Break').id}.ics`)).text();
    expect(ics).toContain('DTSTART;VALUE=DATE:20261221');
    expect(ics).toContain('DTEND;VALUE=DATE:20270102');
    console.log(`${name}: BCSD filters, deduplication, daily break coverage, cross-year boundary, half-day details, source link and ICS passed`);
    await page.close();
  }
  expect(errors).toEqual([]);
} finally { await browser.close(); }
