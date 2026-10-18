# M1 actual SQL to static artifact integration

This is a local integration foundation, not a deployed CMS-source release or
source/claim/fence/uploader/live-status authority. Resident production remains
the reviewed local-source deployment. No hosted database is used by this command.

## Reproduce

Prepare an external clean API archive of
`c11e6fd69a90c7884a2763aa843d28fd7ce93114`, including its committed migrations and
`scripts/serve-publication-fixture.mjs`. Follow that API commit's
`docs/publication-fixture-handoff.md`. The existing guarded disposable PostGIS
container must be running. The Web test starts the external Node process and
uses only ready NDJSON, loopback public test HTTP reads and bounded advanceB/close
IPC. There are no sibling module imports or HTTP mutation routes.

From the Web repository with locked dependencies installed:

```sh
CIVICPULSE_M1_FIXTURE_DIRECTORY=/absolute/disposable/api-archive node tests/m1-sql-to-artifact.mjs
```

The build archives Web HEAD, not its dirty working tree. To test a frozen Web
commit from an independent clean archive, supply `CIVICPULSE_WEB_GIT_REPOSITORY`
pointing to a read-only source Git checkout and `CIVICPULSE_WEB_SOURCE_SHA` with
the full reviewed commit. This selects immutable build source, not source
admission. Dependency reuse requires identical package-lock bytes and is reported
as reuse, not a fresh install. The child build gets a private HOME and a small
environment allowlist, with no inherited Supabase/Cloudflare/GitHub credentials.

## Actual exercised path

The API fixture performs real authenticated disposable SQL saves/publications and
anonymous projections, not hosted PostgREST/Auth. A includes all five kinds,
public/private events, stored geometry and derived geometry. Its explicit owner
bootstrap is fixture setup only. Web exports A, validates the pinned snapshot,
archives source and runs normal `npm run build`, including normal prebuild/check.
The exact API advanceB transaction withdraws the event, dependent map and stored
layer; B retains the private event and empty derived layer. Web exports/builds B.

Assertions cover populated A sentinels as a valid control; absence of removed
event/layer/map/feature bytes from every B artifact file; removed per-event ICS
and stored-layer URL; dirty/reused A workspace B versus a clean B control with
byte-identical complete inventory; no stale public/dist files; retained last-good
A unchanged. Corrupt pinned input, actual materializer filesystem failure,
actual postbuild failure and actual hardlinked artifact rejection preserve both
retained artifacts. No real uploader is imported or called. A TEST-ONLY private directory receiver
exercises success, terminal failure and timeout-after-bytes-change, with no
implicit retry; a timeout is not interpreted as unchanged or live. No transport
selector exists in the build entrypoint and no production authority is inferred.

The artifact identity is SHA256 of strict
`stableSerialize({schema_version:1,files})`, with **no trailing newline**. Files
are globally UTF-8-byte path ordered `{path,bytes,sha256}` entries; symlinks,
hardlinks and special files fail. Source/snapshot identity is in a separate build
provenance file, not extra fields in the M2 artifact inventory or evidence of
authenticated source origin.

The test writes private temporary evidence/artifacts and closes its owned SQL
fixture/database. It never uploads, writes hosted content, changes roles/Auth or
marks a website live. This does not close current-origin old-path denial,
historical deployments, downloaded copies, source admission or production gates.

Developer checkpoints: actual SQL A/B, clean/reused inventories, retained bytes
and failure cases passed on the local supported Node 24.21.0 runtime. The separate
credential-free lane passed 71 tests/build/private output on cached Node 22.23.2
as described in [the runtime evidence](workflow-templates/README.md). Frozen
independent review and a final complete M1 acceptance run remain separate.

## Frozen source removal checkpoint

Developer full integration ran against Web source
`97a7fa79ff85e76ea35bf9ba994f1d561a05c90c` and the external API fixture commit above,
using the real SQL/public projections and NORMAL npm builds. Evidence is retained
at `/tmp/civicpulse-m1-artifacts-Trd9eu/evidence.json` with per-JS raw counts in
`raw-output-counts.json`:

- A: 82 files at `/tmp/civicpulse-m1-artifacts-Trd9eu/last-good`, artifact digest
  `3d4fc349e5548f618e0eb319fd17ce222efd96c52adaf7fea48bc4e4dd3452a1`.
- B: 79 files at the `artifactDirectoryB` path in that evidence file, digest
  `5c20c73fe3c16abae1716c6658bf1de99fb2176584056e1ab51e95fd85f05937`.
- All 867 unique local event IDs scanned across EVERY A/B deployable byte:
  zero matches, including event and map JS. Four separate local-source positive
  controls remain present in a normal local build. Generic code identifiers such
  as the organization style case `mgdsa` are not event-record payload IDs.
- A event JS `_astro/events.FdyyD6nW.js`: 5,713 bytes; B event JS
  `_astro/events.BZ36BWAF.js`: 5,180 bytes. Both contain zero distinct `mgdsa-`
  record tokens (the earlier unfixed events chunk was approximately 795 KB).
- Real SQL B receipts withdraw event/map/layer at revision 1, sequences 15–17;
  B retains one organization/calendar/private event/derived layer and no map.
- Clean/reused B exact inventories, last-good preservation, failure and test-only
  receiver assertions passed. These are developer evidence until independently
  reviewed at the frozen test commit. No hosted action or production delivery.

The notice's simulated-tab tests execute the actual shipped controller with a
minimal DOM/fetch boundary. They are not connected-browser/provider cache proof.
Current-origin old URLs, warmed CDN, historical deployments and download recall
remain separate M2/operational gates; no cache-purge or removal guarantee follows
from these local artifact checks.
