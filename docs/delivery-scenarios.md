# Delivery scenario design fixtures

These are acceptance inputs under [parent runner handoff](../../docs/architecture-runner-handoff.md)
and [MADR 0001](../../docs/adr/0001-static-resident-publication.md), not executable
machine mocks, actual API responses, provider evidence or upload authorization.
The synthetic [JSON fixtures](../tests/fixtures/delivery-design.json) preserve
already specified claim identity fields. Observation/assertion text is design
language, not a proposed RPC schema. No adapter consumes these fixtures.

| Scenario ID | Required behavior for later frozen-contract tests |
| --- | --- |
| no-work | Only eligible, ready, already-live content and source can return null; no upload. |
| paused-bootstrap-baseline | Paused, unbootstrapped or unapproved baseline is an error, never successful no-work. |
| duplicate-wakeups | Same run/source returns its compatible active claim; another run cannot steal it. Run/attempt encoding awaits handoff. |
| source-only | Same content generation with a new approved source SHA creates a distinct release/claim; previous artifact remains retained. |
| same-source-retry | Byte-identical validated immutable snapshot may be reused; this does not grant upload authority. |
| stale-generation | A/pages/B or desired generation drift supersedes the old claim; new claim required, zero uploads from stale job. |
| stale-source | Approved main changes before deploy; old source cannot upload or silently rebind its claim. |
| expired-lease-fence | Expired/replaced ownership or stale fence denies transitions and upload; heartbeat cannot overwrite newer owner. |
| differing-epoch | Never compare generations across epochs; reset/unapproved baseline blocks upload. |
| total-empty | Current all-empty gate rejects even with bootstrap true; no environment escape. |
| preupload-validation | Invalid snapshot, artifact, provenance or freshness fails before provider call. |
| api-outage | Export/heartbeat/freshness/deploy-gate read error aborts; never local fallback; last successful production remains served. |
| known-provider-failure | Only a known terminal provider failure may release the deployment gate as failed. |
| unknown-provider-outcome | Timeout/crash/ambiguous upload retains lockout; no replacement upload. |
| lost-live-callback | A successful upload with lost finish callback stays unresolved until authenticated provider and marker reconciliation. |
| reconciliation-refusal | Active predecessor, stale/mismatching observations or ambiguous provider state cannot authorize takeover. |

Before executable adapter tests, API-Dev must freeze SQL signatures/result-error
types, run-plus-attempt encoding, state/evidence allowlists, lease/database-clock
semantics, grants/actual-role denials and reconcile observations in a commit and
separate vendor/type handoff. Status/private identity/pause foundation alone does
not provide claim, lease, fence, deploy, reconciliation or resume authority.
No live transport, database connection, credential loader or uploader is added.
