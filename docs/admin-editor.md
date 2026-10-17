# Admin editing and review

The admin surface uses the existing Civic Pulse paper/forest palette, Unna
headings, DM Sans controls and flat panels. It is an **Operate** surface: records
stay in a compact sidebar, content fields lead the editor, and saving is separate
from API publication. On narrow screens the list stacks above the editor, with a
Back to records link and full-width primary actions.

## Editing without losing source data

Ordinary labelled fields cover organization/calendar names, membership, common
event fields and source dates/links, layer names/descriptions/colors, and ordered
map layer IDs. They edit individual properties of the same complete JSON object
used by Save and the existing exact saved-payload Publish gate. They are a
convenience view of existing fields, not a new backend schema or endpoint.

Advanced JSON retains every other property, including nested import provenance,
geometry and source evidence. Rendering fields does not add defaults, delete
unknown keys, trim URLs, normalize dates/timezones or alter existing value types.
A field with an unsupported existing type (including null) stays untouched and
must be edited in Advanced JSON. Ordered ID lists use one ID per line. Boolean
Not specified deliberately removes only that property when chosen. The private
flag does not sanitize/redact coordinates, fields or addresses; API publication
validation still rejects invalid private records.

New event drafts explicitly set sample=false; no event text/source facts are
invented. Drafts can be incomplete. A complete record must use supported JSON numeric values (see below),
and its ID must match Record ID. Backend-enforced permissions, membership,
reference, date, geometry and publication validation remain authoritative.

## Save and publication

Save does not publish. The complete exact saved payload is available in a separate
review disclosure. Changed structured fields or Advanced JSON immediately make
Publish unavailable until an explicit Save and saved-payload review. The existing
handler also rejects dirty/invalid/conflicted/unauthorized/busy/uncertain states;
a disabled button is not the permission boundary.

Action feedback persists after same-record refresh. Known-success receipts match
canonical JSON values, identity/revisions, publication presence/absence and audit
evidence before unlocking. Unknown outcomes are never retried. Reconciliation
and same-user session behavior are documented in [the QA checkpoint](admin-browser-qa.md).
Publishing/withdrawal changes the API only. With the current local public source,
CMS-to-website refresh is not enabled, including after an ordinary local build.

## Validation scope

`node tests/admin-fields.mjs` covers retained nested metadata/geometry/special own
keys, date/source bytes, ordered IDs, unsupported types and no private redaction.
`node tests/admin-controller.mjs` executes the actual shipped controller with
injected DOM/Auth/API boundaries, including structured edits -> save -> exact
review, dirty publication rejection and identity-loss clearing. These are local
fixtures, distinct from authenticated hosted browser evidence.

The explicit [local browser fixture](../tests/fixtures/admin-browser/README.md)
replaces transport only in a disposable archive. It is labeled mocked and never
used for release. Normal release builds contain neither fixture modules nor the
mock banner. New UI bytes require a new clean artifact and Security/lead review.

The mechanical design detector found advisory compact type sizes and inherited
notice/status colors outside its coarse sidecar ramp. These retain the incumbent
Civic Pulse semantic states; no decorative shadows, new visual world or design
system rewrite was introduced. The existing design sidecar is stale relative to
DESIGN.md; refreshing it is a separate optional `impeccable document` task.

## Bounded connected-Chrome refinement review

Developer review used the explicit local mocked archive at
`http://127.0.0.1:4325/admin/`, based on `170c627` plus the one confirmation batch.
Dependencies were reused from the prior locked clean artifact with an identical
lockfile, not freshly installed for this mock. The real normal prebuild/build ran,
including reviewed derived Mobilize preparation; no shared generated data was
copied. The fixture build had zero diagnostics and the existing large-map-chunk
warning. It is not a release artifact.

One batched desktop/mobile inspection and one confirmation were performed.
Desktop (1440×1000 confirmation): ordinary Name edit -> Save revision 2 -> Publish
revision 2; persistent success notice, matching saved review, nested unknown
metadata retained and no horizontal overflow. Mobile (390×844): event title edit
and Save worked in the first pass; timezone offset string stayed unchanged,
controls fit the width, dirty Publish stayed blocked, and Tab moved to Description
with a visible solid focus outline. Confirmation verified concise accessible field
names, neutral initial New draft state and no overflow (375px document with a
390px viewport including scrollbar). No reported console errors/warnings. The
viewport override was removed; the live signed-in tab was preserved.

The confirmation batch fixed only accessible label verbosity, premature empty-ID
error status, and a fixture-only function signature mismatch. The screenshot
views in the connected-Chrome review show the desktop records/editor hierarchy
and stacked mobile layout. Mock success is not authenticated hosted QA, nor does
it close the previously unverified live conflict/withdraw/signout/editor-role cases.


## Numeric values at the editor boundary

Native JSON parsing can round a high-precision decimal or underflow a small value
before a field renderer sees it. The CMS therefore guards raw JSON at the exact
project-origin `/rest/v1/` response readers, using the existing vendored client's
fetch injection and Supabase's global fetch option. Vendor files are unchanged.
The native Response retains its status/headers and bound text/json/clone readers;
the guard runs when consumers read the body, outside PostgREST's fetch retry loop.
Auth and other origins/paths are untouched. Request headers, body and signal pass
through unchanged. Guard errors contain no response body, numeric token or key.

Every unquoted numeric token must have the same normalized decimal VALUE as the
canonical decimal spelling of its JavaScript Number. Equivalent exponent forms
and trailing zeros are accepted; precision loss, overflow and underflow are
rejected before the first native JSON parse. This is not preservation of numeric
lexemes or an arbitrary-precision editor. Negative zero is the same numeric value
as zero here. The same guard applies to pasted Advanced JSON, structured edits,
Save parsing and the handler's exact-payload Publish gate. Strings and escaped
numeric-looking text are not treated as numeric tokens.

Work is bounded: at most 16 Mi UTF-16 text units, 4096 units per numeric token and
128 levels of JSON nesting. Exponents are compared without allocating strings of
zeros. Unsupported records remain blocked for API-side resolution; they are not
silently rewritten to a nearby supported value. A rejected load/reconcile cannot
provide an editable rounded baseline. A known successful mutation followed by a
rejected response stays locked until proper reconciliation; it is not replayed.

`node tests/admin-json.mjs` exercises raw Response text through the ACTUAL pinned
vendored getDraft and installed Supabase content parser, with one request per
unsafe guard rejection (no automatic guard retry), ordinary/equivalent controls,
strings/escapes/bounds and HTTP status/error preservation. Actual controller cases
also load unsafe nested raw draft/public responses and prove no rounded editor
state or write dispatch, plus known-save/reconcile locking and explicit recovery.
