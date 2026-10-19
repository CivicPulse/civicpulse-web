// CMS-backed resident outage E2E. Serves only the static artifact; all external
// requests are aborted. No API or provider response is used at runtime.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.TEST_BASE_URL;
if (!base) throw new Error('TEST_BASE_URL is required');
const out = process.env.TEST_SCREENSHOTS || '.impeccable/v1-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}) });
const errors = [];
const external = [];
try {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base); await expect(page).toHaveTitle(/Our community/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A closer look at our community.');
  await page.goto(`${base}/maps/`);
  await expect(page.locator('#map-status')).toHaveText('2 layers visible · Published snapshot');
  await expect(page.locator('.place-row').first()).toBeVisible();
  await expect(page.locator('#map path.leaflet-interactive').first()).toBeVisible();
  await page.screenshot({ path: `${out}/maps.png`, fullPage: true });
  await page.goto(`${base}/calendar/`);
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.locator('.calendar-event').count()).toBeGreaterThan(0);
  await page.goto(`${base}/data/`);
  await expect(page.locator('main h1')).toBeVisible();
  await page.goto(`${base}/admin/`);
  await expect(page.locator('#config-notice')).toBeHidden();
  await expect(page.locator('#login-panel')).toBeVisible();
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('CMS setup needed');
  const ics = await (await fetch(`${base}/events.ics`)).text();
  expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBeGreaterThan(800);
  const layer = await (await fetch(`${base}/data/cms/polling-places.geojson`)).json();
  expect(layer.type).toBe('FeatureCollection');
  expect(layer.features.length).toBe(34);
  const markerResponse = await fetch(`${base}/data/cms-snapshot.json`);
  expect(markerResponse.ok).toBeTruthy();
  const marker = await markerResponse.json();
  expect(marker?.format).toBe('civicpulse-v1-direct-capture');
  expect(errors).toEqual([]);
  console.log(`CMS resident outage E2E PASS: static pages/maps/calendar/data/admin/ICS/layer; external requests aborted (${external.length}); no page errors.`);
  await context.close();
} finally { await browser.close(); }
