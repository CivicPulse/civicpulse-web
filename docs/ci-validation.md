# Credential-free validation workflow

`.github/workflows/validate.yml` is prepared locally for review. It has NOT been
pushed or executed by GitHub. Placing it in a reviewed remote commit activates
PR and main-push validation; this is not a deployment workflow. No path filters,
manual inputs, `pull_request_target`, workflow chaining, environment, provider
credentials, OIDC, upload, artifact promotion or cache handoff are configured.
Only `contents: read` is granted, checkout does not persist credentials, and
setup-node package-manager caching is disabled. All PR code, npm lifecycle and
test code is untrusted; run it only on disposable hosted runners without
production secrets. This workflow is not a credential sandbox for arbitrary
caller environments.

## Lanes and final check

- `web`: locked `npm ci`, current controller/JSON/session/privacy/snapshot/CI
  regressions, normal local Astro build/private-output checks; all five committed
  Python importer suites; all six committed browser suites against a loopback
  static server. Python tests use exact versions in `scripts/requirements-ci.txt`.
  Chromium and system dependencies are installed using the locked Playwright CLI.
  Untracked discovery/run-all/shared package edits are excluded.
- `sql`: separate exact public API checkout, locked install with CLI lifecycle
  disabled, then sequential DB security/publication/privacy harness, projection
  HTTP fixture test, and real Web SQL A/B export/read/materialize/normal-build
  removal integration. Each invocation gets a new offline ephemeral DB container;
  no SQL harness runs concurrently in this lane. The frozen API source is a test
  contract fixture, not approval of newer API contracts or hosted Auth/PostgREST.
- `civicpulse-validate`: unique final check, `if: always()`, depends on BOTH lanes,
  has no token permissions or checkout/dependency install. Its inline shell
  accepts only both exact `success` results; failure/cancelled/skipped/absent
  results fail. A runner outage/forced cancellation cannot produce a successful
  gate. Branch-protection configuration remains a separate lead action after
  first real execution and exact check-name verification.

The workflow uses `ubuntu-24.04` disposable GitHub-hosted runners and project
Node **22.23.2**. Action runtimes are separately declared by the pinned actions.
Ubuntu runner tooling/patches are provider managed; the job prints Python/Podman
versions and fails if required tooling is missing. Local Node 22 image evidence
is described in [runtime evidence](workflow-templates/README.md); it is not a
claim about GitHub's runner or browser execution.

## Immutable external pins

Official action tags were rechecked with anonymous `git ls-remote --tags` on
2026-10-17; exact pins and official links:

- [checkout v7.0.1](https://github.com/actions/checkout/tree/3d3c42e5aac5ba805825da76410c181273ba90b1)
  `3d3c42e5aac5ba805825da76410c181273ba90b1`.
- [setup-node v6.5.0](https://github.com/actions/setup-node/tree/249970729cb0ef3589644e2896645e5dc5ba9c38)
  `249970729cb0ef3589644e2896645e5dc5ba9c38`.
- Public [API fixture source](https://github.com/CivicPulse/civicpulse-api/commit/c11e6fd69a90c7884a2763aa843d28fd7ce93114)
  `c11e6fd69a90c7884a2763aa843d28fd7ce93114`. Anonymous GitHub repository and
  exact-commit REST reads both returned 200 on 2026-10-17. No PAT/App secret.
- Official PostGIS image, **linux/amd64**:
  `docker.io/postgis/postgis@sha256:7ef699637304feff96028edbc7a653e135f2db2236d322b5cb2bfca11fd920bc`.
  Registry OCI manifest bytes independently hash to this digest; local inspect
  reports config ID `c761c571d94ac93c9b7dfb9c2e9d9e0d1e5cf84f16c095bf8f7114757d391aa4`.
  The frozen API checks the literal local image name `postgis:16-3.5`; the helper
  creates that local alias FROM the verified digest and verifies equal image IDs
  before running `--pull=never`. The registry tag is never trusted or pulled.

## SQL lifecycle and limits

`node scripts/validate-sql-ci.mjs` requires explicit
`CIVICPULSE_CI_API_DIRECTORY`. It verifies exact Git HEAD and clean source (including
untracked, nonignored files) before any database setup. Dependencies remain locked
and separate; there are no sibling imports. The helper rejects any preexisting
`civicpulse-api-db-test` container rather than stopping/removing it.

Fresh containers use `--network=none`, no published ports, read-only root and
private tmpfs database/socket/temp storage. The only password is a fixed public
throwaway initialization marker. A random per-attempt ownership label binds
cleanup. On success, test failure, readiness failure or uncertain start, cleanup
queries that exact label and removes only a single matching container ID; no
name-only deletion, wildcard or host-wide prune. Readiness is bounded and requires PID 1 to be the final postgres server before pg_isready; the temporary initialization server is not sufficient. Cleanup
failure is a failing run, not success. SIGKILL/runner loss can interrupt cleanup;
these jobs must use disposable hosted runners, never a persistent/shared host.
There is no automatic orphan adoption or hosted database configuration.

## Local checks and pre-push sequence

```sh
actionlint .github/workflows/validate.yml
node tests/ci-workflow.mjs
node scripts/validate-local-ci.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
node scripts/validate-browser-ci.mjs
CIVICPULSE_CI_API_DIRECTORY=/absolute/clean/pinned-api node scripts/validate-sql-ci.mjs
```

The final-gate regression executes the actual YAML shell across all 25 dependency
result combinations. Lifecycle regressions exercise actual orchestration with a
fake process boundary, including refusing preexisting containers and owned-only
cleanup after an uncertain start; they are not real container/provider evidence.
Existing real SQL A/B evidence is separately recorded in
[M1 integration](m1-sql-artifacts.md).

Before push: freeze owned workflow/helpers/tests/docs only; inspect staged scope,
scan new committed files without external secret verification, confirm exact
remote URL/HEAD and ancestry, and send the full intended SHA plus normal
`SHA:refs/heads/main` push plan through lead for scoped Security review. Do not
push until that review/lead instruction; no force or shared unstaged files.
After an authorized push, observe actual dependency/browser/container/gate results
and correct concrete failures before the lead enables required-check protection.
No branch settings, secrets, environments or deployment changes are included.

GitHub behavior references: [job dependencies and conditions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds)
and [workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions).

## Frozen local execution evidence

CI implementation source `e3fdb4f4378c55c144d23c501d969f6c2666e9c7` was validated
in `/tmp/civicpulse-ci-f74501a/source`. It began as a clean f745 archive plus
ONLY the subsequently committed ephemeral-port helper; every one of the 762
regular committed files was byte-compared against the e3fdb4f Git archive and
matched. No shared package/test/UI overlays were consumed.

- Fresh `npm ci --no-audit --no-fund`: 311 locked packages installed successfully
  (normal npm cache use, not copied node_modules). No secrets/config were added.
- Full 78-test local lane, normal local Astro build with zero diagnostics and
  private-output checks passed on measured Node 22.23.2 in the previously pinned
  cached official image, network disabled/read-only root/private writable mounts.
  Output: 81 private ICS pages, 34 map features, 973 static files. Log:
  `/tmp/civicpulse-ci-f74501a/node22-validation.log`.
- All five Python suites: 24 tests passed using installed versions matching
  `requirements-ci.txt`; this was not a fresh pip install or hosted Python run.
- Locked Playwright Chromium 1248 / Chrome for Testing 156.0.8078.4 was downloaded
  successfully into `/tmp/civicpulse-ci-browsers`. All six committed browser
  suites passed against the normal local build, including desktop/mobile,
  no-JavaScript, unavailable-layer and source/ICS assertions. Log:
  `/tmp/civicpulse-ci-f74501a/browser-validation.log`. Browser orchestration used
  host Node 26.11.1; this is separate from the measured Node 22 unit/build lane
  and from the future GitHub Ubuntu browser/system-dependency installation.
- actionlint **1.7.12** passed. Four CI regressions passed, including actual YAML
  final-gate execution over all 25 dependency-result combinations.
- Actual pinned PostGIS startup, offline network/read-only root, SQL `SELECT 1`,
  success cleanup and failed-task cleanup passed under a unique remapped smoke
  container name. It did not replace API-Dev's existing fixed-name container.
  Log: `/tmp/civicpulse-ci-container-smoke.log`. This is real lifecycle evidence,
  not execution of the entire sequential SQL lane. A subsequent full rehearsal
  is recorded below; the native fixed-name GitHub lane remains unexecuted.

No GitHub run, remote workflow activation, required-check protection, provider
operation or deployment has occurred as part of this checkpoint.

Final pre-review CI corrections and rehearsal:

- `3f20c0c` requires final-server PID 1 before pg_isready. A real first rehearsal
  caught the entrypoint's temporary init server shutting down mid-test; the failed
  run cleaned up its own container. The regression proves a temporary `bash` PID
  cannot start the SQL task. CI regression count is now 5, local lane total 79.
- A clean `3f20c0c` archive passed all 79 tests/build/private-output checks on the
  pinned Node 22.23.2 container. Log:
  `/tmp/civicpulse-ci-3f20c0c/node22-validation.log`. Two unused-symbol hints in
  that run were removed without behavior changes at `cb4a36e`; subsequent Astro
  check reports zero errors, warnings and hints.
- The complete three-harness sequential SQL helper then PASSED using a separate
  clean API Git checkout at exact c11 plus locked install. A PRIVATE test-only
  PATH shim remapped only the fixed test-container name to an isolated name,
  preserving API-Dev's existing host container. It did not replace SQL, HTTP,
  image/network guards, migrations, exporter, reader, materializer or builds.
  Every harness had a fresh real pinned offline/read-only-root PostGIS container,
  and owned-only cleanup completed between them. This is local Node 24.21.0
  execution, not GitHub or hosted Auth/PostgREST evidence. Log:
  `/tmp/civicpulse-ci-sequential-sql-final.log`.
- Third-harness actual A/B evidence:
  `/tmp/civicpulse-m1-artifacts-aBetOs/evidence.json`; exact source SHA and artifact
  hashes are recorded there. All-byte removal/local-positive/dirty-clean/failure
  assertions passed, with zero real uploader calls. Container-name mapping is a
  disposable local verification aid, not a committed production transport/flag.

The fixed-name GitHub job, Ubuntu browser dependency install, hosted runner
versions and final check publication still await the first reviewed push/run.
No settings/protection or deployment follows from these local passes.
