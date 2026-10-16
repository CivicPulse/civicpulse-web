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
- Voting, commissioner, event and MGRLS library map presets with independently controlled GeoJSON layers, using Leaflet.
- Searchable feature directory, keyboard controls, feature popups, layer-aware fit-to-bounds, and optional OpenStreetMap street tiles.
- Month/agenda calendar, day selection, event/category search, native expandable event details, and static `.ics` downloads.
- Mobile layouts, self-hosted fonts, reduced-motion support, skip link, source notices, source downloads, and custom 404.
- No server adapter, database, credentials or runtime application backend required.

## Sourced content

119 dated shifts from 25 nearby listings in the supplied Democratic Party of Georgia 26 feed on Mobilize were captured October 15, 2026. Imported entries include signup links and capture dates; this is a manual snapshot. The calendar contains only sourced events; fictional demonstration records and their calendar have been removed. Voting layers preserve the uploaded data. They are not authoritative boundaries, routes or services. The home map preview is rendered from the voting GeoJSON. Site copy does not claim official affiliation. The default voting view uses the uploaded GeoJSON files.

The calendar opens to the visitor’s current month in America/New_York; a direct event link opens that event’s month. Confirm imported event arrangements through the linked organizer page.

## Update voting maps

Replace the two canonical GeoJSON files listed above with WGS84 FeatureCollections, keeping their supplied field names and polling/precinct identifiers. `scripts/validate-voting-data.mjs` checks them before each build. The homepage preview renders those same files at build time, and the interactive map fetches them directly. Update `map-sources.json` when provenance changes. QGIS colors and ballot icons are maintained through the symbology workflow below.

## Update events

Edit `src/data/events.json`. Each record needs a unique `id`, `title`, ISO `start` and `end` with the correct UTC offset, `category`, `location`, `address`, `description`, `note`, and a `sample` boolean set to `false`. The build rejects events marked as samples. Sourced records also include `sourceUrl`, `sourceChecked`, and `organizer`. Coordinates are optional; only include verified `[longitude, latitude]` coordinates.

Use the correct daylight-saving offset for each date. The frontend formats in America/New_York and `.ics` output uses UTC. Single-event files and the full calendar are generated at build time. Calendar exports contain only the sourced events. Keep source links and capture dates current when refreshing events.

The homepage features the first three upcoming sourced occurrences in chronological order. Imported IDs combine the Mobilize event ID and occurrence date. Events with verified coordinates also appear on the calendar event map.

## Cloudflare Pages

Production is hosted at https://www.civpulse.org/ in the `civicpulse-web` Pages project (Kerry Personal account). The Pages fallback URL is https://civicpulse-web.pages.dev/. Deployment uses Direct Upload; Git pushes do not automatically publish changes.

After authenticating Wrangler with `npx wrangler login`, publish the current working tree with:

```sh
npm run deploy
```

This validates and builds the site, then uploads `dist/` to the production `main` branch. `wrangler.jsonc` identifies the account and Pages project. Deployment credentials stay outside the repository. Cloudflare redirect rules send the apex to HTTPS www while preserving paths and queries. The six retired demonstration-event `.ics` URLs redirect to `/calendar/`, preventing stale Pages asset caches from exposing obsolete sample downloads. The custom domain has a proxied CNAME pointing to `civicpulse-web.pages.dev`.

Build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 22.12+; `.nvmrc` selects Node 22 |

No Cloudflare adapter is needed for this static output. No runtime secrets are required. `public/_headers` supplies basic response headers and immutable caching for fingerprinted Astro assets. `404.html` is generated for Pages’ not-found handling.

Reference: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/ and https://developers.cloudflare.com/pages/configuration/build-configuration/.

For direct upload, build locally and upload the contents of `dist/` through Cloudflare Pages Direct Upload. The map basemap makes browser requests to `tile.openstreetmap.org`; configure a suitable tile provider if traffic requirements change, and follow https://operations.osmfoundation.org/policies/tiles/.

## Printable voting-map downloads (R2)

The **Polling places & precincts** map at `/maps/?map=voting` includes two download buttons. They are shown for the voting preset, including when JavaScript is disabled. The full-resolution PDFs are hosted separately from the website in Cloudflare R2; do not put these large files in `public/` or `dist/`. Cloudflare Pages has a 25 MiB per-asset limit.

| Setting | Value |
| --- | --- |
| Cloudflare account | Kerry Personal (`6d837580a4d0641139ecada9e74076b8`) |
| R2 bucket | `civpulse-files` |
| Public custom domain | https://files.civpulse.org |
| Cloudflare zone | `civpulse.org` (`f94e4b3b22ccced560feebb9c7829a86`) |
| Storage | Standard, Eastern North America (`ENAM`) |
| Public access | Custom domain enabled with minimum TLS 1.2; private write access |
| UI | `src/pages/maps.astro`; voting-preset visibility in `src/scripts/map.ts` |

| Edition | R2 object key (also the public URL path) | Pages | Size |
| --- | --- | --- | --- |
| Poster, 23 × 48 inches | `maps/Macon-Bibb_23x48_300dpi_Posters.pdf` | 32 | 261,971,122 bytes (262 MB) |
| US Letter, 8.5 × 11 inches | `maps/Macon-Bibb_Letter_300dpi_All_Maps.pdf` | 33 | 48,044,023 bytes (48 MB) |

Downloads: [poster PDF](https://files.civpulse.org/maps/Macon-Bibb_23x48_300dpi_Posters.pdf) and [letter PDF](https://files.civpulse.org/maps/Macon-Bibb_Letter_300dpi_All_Maps.pdf). Each object uses `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<PDF filename>"`, and `Cache-Control: public, max-age=3600`. The attachment header makes cross-origin links download the PDF, since browsers may ignore the HTML `download` attribute across origins. PDFs are fetched only when a visitor clicks a button. Print at actual size (100%); orientations vary by page.

### Updating the PDFs

1. Generate and review both print editions in the companion `/mnt/storage/projects/maconbibb-maps` project. Current source files are `output/pdf/Macon-Bibb_23x48_300dpi_Posters.pdf` and `output/letter/Macon-Bibb_Letter_300dpi_All_Maps.pdf`. That project's README documents QGIS export and verification. The website build does not generate or upload PDFs.
2. Upload to the **`civpulse-files`** bucket, preserving the object keys and HTTP metadata above. Use an authenticated R2 dashboard, S3 client, or Wrangler. Do not make upload credentials public or commit them. For example, with Wrangler already authenticated in this account:

   ```sh
   npx wrangler r2 object put civpulse-files/maps/Macon-Bibb_23x48_300dpi_Posters.pdf --remote --file=/mnt/storage/projects/maconbibb-maps/output/pdf/Macon-Bibb_23x48_300dpi_Posters.pdf --content-type=application/pdf --content-disposition='attachment; filename="Macon-Bibb_23x48_300dpi_Posters.pdf"' --cache-control='public, max-age=3600'
   npx wrangler r2 object put civpulse-files/maps/Macon-Bibb_Letter_300dpi_All_Maps.pdf --remote --file=/mnt/storage/projects/maconbibb-maps/output/letter/Macon-Bibb_Letter_300dpi_All_Maps.pdf --content-type=application/pdf --content-disposition='attachment; filename="Macon-Bibb_Letter_300dpi_All_Maps.pdf"' --cache-control='public, max-age=3600'
   ```

3. Verify public HTTP status, content length, PDF content type, attachment filename, and byte-range requests. Compare a complete downloaded file's SHA-256 with its source before announcing an updated edition.
4. Update the visible sizes/page counts in `src/pages/maps.astro` and this table when they change. If filenames change, update both button URLs. Build, check the voting preset at desktop/mobile widths, then deploy the site separately. PDF uploads do not deploy the website, and website deployments do not upload PDFs.
5. Replacing an existing key may leave a cached copy for up to one hour. Purge those two URLs from the `civpulse.org` zone when immediate replacement is required, or use versioned filenames and update the links.

The initial upload used a temporary authenticated multipart-transfer Worker because the connected Cloudflare API could manage R2 while the local CLI had no API token. That temporary Worker is removed after transfer; it is not a dependency of downloads or future deployments. Normal public downloads are served directly by R2's custom domain. Keep `r2.dev` access disabled; no CORS policy is required for ordinary download links.

Reference: [Cloudflare Pages asset limits](https://developers.cloudflare.com/pages/platform/limits/) and [R2 public custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## Assets & design


Product requirements, visual tokens, approved comp and direction record live in `PRODUCT.md`, `DESIGN.md`, and `.impeccable/`.

## Verification

`npm run build` runs the Astro/TypeScript diagnostics and static build. With a local server running, use `npm run test:e2e` for desktop/mobile browser smoke checks. Set `TEST_BASE_URL` to another preview URL and `CHROME_EXECUTABLE_PATH` to an installed Chrome binary if needed. Playwright otherwise uses its installed Chromium. Checks include map layers/search/popups, calendar filters and deep links, partial layer failure, no-JavaScript event details, and ICS formatting. Screenshot evidence is written to the gitignored `.impeccable/review/`.

## Uploaded voting data

Replace `public/data/polling_places.geojson` and `public/data/voting_precincts.geojson` to update the voting map. Builds validate their geometry and identifiers; keep `public/data/map-sources.json` provenance current.


All supplied records remain available, including 17 Active, 11 Historical, and 6 without activity status. Record activity remains in the directory and popups; marker colors follow the QGIS precinct categories. Popup hours and accessibility values are explicitly labeled as values from the dataset. Precinct popups link to associated polling records using `pollingid`; polling popups link back to their precinct. Search supports names, precinct IDs, addresses and activity values. This integration does not assert current election eligibility or assign a voter to a polling place.

## QGIS symbology

Voting layers use the saved visible `polling_places` and `voting_precincts` renderers in `polling_locations.qgz` in the companion GIS project, exported to `src/data/qgis-style.json`. Polling pins reuse `styles/polling-place.svg` with each category’s fill and outline; early-voting records use the QGIS gold category. Precinct fills preserve category colors, opacity and outlines. Directory markers use those same colors/icons. After saving QGIS style changes, run `python scripts/sync-qgis-style.py /path/to/polling_locations.qgz`, then rebuild. This does not modify the QGIS project or the GeoJSON.

## Mid GA DSA calendar import

Original public ICS downloads, the source page, feed status manifest, and US Census geocoding responses are preserved in `data/sources/mgdsa/`. Four of six embedded chapter feeds were accessible on October 15, 2026; two returned 404. The separate community calendar is excluded. The raw files preserve history, recurrence rules, exceptions, and all-day dates.

To regenerate offline, install `scripts/requirements-events.txt` in a Python environment and run `python scripts/import-mgdsa.py`. The manifest defines the bounded expansion window (January 1, 2026 through October 15, 2027). Generated output is `src/data/mgdsa-events.json` plus `public/data/event-locations.geojson`. Re-running replaces generated records without duplicating events or changing the Mobilize records. Builds use these saved files and make no calendar requests. Refresh the raw files and manifest deliberately before regenerating; no automatic polling is configured.

Event venue markers group occurrences by address and link back to calendar details. Coordinates are address interpolations from the US Census geocoder, with responses saved for review. Virtual and unspecified locations are not mapped. All-day exports use DATE values with exclusive end dates.

The map selector offers voting and community-event presets; visitors can combine all three layers. The event layer is generated at build time as `/data/calendar-events.geojson` from the same records used by the calendar, grouping sourced events with valid coordinates at their venues. Event titles and venue addresses are searchable, and calendar/map links open the matching event. The imported `public/data/event-locations.geojson` is retained as source output; the displayed layer uses the calendar-derived file.

## Organizations and calendars

`src/data/calendars.json` defines organizations and their calendars, including display colors and source Google Calendar IDs. Every event has an `organizationId` and a `calendarIds` array; calendar IDs must belong to the event's organization. Events may belong to several calendars and appear only once when any matching calendar is selected. Builds reject unknown or cross-organization memberships.

The DSA importer preserves source calendar membership and merges memberships when the same occurrence appears in several feeds. Saved Mobilize listings belong to Macon-Bibb Dems and its main events calendar plus a training, voter outreach, or committee calendar. These subcalendars are site groupings based on the saved event categories. Only organizations with sourced events appear in the calendar catalog.

Calendar visitors can combine organization, calendars, category, date and text search. Organization and selected calendars are combined with AND; selected calendars match with OR. Show all/Hide all act on the currently selected organization's calendars. Color by switches between organization and calendar; multiple membership labels remain visible. Calendar selections, organization and color mode are stored in the URL.

## Nearby Mobilize import

`data/sources/mobilize-bibb/` preserves public rendered event text, expanded available times, the first two search-result pages, neutral editorial summaries, venue coordinates and Census responses. `manifest.json` records the source, the requested 35-mile straight-line radius centered on Macon, and per-listing import counts. This covers the supplied Democratic Party of Georgia 26 feed, including locally hosted virtual events; it does not claim platform-wide coverage of all Mobilize organizations. Later reviewed suggestions were in towns outside the nearby area.

Run `python scripts/import-mobilize.py` to rebuild `src/data/mobilize-events.json` offline with Python 3.9+ and standard-library modules only. The saved snapshot contains 25 listings and 119 dated shifts, of which 29 have public street addresses at nine venues. Private signup-only addresses, virtual events and city-only locations remain calendar-only. Census coordinates are approximate street-address locations. Notes retain the organizer’s requirement to confirm sign-waving locations and the poll-watcher training deadline.

The importer validates time-zone offsets, weekday/date agreement and expanded recurring shifts. Each occurrence has a unique source-event/start-time identity, so multiple shifts on one day are preserved. Earlier manually imported dates retain their existing event IDs; the event library suppresses their old records when that listing is present in the newer snapshot. Distinct Mobilize event IDs are preserved even when titles and some shifts match. No credentials, registrations, or participant data are used; direct HTTP/API access was unavailable, so this snapshot comes from the public browser UI. No automatic refresh is configured.


## Commission district source

`public/data/commission_districts.geojson` contains all nine polygons and source attributes from the public CountyCommissioners2024 feature layer, exported October 15, 2026 as WGS84 GeoJSON. The map explorer registers this source as `commission-districts`, with a Find your commissioner preset, contact popups and name search.

Attribution: **Macon-Bibb County Government IT GIS**. The map credits the county while its GIS layers are visible, and the Data & sources page documents the district source. The source catalog preserves the original service and app URLs. This is a saved snapshot, with no automatic refresh.

## DSA map markers

`public/icons/dsa/marker.svg` combines the official white DSA rose-and-hands vector with a geographic pin. Provenance is recorded in `public/icons/dsa/SOURCE.md`; `logo-white.svg` preserves the converted original. The marker's `--marker-fill` and `--marker-border` variables are editable in the SVG, with a black outline by default.

Map rendering uses `src/lib/dsa-marker.ts` and `src/data/map-markers.json`. DSA calendar colors come from `src/data/calendars.json`; shared venues show segments for each associated calendar. Calendar deep links use the focused event's colors. The same symbols appear in the directory and event popup links. Other organizations retain their existing symbols.

An individual event can override its map symbol colors using `"mapMarker": { "fill": "#123456", "border": "#000000" }`. Both fields accept six-digit hex colors. `map-markers.json` sets the default outline and fallback fill; changing the original white logo artwork is not needed.

## Organization map markers

All five sourced organizations use `src/lib/organization-marker.ts`: DSA, Macon-Bibb Dems, Democratic Party of Georgia 26, Houston County Democrats, and Jasper County Democrats. Official logo assets are stored under `public/icons/organizations/` with provenance in `SOURCES.md`. Jasper uses an authored JC monogram pending a verified Georgia committee logo; it does not borrow another state's logo. Original logo colors are preserved inside the pins.

Calendar colors set the pin background, with segments for multiple memberships. Black outlines and fallback fills are configurable per organization in `src/data/map-markers.json`. Event `mapMarker.fill` and `mapMarker.border` overrides work for every organization. Shared venues have separate organization records so one group's logo never labels another group's events. The key is expandable, and directory and popup symbols match the map.

Use `npm run test:markers` for DSA-specific coverage or `npm run test:organization-markers` for every organization, including per-record overrides. Set `TEST_BASE_URL` to a running preview and `CHROME_EXECUTABLE_PATH` if needed.

## MGRLS library map

The `libraries` preset/layer serves `public/data/libraries.geojson`: 18 fixed locations in seven counties, including the Downtown Bus Station Book Locker. Branch names, postal addresses, phone numbers and published hours come from https://bibblib.org/locations_hours.php and individual branch pages captured October 15, 2026. Library WOW has no fixed address and is linked as a mobile service rather than pinned.

Reviewed source records and HTML are saved in `data/sources/mgrls/`. Public Google Maps embed keys were redacted from saved pages. `python scripts/import-libraries.py` regenerates the GeoJSON offline. It rejects unresolved or ambiguous geocodes and county mismatches. Three reviewed OpenStreetMap library features supplement Census matches: Mary Vinson Memorial, Gordon, and East Wilkinson. Their provenance is preserved with the records. Map points are approximate.

`src/data/library-counties.json` defines county colors and the matching SVG open-book pins under `public/icons/libraries/`. Directory icons, the expandable county key, and map markers use the same assets. Search supports county names. Popup hours preserve separate schedules and published gaps without inferring missing days as closed. Refresh source pages and geocoder responses deliberately, review changes, regenerate, and deploy.


## Recreation center source

The Recreation centers layer and Macon-Bibb recreation centers map preset use `public/data/recreation-centers.geojson`. All 11 facilities on the county recreation directory are included, with source names, addresses, published hours, amenities and source links. Snapshot and attribution: Macon-Bibb County Government Recreation Department, October 15, 2026.

`data/sources/recreation/` preserves the county HTML, extracted records, manifest and US Census Geocoder responses. All street/city/state queries returned single matches. Some county ZIP codes differ from Census results; source addresses remain unchanged, and `geocodedAddress` records the match. Points are approximate street-address locations, not verified entrances.

Run `python3 scripts/import-recreation.py` to regenerate the GeoJSON offline. The map supports name, street address and amenity search, center popups, directions, source links and independent layer selection. No automatic source refresh is configured.

## MGRLS program events

Original CalendarWiz snapshots are in `data/sources/mgrls-events/`: 13 complete monthly pages covering October 2026–October 2027, a compressed original HTML detail page for each imported occurrence, RSS evidence, download manifests and reviewed off-site location overrides. The 365-day RSS request returned only 200 items; the complete import therefore uses the month pages and all detail pages. All events from the supplied MGRLS system calendar are included, across branches and counties; the earlier Mobilize radius is not applied to this separate organization import.

Run `python scripts/import-mgrls-events.py` to regenerate `src/data/mgrls-events.json` offline using Python 3.9+ and the standard library. The saved October 15, 2026 snapshot contains 446 events through November 30. Later months through October 2027 were checked and have no published events. The importer validates month response identity, complete row/detail coverage, matching detail and month dates/times, timezone offsets and stable source IDs. It preserves all-day dates, uses explicit end times, and supports source listings without an end time without inventing a duration.

Events belong to the MGRLS organization and the publisher’s seven program-category calendars. Short source excerpts appear on event cards; complete original descriptions remain in the raw HTML and source links. The map includes 424 occurrences at 18 venues. Coordinates reuse `public/data/libraries.geojson`; the bring-your-own-book event uses the explicitly published Sweet Eleanor’s address, with existing Census coordinate evidence. Library Without Walls visits and the Preschool-building book sale have no guessed markers. Location overrides and the review list document these decisions. Builds use saved files only; no automatic calendar refresh or deployment is configured by this import.


## School and transit maps

The map chooser includes Schools & facilities, Elementary/Middle/High attendance zones, School-board districts and Macon-Bibb transit. Layer controls are grouped into community, education and transit sections; groups with visible layers open automatically. Schools use building pins, attendance/board polygons have translucent categorical fills, and route lines use the authority’s colors above polygon layers and below stops. Source popups and map credits carry attribution. Search includes school addresses, member names, route names/numbers and stop codes.

`data/sources/bcsd/` preserves the five official GeoJSON snapshots and service metadata linked through BCSD’s District Zone Maps app. Attendance source term is `CURRENT 2025-26 SY`; it is displayed explicitly, rather than asserted as current-year enrollment guidance. The 43 locations include facilities and source status; 23 elementary polygon records include split/temporary zones. Six middle, six high and six geographic school-board polygons are included. Proposed rezoning datasets are excluded. Attribution: Bibb County School District; Middle Georgia Regional Commission.

`data/sources/mbcta/google_transit.zip` preserves the authority’s official GTFS Schedule feed, captured October 15, 2026. The importer groups shapes via trips into 10 MultiLineString route features, retaining 29 path variants, and joins stops via stop_times/trips to their scheduled routes. All 854 source stop records are retained, including any with no scheduled trips. Source wheelchair-boarding values and IDs remain available. Original schedules/calendars are in the ZIP; no live-arrival feed is used. Feed coverage is June 7–October 31, 2026 and is shown on the map; an expired-feed notice is computed in America/New_York. Attribution: Macon-Bibb County Transit Authority.

Run `python3 scripts/import-education-transit.py` to rebuild the seven school/fixed-transit GeoJSON files and `src/data/education-transit.json` offline using standard-library modules. `public/data/map-sources.json` catalogs the sources. Refresh snapshots and catalog provenance deliberately; builds make no source requests.


## MBCTA Rapid service area

The `rapid` map preset uses `rapid-service-area.geojson`, imported from the public KML of the authority’s embedded Google My Maps map (`mid=1XRJZHA2YN6PVYQcTneJiPw_QS1S6g9E`). `data/sources/mbcta-rapid/` preserves the KML and source manifest. Four zone records preserve all six polygon parts, including the multipart Northwest area. The Downtown name follows the authority’s website; `originalName` retains “Rapid Transit vector.” Original map descriptions, including older July 1, 2026 annotations, remain available. Attribution: Macon-Bibb County Transit Authority — Rapid Transit.

The shared offline importer regenerates this eighth dataset too. KML rings, holes and multipart geometry are retained as WGS84 Polygon/MultiPolygon features. This on-demand service uses separate source links and notes from fixed-route transit; GTFS expiry dates do not apply to Rapid. The map does not guarantee current trip availability.


## School location types

The Schools by type preset enables six independent point layers generated from the official `Type` field: elementary (22), middle (6), high (6), pre-K (1), Administration (7), and Specialty School (1). Source categories are retained, including classifications of academies and support facilities. Each type has a consistent building-marker color in the layer key, map and directory. The point-type subsets are non-overlapping and together contain all 43 original IDs; `schools.geojson` remains available as a combined download.

Attendance presets enable only the matching elementary, middle or high point layer plus that level’s boundaries. Schools by type enables all six. Bookmarked `layers=schools` URLs expand to the new point layers. The offline importer regenerates the six type files along with the other official datasets.

## BCSD calendar snapshots

Run `python scripts/import-bcsd-events.py` to rebuild `src/data/bcsd-events.json` offline from `data/sources/bcsd-events/`. Requires the existing `scripts/requirements-events.txt` dependencies. Original public ICS and 2026–27 academic PDF, capture manifest, reviewed PDF dates, and import report are saved there. Refresh sources and review the PDF dates/aliases before rerunning when BCSD publishes changes. The site does not poll the feed automatically.

The October 15, 2026 snapshot contains 63 distinct entries: 54 feed occurrences and 18 academic periods with nine duplicates merged. Recurrences cover January 1, 2026 through October 15, 2027; the academic PDF covers only 2026–27. Pre-planning follows highlighted weekdays. Dates retain America/New_York offsets and all-day exclusive ends; no locations are guessed. Shared entries belong to both BCSD calendar filters. Multi-day periods display on each covered day and across month/year boundaries.

Validate with `python -m unittest discover -s tests -p 'test_*import.py'`, `node tests/bcsd-calendar.mjs` (dev server on port 4324), and `npm run build`.
