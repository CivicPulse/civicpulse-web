# Existing-target ADMIN MVP release review

User-selected target: existing `https://www.civpulse.org/admin/`, Cloudflare Pages
project `civicpulse-web`, production branch `main`, and existing Supabase project
`drzcrodqflzkzzbqsags`. This is the concrete preparation/review plan, not a record
of deployment, hosted migration, staff-role changes or completed authenticated QA.
The user states the site is not in use; a separate environment is not required.

## Artifact preparation

Build from a frozen committed Web revision exported with `git archive`, in a new
private temporary parent. Exclude every shared unstaged accessibility/calendar,
package and documentation change. Install using the committed lockfile (`npm ci`)
or explicitly report reuse of existing locked dependencies when testing locally.
Record the exact dependency-install method; reused modules are not evidence that
a fresh install ran. Do not use the convenience `npm run deploy`, which rebuilds
the shared working tree.

API-Dev supplied `/tmp/civicpulse-mvp-public.env` with mode 0600. It contains only
`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` and explicit
`PUBLIC_CONTENT_SOURCE=local`. The connected Supabase handoff independently shows
an enabled modern publishable key for the same project. Copy public configuration
only into the disposable build workspace, never Git, and reject service-role or
secret keys. No staff password, access token or database credential belongs in
the build. Auth still depends on live Supabase; resident pages remain local/static.

Run the focused admin publish gate, normal static build, and private-output checks.
Serve the exact `dist` locally for connected-Chrome review, including configured
signed-out login and refresh-disabled notice. Record the frozen source revision,
runtime, config target/names, build results, exact artifact tree/file digests and
local QA evidence outside the deployable directory. A hash identifies bytes; it
does not grant deployment authority.

## Backend and authenticated QA checkpoint

API-Dev reports a healthy original-v1 hosted project, zero drafts/public records,
and an existing confirmed administrator. Privacy/URL guards were absent at that
read-only checkpoint; the exact minimal reviewed migration plan and verification
belong to API-Dev/Security/lead. No full delivery/source pipeline is needed here.
Login/session/role reads can be checked before content writes. Real save/publish/
withdraw tests wait for the hosted guard and role checkpoint. Use the existing
account through browser sign-in; never request a password in chat or store it in
test code. Editor/nonstaff/revoked-role checks need approved role/account access;
do not silently expand staff permissions to obtain coverage.

QA sequence: signed out -> sign in -> role/empty lists -> save/reload -> second
session revision conflict -> explicit keep-local/load-latest -> unsaved edits
block publish -> reviewed saved revision publish -> revision-scoped withdraw ->
sign out/session reload. Check keyboard focus/error announcements and a mobile
viewport. Report actual tested roles/flows and remaining gaps separately from
mock/unit checks. API writes do not refresh resident pages in this release, even
after another ordinary local-source Pages build.

For synthetic write tests, agree exact payloads/dependency order with API-Dev and
first confirm absence of every unique namespaced `(kind,id)`. Track created IDs
and returned draft/published revisions. Test records must contain no imported or
private real content. Withdraw only a tracked published revision, in reverse
dependency order; unexpected revisions/collisions stop cleanup. V1 supplies no
browser draft-delete operation, so retain test drafts unless API-Dev supplies an
explicitly approved revision-scoped cleanup plan. No broad-prefix deletion,
overwrite of existing records, user deletion or mass import is part of this plan.

## Release review and execution boundary

Before Direct Upload, confirm actual Wrangler authentication/account access,
the existing Pages project/production branch/custom domain and previous deployment
ID for recovery using read-only provider checks. Present the exact frozen source,
artifact digest/path, config target, hosted guard results and browser QA to
Security/lead. Upload only the reviewed `dist` after their concrete release
clearance, without rebuilding it. No workflow activation, new environment, source
observer, provider-fencing bypass or production credential embedded in assets.

After an authorized upload, verify the deployment ID and `/admin/` sign-in/notice,
then repeat critical authenticated smoke tests and public maps/calendar/download
checks on the final origin. Recover through the retained previous Pages deployment
if required by the reviewed plan. A successful upload alone does not prove Auth,
roles or CRUD behavior. This ADMIN MVP remains separate from automated CMS-to-site
publishing, which is disabled and has no promised manual refresh path here.
