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
retained artifacts. No uploader is imported or called. Fake transport/production
authority is not inferred from a local artifact or these assertions.

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
credential-free lane passed 69 tests/build/private output on cached Node 22.23.2
as described in [the runtime evidence](workflow-templates/README.md). Frozen
independent review and a final complete M1 acceptance run remain separate.
