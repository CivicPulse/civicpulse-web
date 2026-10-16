# ADMIN MVP browser checkpoint — 2026-10-16

Live artifact: Web `d74a4a02564f283e8b831d1f12290e9945350fd1`, deployment
`bb7213e1-4891-479d-9c90-97fdf66d598b`, `https://www.civpulse.org/admin/`.
The 972-file artifact manifest SHA256 is
`39b1e18bbe12f967fc0870397c2aa0134a381bab8931087aeef8365d5ece20fd`.
Recovery deployment `2068dc72-fbd1-4f4f-9bee-ead229e50d7a` is retained.
Resident content remains local/static; CMS-to-site refresh is disabled.

## Actual connected-Chrome evidence

The user signed into the live origin with the existing administrator. Reload
restored Administrator access. All five content lists loaded. Organization and
calendar saves/publishes and private event save/publish succeeded, with exact
saved/published revision labels and activity history. An organization field not
exposed by a schema-specific form survived save/reload. Unsaved changed text and
invalid JSON disabled Publish; invalid JSON also disabled Save.

Only these three approved synthetic keys were used, after independent absence
checks, under run `1ade89ae-0a43-4818-a715-a2e2a8fc0531`:

| Kind | ID | Retained draft | Retained publication |
| --- | --- | --- | --- |
| organization | `admin-mvp-1ade89ae-0a43-4818-a715-a2e2a8fc0531-organization` | 1 | 1 |
| calendar | `admin-mvp-1ade89ae-0a43-4818-a715-a2e2a8fc0531-calendar` | 1 | 1 |
| event | `admin-mvp-1ade89ae-0a43-4818-a715-a2e2a8fc0531-event` | 5 | 1 |

The event public payload uses both canonical private placeholders, no coordinates,
example.org provenance and synthetic text. Invalid synthetic private draft 2 was
saved, but publication displayed the canonical-placeholder rejection. API-Dev and
Security independently confirmed public revision 1 and its payload hash unchanged,
no publish 2, no features, and only the expected save history. The message matches
the SQL 22023 branch; the HTTP error code itself was not captured.

Stale-save/conflict browser coverage is **unverified**: after known saves 3–5,
a stale save remained pending without feedback. API confirmed no save 6. Opening
another same-user tab also reset the first editor. A revision-1 event withdrawal
confirmation was accepted once, then the browser tool timed out on focus emulation.
No withdrawal audit was observed; request outcome remains **unknown**. It was not
retried, and dependent withdrawals were not attempted. All three safe synthetic
publications, drafts and history are retained. No account, membership or Auth
setting changed. Signout/expiry, hosted editor/nonstaff coverage and successful
withdrawal remain open. No password or session token was read/exported.

The deployed success notice was cleared by the subsequent same-record refresh.
Revision labels/history independently confirmed success; no publish was repeated
because a success selector timed out.

## Public checks, separate from authenticated coverage

Connected Chrome loaded the live map directory and enabled map selector with the
Supabase origin temporarily blocked in that public test tab. Calendar loaded and
search worked, with no reported console errors/warnings. The block was removed.
Aggregate ICS download matched the artifact byte-for-byte (585067 bytes).
Security independently checked deployment/static assets; calendar HTML differs
only through Cloudflare email protection. This is not proof of every outage or
browser scenario.

## Local functional follow-up (not deployed)

The controller defers Supabase Auth callbacks before membership requests, keeps
same-user unsaved content during token/refocus revalidation, and pauses editing
without discarding it on an unknown/transient membership failure. Confirmed
revocation, signout and identity replacement clear sensitive editing state.

A request deadline never retries a write. Unknown outcomes keep Save, Publish,
Withdraw and navigation blocked until an explicit same-record reload completes
both authoritative draft and publication reads. Failed, partial or stale reads
retain the lock and local text. Successful API action feedback survives the
following refresh; a failed refresh after a known write asks for reconciliation,
not another write.

`node tests/admin-controller.mjs` runs the actual TypeScript controller against
injected DOM/Auth/API fixtures: pending/failed/partial/stale reads, role failures,
revocation/identity changes, delayed writes, conflict recovery, metadata retention,
exact saved-payload gate and action feedback. These local fixtures do not close
unverified live browser flows or grant release approval for new bytes.
