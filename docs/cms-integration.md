# CMS and public content integration

## Admin access

The static `/admin/` page uses Supabase Auth in the browser. Configure
`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` for local
development or as build variables. The publishable key is public configuration;
never use a service-role or secret key in the web project.

After sign-in the page calls the live `cms_role` RPC. Editors and administrators
can list and edit drafts. Only administrators see publish and withdrawal actions.
The database remains the authority for every read and write permission. A signed-in
account with no staff role receives an explicit access-denied state.

The editor handles all five API kinds: organizations, calendars, events, layers,
and maps. It edits the complete JSON payload so source metadata and unknown fields
such as `importProvenance` remain intact. The browser checks JSON syntax and the
`(kind, id)` key. The API enforces the complete publish rules. SQL error `40001`
keeps the user's unsaved text and shows the latest saved revision for comparison;
the user must explicitly choose whether to keep local edits or load the server copy.
Known permission, dependency, missing-record, and validation errors receive clear
messages, with the API message as the fallback. Withdrawal uses the published
revision, which can differ from the draft revision.

The API client, generated types, and checksum manifest are vendored in
`src/vendor/civicpulse-api/`. They came from the API export command
`node scripts/export-web-client.mjs /tmp/civicpulse-api-client`; the manifest
records both SHA-256 digests. When refreshing, use a pinned API checkout, copy all
three exported files together, review the diff, and commit them. A standalone web
checkout and CI do not import files from the sibling API repository.

## Resident pages and refresh behavior

Resident pages remain static and use local reviewed data by default. A successful
CMS publish or withdrawal changes the API; residents see it only after a later
successful static build and deployment. Until then the Admin UI reports “website
update pending.” There is no automatic rebuild webhook or browser API dependency.
See the [static publication architecture](static-publication-architecture.md)
before changing refresh or snapshot behavior.

Keep `PUBLIC_CONTENT_SOURCE=local`. The hosted API is intentionally empty, and the
web snapshot consumer is still being implemented and reviewed against the
immutable-generation contract. The prebuild and dev checks reject `supabase`
source mode until that consumer is complete; do not enable it manually. Public
maps, calendar, event pages, and downloads therefore continue to work from local
data without an API request.

The local Mobilize source is hash-gated by `scripts/prepare-public-mobilize.mjs`.
It reads the reviewed source bytes without changing them and writes an ignored,
derived build input. For the 81 reviewed private occurrences it preserves IDs,
sets both address and location to `Private location — see organizer for details`,
removes fields outside the private-event allowlist, and permits no coordinates.
The raw source file is not imported by resident pages or copied into public build
assets. Private event payloads from any source are validated before use; malformed
records fail the build. Private and virtual events cannot create map geometry, and
ICS exports use the approved placeholder with no `GEO` property. The complete
contract and limitations are in the architecture document's
[Private-address publication contract](static-publication-architecture.md#private-address-publication-contract).

Event source links, labels, capture dates, and other payload fields flow through
the existing event components. Map feature properties are retained verbatim for
the existing popup attribution and source notes. Layer GeoJSON is written to the
static site under `public/data/cms/`; event locations continue to use the same
calendar-derived GeoJSON route as the current site.

## Configuration example

Copy `.env.example` to `.env`. Leave `PUBLIC_CONTENT_SOURCE=local` until the
initial content migration and review are explicitly authorized. Hosted Auth redirect
URLs also need `/admin/` on each approved site origin, configured in Supabase Auth.
