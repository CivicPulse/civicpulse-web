# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Astro static website, hosted on Cloudflare Pages.

## Users
Macon–Bibb residents exploring local maps and community events.

## Product Purpose
Help residents explore multiple maps with independently controlled GeoJSON layers and discover community events in a calendar.

## Operating Context
The home page offers a clear choice between maps and events. The site works on desktop and mobile.

## Capabilities and Constraints
Static output without a required application server. GeoJSON provides geographic data. Community events are maintained as static data. Start with clearly labeled sample data, per user confirmation. Publishing is not yet requested.

## Evidence on Hand
QGIS styling is exported from the companion maconbibb-maps project; the website keeps its exported style metadata and ballot SVG assets. The user initially requested sample content, then supplied public/data/polling_places.geojson and public/data/voting_precincts.geojson and requested using them. The voting map now uses these uploads and preserves record activity status; sample geographic layers have been removed; calendar events remain samples. No confirmed community event feed or branding was supplied.

## Product Principles
- Make maps and events equally discoverable from the home page.
- Keep sample content visibly distinct from verified public information.
- Make layer controls understandable to residents.
- Keep content easy to update without a server.

## Open Decisions
Final site name, production GeoJSON datasets, event sources, domain, and official affiliation remain unconfirmed.
