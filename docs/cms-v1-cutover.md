# Direct v1 CMS cutover capture and build

This is a separate, explicitly labeled v1 path. It does **not** call
`publication_manifest`, invent `dataset_epoch`/`generation`/`bootstrap_complete`,
or reuse the additive M1 snapshot format. No deployment or upload is performed.

## Inputs

- Explicit `PUBLIC_CONTENT_SOURCE=supabase`.
- `PUBLIC_SUPABASE_URL` (current public config:
  `https://drzcrodqflzkzzbqsags.supabase.co`).
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public build-time value; never a service role).
- `CIVICPULSE_SOURCE_SHA` or `GITHUB_SHA` full commit.
- `CIVICPULSE_V1_INVENTORY`, an explicit cutover pin. The initial pin is
  `data/cms-v1-cutover/v1-935-00c472b8.json`: 7 organizations, 20 calendars,
  867 events (786 normal + 81 reviewed private placeholders), 24 layers, 17 maps;
  935 selected records; 1311 stored-layer features and 608 event-derived locations.
  It explicitly lists the 3 hosted synthetic records to exclude. This is an
  initial cutover pin, not a permanent claim that the CMS will always contain 935
  records. A later cutover must supply a new reviewed inventory file.

## Behavior

`scripts/capture-v1-public-content.mjs` reads all public v1 content in deterministic
ordered pages, validates payload/revision and exact page counts, and partitions
the complete published set into the 935 expected records and the 3 explicit
exclusions. Missing, unknown, duplicate, changed or private-policy-invalid rows
fail closed; no local content is selected.

The complete identity/revision/payload fence is read initially, then after the
stored-layer GeoJSON read, and must match. Stored layers are read without a bbox,
must advance by the actual `nextOffset`, end with `null`, and match the pinned
feature count. The `event-locations` layer is derived from the same selected
events. Final totals must be 1311 stored and 608 event-derived features.

The resulting immutable directory is labeled
`format: civicpulse-v1-direct-capture`; it carries honest source commit, capture
time, inventory pin/digest, content-fence digests, API vendor manifest hash, file
digests and record/layer inventory. It has no fabricated generation or bootstrap.

## Build

```sh
PUBLIC_CONTENT_SOURCE=supabase \
PUBLIC_SUPABASE_URL=... \
PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
CIVICPULSE_SOURCE_SHA=<full-main-sha> \
CIVICPULSE_V1_INVENTORY=data/cms-v1-cutover/v1-935-00c472b8.json \
npm run build:cms-v1
```

The command captures into `.civicpulse/v1-captures`, materializes the selected
v1 capture into an isolated build, runs the normal Node 22 static build and emits
an exact artifact inventory. It does not upload or deploy. `PUBLIC_CONTENT_SOURCE=supabase`
means the normal prebuild reads the selected capture; a capture/network/API failure
exits nonzero and never falls back to local data.

The snapshot reader/materializer validates the v1 cutover format and provenance
before writing `src/data/cms-published.json`, layer GeoJSON and
`data/cms-snapshot.json` in the isolated build. The declared browser snapshot
identity is the honest capture digest.

## Boundaries

- Scope is the protected main source; the current production public Supabase
  configuration and known-good deployment `264358a6-b1b1-4e6d-ac7b-03ee8530d59e`
  remain unchanged.
- Security reviews the exact inventory/capture freeze before any hosted export or
  deployment. Protected PR/CI and an exact prebuilt artifact gate remain required.
- No runtime public API dependency: maps, calendars, search data and ICS are static
  build outputs. API failure during capture aborts the build.
- No automatic pipeline, custody, reconciler, scheduler, credential or activation
  is added by this path. API owns the content import.
