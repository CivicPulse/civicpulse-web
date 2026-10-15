# CivicPulse web

Astro static community maps and events website for Macon–Bibb.

## Election map data

Static GeoJSON sources are in `public/data/`, ready to serve at these URLs:

| Source | URL | Features | Geometry |
| --- | --- | ---: | --- |
| Polling places | `/data/polling_places.geojson` | 34 | Point |
| Voting precincts | `/data/voting_precincts.geojson` | 31 | MultiPolygon |

`/data/map-sources.json` catalogs both sources, including counts, provenance, and join fields. Each file uses WGS 84 longitude/latitude (EPSG:4326); precinct surfaces were exported as GeoJSON MultiPolygons. Properties retain their original source names and values.

The files are snapshots exported from Thor's PostGIS `gis` database (`public.polling_places` and `public.voting_precincts`) on October 15, 2026. They do not refresh automatically. Original data is from Macon-Bibb County GIS.

Match ordinary polling places to precincts using `properties.pollingid`. Three polling places have `pollingid: "EarlyVote"`; these serve multiple precincts and have no single precinct match. Source status and election-date fields are preserved; consumers should apply their intended eligibility/date filters explicitly.

For a Leaflet map, load either source as a GeoJSON layer:

```js
const response = await fetch("/data/voting_precincts.geojson");
if (!response.ok) throw new Error("Could not load precinct data");
L.geoJSON(await response.json()).addTo(map);
```

The Astro map explorer uses these canonical sources directly. Dataset structure is validated before development and production builds.

## Run locally

Use Node.js 22.12+ (or a newer version supported by Astro) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:4321. Run `npm run build` for TypeScript/Astro checks and static output in `dist/`. Run `npm run preview` to serve that build.

## Features

- Home page with equal map and calendar destinations, based on the approved noticeboard concept.
- Four configurable map presets and eight independently controlled GeoJSON layers, using Leaflet.
- Searchable feature directory, keyboard controls, feature popups, layer-aware fit-to-bounds, and optional OpenStreetMap street tiles.
- Month/agenda calendar, day selection, event/category search, native expandable event details, and static `.ics` downloads.
- Mobile layouts, self-hosted fonts, reduced-motion support, skip link, sample-data notices, source downloads, and custom 404.
- No server adapter, database, credentials or runtime application backend required.

## Sample content

**All event listings are fictional.** The community sample layers have approximate marker positions and illustrative polygons and trails. Voting layers preserve the uploaded data. They are not authoritative boundaries, routes or services. The home map image is an AI-generated illustration. Site copy does not claim official affiliation. The default voting view uses the uploaded GeoJSON files; sample community layers remain available separately.

Sample events are dated October–December 2026. The calendar opens to the visitor’s current month in America/New_York; a direct event link opens that event’s month. Later visitors can navigate back to the sample months. Do not use these files for actual event planning or navigation.

## Update maps

1. Put WGS84 GeoJSON FeatureCollections in `public/data/`, with coordinate order `[longitude, latitude]`. Polygon rings must close.
2. Configure layers in `src/data/maps.ts`: `id` maps to `/data/<id>.geojson` for sample layers; `layerUrl()` keeps the underscore filenames for voting exports. Set name, color, description and geometry kind. Point, line and polygon layers are supported.
3. Configure map presets in the same file; each preset lists its default layer IDs.
4. Use `properties.name` and `properties.description` for readable popup and directory content. Optional `properties.id` supports event-location links. Values are inserted as text, not HTML.
5. Replace source documentation in `/data/` and review sample notices when publishing verified content.

`scripts/create-sample-data.py` regenerates the illustrative files. It overwrites the sample GeoJSON paths: do not run it over production data. Python is not required to build the website.

## Update events

Edit `src/data/events.json`. Each record needs a unique `id`, `title`, ISO `start` and `end` with the correct UTC offset, `category`, `location`, `address`, `description`, `note`, and `[longitude, latitude]` `coordinates`.

Use the correct daylight-saving offset for each date. The frontend formats in America/New_York and `.ics` output uses UTC. Single-event files and the full calendar are generated at build time. When publishing verified events, update the explicit sample wording in `src/lib/events.ts`, the calendar page, event component, source page, and footer together. Set a real `PRODID` and UID domain in `src/lib/events.ts`.

The homepage’s three featured event IDs are set in `src/pages/index.astro`; replace them along with the events. Event markers are a separate GeoJSON layer; keep `properties.id` aligned with event IDs.

## Cloudflare Pages

Create a Pages project connected to this repository, with:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 22.12+; `.nvmrc` selects Node 22 |

No Cloudflare adapter is needed for this static output. No secrets are required. `public/_headers` supplies basic response headers and immutable caching for fingerprinted Astro assets. `404.html` is generated for Pages’ not-found handling. The site is prepared locally; it has not been deployed.

Reference: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/ and https://developers.cloudflare.com/pages/configuration/build-configuration/.

For direct upload, build locally and upload the contents of `dist/` through Cloudflare Pages Direct Upload. The map basemap makes browser requests to `tile.openstreetmap.org`; configure a suitable tile provider if traffic requirements change, and follow https://operations.osmfoundation.org/policies/tiles/.

## Assets & design

Fonts: self-hosted Unna and DM Sans via Fontsource (SIL Open Font License). Leaflet and OpenStreetMap attribution remains visible. The generated preview asset is `public/images/map-preview.webp`; its generation prompt is stored in `.impeccable/map-prompt.txt` and embedded into the source asset. It is explicitly illustrative.

Product requirements, visual tokens, approved comp and direction record live in `PRODUCT.md`, `DESIGN.md`, and `.impeccable/`.

## Verification

`npm run build` runs the Astro/TypeScript diagnostics and static build. With a local server running, use `npm run test:e2e` for desktop/mobile browser smoke checks. Set `TEST_BASE_URL` to another preview URL and `CHROME_EXECUTABLE_PATH` to an installed Chrome binary if needed. Playwright otherwise uses its installed Chromium. Checks include map presets/layers/search/popups, calendar filters and deep links, partial layer failure, no-JavaScript event details, and ICS formatting. Screenshot evidence is written to the gitignored `.impeccable/review/`.

## Uploaded voting data

The default voting preset uses `public/data/polling_places.geojson` (34 points) and `public/data/voting_precincts.geojson` (31 MultiPolygons). `scripts/validate-voting-data.mjs` checks expected geometry, identifiers, and longitude/latitude ranges before `npm run dev` and `npm run build`. Replace these canonical public files to update the voting layers, and keep `map-sources.json` provenance current. The sample generator does not overwrite voting datasets.

All supplied records remain available, including 17 Active, 11 Historical, and 6 without activity status. Record activity remains in the directory and popups; marker colors follow the QGIS precinct categories. Popup hours and accessibility values are explicitly labeled as values from the dataset. Precinct popups link to associated polling records using `pollingid`; polling popups link back to their precinct. Search supports names, precinct IDs, addresses and activity values. This integration does not assert current election eligibility or assign a voter to a polling place.

## QGIS symbology

Voting layers use the saved visible `polling_places` and `voting_precincts` renderers in `polling_locations.qgz` in the companion GIS project, exported to `src/data/qgis-style.json`. Polling pins reuse `styles/polling-place.svg` with each category’s fill and outline; early-voting records use the QGIS gold category. Precinct fills preserve category colors, opacity and outlines. Directory markers use those same colors/icons. After saving QGIS style changes, run `python scripts/sync-qgis-style.py /path/to/polling_locations.qgz`, then rebuild. This does not modify the QGIS project or the GeoJSON.
