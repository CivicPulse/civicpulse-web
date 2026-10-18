# Revised live ADMIN assurance plan

This is the bounded steps 1–6 execution plan awaiting scoped lead/Security review,
not a record of passing live tests. Current release is `4b1313f`, deployment
`d3314a34-8cba-49a7-bbe5-f013f72f8bfb`. Public resident source stays local.

## Scope and preconditions

Use the existing user-controlled Administrator session and only the three exact
IDs from [the original ledger](admin-browser-qa.md), run
`1ade89ae-0a43-4818-a715-a2e2a8fc0531`. No new fixture set, real resident data,
mass import, credential extraction, user creation or membership changes. API
owns independent read-only pre/post checks. Browser alone owns mutations.

Reconcile current draft/public/history first against API fresh read-only baseline:
organization draft/public 1/1 (payload hash prefix `ba0eb15a`), calendar 1/1
(`36364cdb`), event draft 5 (`fe11411c`) / public 1 (`791e12c8`). There are
3 drafts, 3 publications, 0 features, 1 membership and 10 history entries
(7 save, 3 publish, no withdrawals). Prefixes aid human cross-check only; actual
comparisons use the complete returned canonical payloads and full hashes.
Stop on any unexplained change. Preserve the
old unknown withdrawal outcome in history; no absent audit is proof of its HTTP
result. No pending old browser operation may be reused or implicitly replayed.
Any later withdrawal is a separately recorded intentional action after review of
the authoritative current publication and explicit approved ledger step.

## Ordered checks

1. Verify origin/session/Administrator, reload, five-kind lists, exact source and
   revision labels. Read all three tuples/history; record evidence without tokens.
2. Edit the event through labelled fields, preserve canonical private placeholders,
   source URL, timezone offset and unknown metadata. Verify dirty/invalid Publish
   disabled, including handler coverage supplied by local tests. Open another
   same-user tab/refocus and verify unsaved text survives live role revalidation.
3. Capture the complete authoritative event draft 5 payload as baseline. Change
   TITLE ONLY to `Synthetic ADMIN MVP QA — revised editor save six`, expected
   revision 5 -> 6. Canonically compare ALL other properties to captured draft 5,
   including IDs, relations, source strings, private placeholders, absent/null
   geometry, timezone offsets and unknown metadata; no normalization/deletion.
   Save once. Record returned revision immediately, including known success
   versus failed follow-up reads. Do not repeat on timeout or missing notice;
   reconcile before proceeding. Reload and review the entire saved payload.
4. Load authoritative draft 6 in BOTH tabs. In the first tab change TITLE ONLY
   to `Synthetic ADMIN MVP QA — revised editor conflict seven`, canonically
   compare every other property to captured draft 5, and save expected 6 -> 7
   once. Independently confirm revision 7 before the second submission. In the
   second tab attempt a stale save at expected revision 6 ONCE, using the safe
   revision-6 title/payload; capture HTTP 40001 classification/status and visible
   conflict. Never capture Auth/request headers. API verifies no overwrite. If result is unknown, stop; do not manufacture another
   conflict attempt. Exercise explicit latest/local recovery without auto-saving.
5. Review the COMPLETE canonical safe draft 7 and exact title-seven receipt,
   then publish revision 7 ONCE. If this exact path succeeds, history is now 13
   entries (saves 6 and 7 plus publish 7 after the original 10). Record the
   publication receipt and independently verify payload/history.
   This affects API only; never claim resident refresh.
6. Perform NEW intentional withdrawals, not retries of the old unknown request:
   event current published 7 -> calendar current 1 -> organization current 1.
   Before EACH call, API independently confirms exact current revision/payload,
   preceding removal/history and zero remaining published dependants. Record each
   returned receipt before proceeding. A complete exact path ends at 16 history
   entries (3 withdrawals), 3 retained drafts, public 0/features 0/member 1.
   This public-zero QA result is NOT a CMS bootstrap or all-empty release approval. Stop on
   conflict, concurrent change or unknown outcome. Retain drafts/history; no
   broad deletion or prefix cleanup. Dependency withdrawals only follow confirmed
   removal of their exact dependants.

Excluded: signout, forced expiry, user creation, Auth/member changes, editor/nonstaff
live-role tests and real resident content. Keep the user session. Actual-controller
fixtures cover role/revocation/identity-loss behavior locally; those are not claims
of hosted role coverage.

The final coordinated plan must identify included steps and exact baseline
revisions before execution. Any ambiguous mutation locks further writes; inspect
existing UI/network outcome and API state, never silently retry. Existing public
API-outage smoke and local controller regressions remain distinct evidence.
