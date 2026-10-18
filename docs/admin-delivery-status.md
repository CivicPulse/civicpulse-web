# Staff website delivery status

The /admin Website delivery panel is a read-only consumer. It separates the selected
saved draft revision, API published revision and last verified website revision. API
publication is not website visibility. This panel never retries Save/Publish/Withdraw,
starts a build, triggers dispatch or releases a delivery lock.

## Browser client provenance

Status uses a separately reviewed four-file browser bundle at
src/vendor/civicpulse-api-status-local. Source API commit:
be555d9a13ee1c0ca1640c32acbd4d0109175afc. Independent manifest SHA256:
512981bd156a88e9a1a3757ff8ca3e3c1edebd662ae6c94f2830ef8bcbff6e3b.
Before copying, Web independently checked that manifest, all three payload hashes,
exact four regular/no-link files and exact Git source bytes. Existing v1 browser and
M2a snapshot vendors remain unchanged. There are no server helpers/dependencies here.
The client exposes existing cms_publication_status/cms_record_publication_status only
for this feature; no new RPC was invented. Use the same guarded successful-JSON fetch,
current session token and bounded read deadline as other CMS reads. Non2xx ApiError
status/code metadata is preserved. Unsafe raw numerics reject before native parsing;
all status revisions/generations remain canonical decimal strings, including >2^53.

## Availability and truthful state

Local-source builds make zero status RPCs and show refresh not enabled. A missing RPC
(PGRST202/42883) also shows not enabled; other failures show unavailable/unknown and
clear the current verification claim. Hosted v1 has not been enabled or migrated by
this work. No status payload is proof of current provider behavior beyond the API's
stored qualified verification. The live deployment is unchanged.

The exact record states are unknown, pending_publication, pending_removal, live and
absent. Live means the API revision matches the last verified same-epoch inventory,
not the draft text. Withdrawal may be pending removal while a prior verified revision
remains. Failure/paused/global job state is displayed separately from verified content.
An active job remains explicitly visible even when state=live or content lag=0;
source-only delivery and terminal reconciliation may still be pending. The accepted
public wire has NO external_authority field, so this UI does not assert lock clearance.
Last verified epoch/generation/source and observed time qualify the display.

Unknown-first runtime validation checks exact shapes/enums, epoch coherence, canonical
counters, selected published revision and declared record-state consistency. Rewound
or older observations and mismatched epochs/revisions cannot claim current live state.
An epoch/baseline change requires a new authoritative record selection/reload; repeated
status refresh does not replay a CMS action. Status errors never fail a successful
mutation or clear a receipt/unknown-write lock. Same-user role uncertainty, actual
signout/revocation/user switch and record switch invalidate/clear status separately
from the existing editor preservation/confidentiality rules; late responses discard.

## Bounded checks and validation scope

Only verified staff in explicit CMS-source mode can read status. One pair is in
flight at a time. Automatic checks are every30seconds while visible, at most ten per
bound context; errors stop automatic checks. Manual Refresh checks status only.
Hidden tabs do not start checks. Context changes invalidate pending results.

Developer Node22 tests cover pending->live, removal->absent, failure with prior-live,
unknown/no retry, paused/active job and source-only lag0, >2^53 strings, epoch/rewind,
outage/auth denial, out-of-order/late results and capped visibility polling. Actual
vendored raw transport tests cover string counters, unsafe numeric rejection without
retry and non2xx40001 classification. The actual shipped admin controller test verifies
local zero RPC, successful Save despite status outage, and a successful status refresh
that cannot unlock an uncertain Save. The normal local validation script includes this
suite. Browser validation must use an explicitly labelled LOCAL MOCK on its own origin;
no hosted session/data/role changes, live M0 recovery or deployment is authorized.
