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
Static output without a required application server. GeoJSON provides geographic data. Community events are maintained as static data. Use only sourced events and geographic data. The production site is published at https://www.civpulse.org/.

## Evidence on Hand
QGIS styling is exported from the companion maconbibb-maps project; the website keeps its exported style metadata and ballot SVG assets. The voting map uses uploaded public/data/polling_places.geojson and public/data/voting_precincts.geojson and preserves record activity status. The calendar uses saved public Mobilize, Mid GA DSA Google Calendar and MGRLS CalendarWiz events. Fictional demonstration events and their calendar group have been removed.

## Product Principles
- Make maps and events equally discoverable from the home page.
- Publish only sourced community information; retain source links and capture dates.
- Make layer controls understandable to residents.
- Keep content easy to update without a server.

## Open Decisions
The site does not claim official affiliation with the county or listed organizations.
