# Local published-content snapshot exporter

This is a fixture-tested, local-only consumer of the additive publication-manifest
contract from API commit `e9c9c621f43864f8fc90eaefacc4c0a223f50680`. Its four-file
vendor bundle is isolated at `src/vendor/civicpulse-api-publication-local/`; it does
not change the frozen hosted-v1 client. The accepted delivery boundary is in
[the static-publication architecture](static-publication-architecture.md).

## Current behavior

Run `node scripts/export-published-content.mjs` only with
`PUBLIC_CONTENT_SOURCE=supabase`, `PUBLIC_SUPABASE_URL`,
`PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and a full source commit in `GITHUB_SHA` or
`CIVICPULSE_SOURCE_SHA`. The runner verifies the vendored file checksums, requires
the local additive contract, reads manifest A, all five explicitly filtered record
kinds and all declared stored layers, then reads manifest B. Bootstrap must be
complete; explicit empty kinds and zero-feature event-derived layers are allowed.
Decimal revisions and generations stay strings. Unknown payload fields are
preserved for ordinary records. Private events are checked at the record
serialization boundary before a snapshot file is written.

The exporter writes one generation into a unique staging directory under
`.civicpulse/snapshots`, validates page membership and layer counts, writes the
snapshot manifest last, renames the complete directory to an immutable name, then
runs the same strict pinned-reader validation against that final directory before
atomically replacing `active-snapshot.json`. A failed fetch, consistency check,
serialization, final read or pointer replacement removes its owned staging/final
directory and leaves the previous active pointer unchanged. A per-root exclusive lock refuses overlapping exports; stale
locks and complete orphan generations fail closed and require operator recovery.
The root and every snapshot input are checked for symlinks, paths stay within the
pinned generation, and unlisted files are rejected. `node
scripts/read-pinned-snapshot.mjs` validates the explicit `CIVICPULSE_SNAPSHOT_DIR`
input without consulting the active pointer, so a build can keep using the exact
directory it resolved at start. `scripts/materialize-pinned-snapshot.mjs`
consumes an explicit generation through that strict reader and writes Astro's
source-shaped `cms-published.json`, layer GeoJSON files and a generation marker.
It preserves arbitrary IDs such as `__proto__`, `constructor` and `toString` as
array values and URL-encodes layer filenames. Use it only in a disposable build
workspace. It is not wired into normal `npm run build` hooks; those continue to
fail closed for `PUBLIC_CONTENT_SOURCE=supabase` until the reviewed trusted runner
is ready. Path checks reject observed symlinks and traversal;
they do not provide an `openat`-style defense against a concurrent process
rewriting ancestor directories. A future runner must keep the staging root in a
private, isolated workspace with no untrusted concurrent filesystem writer.

An all-empty inventory is rejected even when the API says bootstrap is complete.
The exact epoch/generation/inventory approval contract is not implemented, so
there is currently no code path to activate that release. Individual empty kinds
remain valid. Every activation also requires a full source commit SHA. In GitHub
Actions, the CLI additionally requires `refs/heads/main` and checkout `HEAD` to
equal `GITHUB_SHA`; that is provenance checking, not proof of protected-main
authorization. The trusted workflow and its protection remain separate rollout
requirements.

Focused offline coverage runs with:

```sh
node tests/published-snapshot-export.mjs
```

These fixtures exercise a valid private placeholder plus intentional empty kinds,
hostile private payload variants at the real exporter serialization entrypoint,
prior snapshot/pointer preservation, staging cleanup after a layer failure,
explicit source selection, bootstrap/all-empty gates, full-SHA requirement,
pinned-directory reads, symlink refusal, lock refusal and orphan-generation
protection. A regression also exports, reads, materializes and runs an Astro
build in a temporary workspace with `__proto__`, `constructor` and `toString`
layer IDs, then checks all three emitted GeoJSON files. An injected unreadable
final candidate is rejected before pointer swap and cleaned up, preserving the
prior pointer and artifact. No hosted API or production content is used by these
tests.

Private event `sourceUrl` is checked at this serialization boundary against
`cp-source-url-v1`, preserving the accepted original string bytes. Its exact
fixture at `tests/fixtures/cp-source-url-v1.json` contains 18 accepts and 79
rejects; the canonical JSON fingerprint is
`9e10592c001a367cbafb9d30c6e723d4d8b36221e72fe6895cf46f00a53aecb4`. API-Dev
reports matching disposable SQL publish tests at local API commit
`c9f2e915f3df367f0b9351877f8bec4537054054`; this does not verify a hosted API.

## Not enabled for resident builds

The materializer is not yet wired to the regular build hooks or a trusted isolated
runner. `PUBLIC_CONTENT_SOURCE=local` remains the resident-site default;
`scripts/prepare-public-mobilize.mjs` continues to gate Supabase builds. The API's
current publication manifest is unbootstrapped, and the frozen hosted v1 has no
manifest RPC. Production snapshot mode therefore remains disabled pending the
additive API rollout, reviewed bootstrap, independent security closure, and the
trusted runner/status/credential controls in the architecture decision. This local
implementation does not imply that GitHub Actions, secrets, or deployment
automation are configured.

The shared URL corpus and local API publish tests now match. Cross-API privacy
closure still requires independent review of the frozen web serialization
boundary and API validator commits. See the independent
[security review](security-review.md) for its separately owned rollout findings.
