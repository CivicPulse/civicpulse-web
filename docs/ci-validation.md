# Local CI validation and gated delivery plan

This is the Web-Dev implementation plan for the next runner milestone. The
accepted delivery contract is [parent MADR 0001](../../docs/adr/0001-static-resident-publication.md)
and its linked supporting contract. API machine controls and the next narrow
runner handoff are still being implemented. This document does not enable a
GitHub workflow, configure remote settings, or authorize production delivery.

## Credential-free validation lane

From a clean web checkout with locked dependencies installed using `npm ci`, run:

```sh
node scripts/validate-local-ci.mjs
```

The command requires local public source selection, runs the CMS publish-review,
private-event, content-source, deterministic JSON and actual snapshot export/build
fixtures, builds the normal static site, then checks private-event public output.
Snapshot mocks use explicit fixture source identity and never call the hosted API.
Their isolated Astro app prepares reviewed derived Mobilize data itself; no
ignored artifact from the shared checkout is required. The normal build retains
the explicit Supabase gate. The command changes generated build files only and
does not invoke any uploader, migration, database import or provider CLI.

This lane is intended for untrusted pull requests with **no production secrets or
machine credentials**, a fresh disposable workspace, read-only repository
permissions and no deployment environment. A future workflow must avoid
`pull_request_target`, disable persisted checkout credentials and never promote a
PR-produced artifact into the production release lane. The local script is an
orchestrator, not a sandbox or a credential-isolation boundary; the CI caller must
enforce that separation. Nothing is installed in `.github/workflows` yet.

Browser automation is a separate lane: it needs a started local server and a
supported browser installation, then the existing Playwright suites. This command
does not claim those suites, authenticated admin browser flows or outage browser
QA have passed. Python importer tests likewise remain separate from this focused
web/CMS validation command.

## Production delivery: inactive prerequisites

The next local runner increment will use frozen API client/types and mocked
machine contracts only after API-Dev and Architect supply their exact handoff.
Do not infer deployed RPCs from the proposal or alter the frozen public client.

The production path must resolve approved protected main, verify a clean exact
checkout and bind its source identity to the claim, snapshot, build and artifact.
It must pin claim/lease/fence/epoch/generation for the attempt; a change supersedes
the claim rather than mutating its identity. Export is explicit Supabase mode and
fails closed. Build consumes one verified immutable snapshot in a disposable
workspace. Release evidence must identify the final artifact's exact bytes.

Before any upload, source/content freshness and the backend deployment gate must
be rechecked. A sole uploader must serialize external provider operations;
timeouts or ambiguous results retain deployment lockout until authenticated
reconciliation verifies both provider outcome and the production marker.
Successful API publication and successful local builds are not verified website
visibility. All-empty snapshots remain rejected until the complete authenticated
operator-approval contract exists and is reviewed.

Current blockers are the frozen machine/claim/lease/fence/deploy interface and
client handoff, reviewed trusted-main workflow/checkout and artifact binding,
uploader isolation/fencing, provider receipt/reconciliation semantics, and
independent Security plus lead rollout approval. No production credentials,
environments, schedules, dispatch triggers or deployment actions are configured
by this milestone. These controls will be validated with local fakes first; actual
provisioning, hosted migrations/bootstrap and delivery remain separately gated.
