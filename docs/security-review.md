# CivicPulse security review — M1 foundation

Reviewed 2026-10-16 by CP-Security. This is an independent read-only review of the local source and architecture, not approval for hosted migration, provisioning, bootstrap, or production rollout.

## Reviewed baseline and limits

- API commits: `84b8ce387dd56cc3eef7775823075306a431d3d8`, `8881318fc03d397e28a826b3c1f85e2ed0bec7bf`, `8b95b89a5a75d050508fe3250b043c4eda8fb6f1`.
- Web commits: `5b5235ab978023d3e15fc72d3b15784aba20ae00`, `7a336e09e056ebfe25c02dbf95802550757c3461`, architecture `539792bd9aef5eca165800cfcc14436bd3ef7e65` and clarification `01ac934`.
- Uncommitted web snapshot consumer and tests were read only as a moving preliminary delta. The API additive `20261016203213_publication_generation_manifest.sql` was zero bytes at this checkpoint. Neither is an accepted M2 implementation. No hosted exploit attempt, production mutation, or credential use was performed. Authenticated browser role flows and live Auth settings were not verified.

## Findings, ordered by severity

### Medium — Publish can act on content different from what the reviewer sees (confirmed, open)

**Evidence:** `civicpulse-web/src/scripts/admin.ts:63-82, 243-255, 291-299`. The Publish handler accepts syntactically valid textarea JSON and an unchanged `expectedRevision`, then calls `api.publish(kind,id,expectedRevision)`. The API publishes the *saved* draft payload at that revision (`civicpulse-api/supabase/migrations/20261016195541_civicpulse_content_api.sql:231-246`), not the current textarea value. After Save, a reviewer can change the textarea without saving and click Publish, believing those visible changes are included. The database revision guard prevents concurrent publication but does not bind the reviewed payload shown in this browser.

**Preconditions/impact:** An administrator edits a loaded draft after saving, then publishes before another save. The published content differs from the on-screen review. This is an integrity and review-control failure, not an editor-to-admin authorization bypass.

**Remediation/owner:** Web-Dev should bind Publish to an immutable saved `(kind,id,revision,payload)` baseline; disable Publish for dirty, invalid, or conflicted input and repeat the check in the handler. Require an explicit Save and review after any edit. Keep the API revision check. Lead requested a separate `fix(admin)` commit. Closure requires a regression showing an unsaved modification cannot invoke the publish RPC, plus independent review of the fix commit. Architect clarification `01ac934` is documentation, not closure.

### Medium — `addressPrivate` does not by itself protect the address (confirmed contract behavior; conditional cutover blocker)

**Evidence:** The API only uses the flag to reject coordinates (`civicpulse-api/supabase/migrations/20261016195541_civicpulse_content_api.sql:193-211`). It stores the full event payload in `civicpulse.published` and exposes that payload through `public.content` (`:83-95, 239-246`). The web event component renders `event.address` (`civicpulse-web/src/components/EventItem.astro:12`), and ICS generation puts it in `LOCATION` (`civicpulse-web/src/lib/events.ts:58-60`). `docs/api.md:21-23` says current private-address sources use public signup placeholders; this review found no current private address leak.

**Preconditions/impact:** A future staff draft includes an actual private address while marking `addressPrivate=true`, and an administrator publishes it. The raw API payload and static outputs can disclose the address even if map coordinates are suppressed. Hiding only the page field would leave the raw API and downloaded artifacts exposed.

**Remediation/owners:** API-Dev, Web-Dev, and CP-Architect should agree and implement an authoritative publication projection or validation/redaction rule that preserves private draft/source evidence but guarantees public-safe address and related location fields. Review compatibility with current placeholder records. Closure requires a synthetic sentinel private-address test across raw API payload, GeoJSON, map/directions, static artifact, and ICS; document that arbitrary free-text prose cannot be assumed redacted.

### Medium — CMS GeoJSON source links need one URL policy across renderers (preliminary uncommitted integration finding)

**Evidence:** The uncommitted CMS map path loads published layer features into existing popups. `civicpulse-web/src/scripts/map.ts:87,107` assigns `properties.sourceUrl` directly to anchor `href` for `recreation-centers` and `libraries`. The newly changed `src/lib/official-map-popup.ts:9-18` validates HTTP(S) for general CMS layers, but those two branches run first. The API accepts arbitrary feature properties while validating geometry (`civicpulse-api/supabase/migrations/20261016195541_civicpulse_content_api.sql:252-275`).

**Preconditions/impact:** An administrator publishes a GeoJSON feature with a crafted source URL in one of those layer IDs, and a resident clicks its source link. A script URL can execute in the site origin. This requires an admin-reviewed publication or compromised source content; it is not an anonymous write path. Existing local data was not shown to contain such a URL.

**Remediation/owner:** Web-Dev should route every data-derived link through a shared absolute HTTP(S) parser and omit invalid links. API-Dev should consider validating source URL fields at publication. Test `javascript:`, `data:`, protocol-relative, malformed, and valid HTTP(S) values against the built CMS snapshot. Reassess against the final committed consumer; do not treat the moving local delta as a released defect.

## M1 controls verified in source

- `civicpulse.members` uses live database membership and own-row RLS; draft/history read policies require staff (`20261016195541_civicpulse_content_api.sql:8-23, 73-95`). Published content and features are intentionally public. No client table-write grant is present.
- `save_draft`, `publish`, and `withdraw` are privileged implementations with `search_path = ''`, role checks, serialized writes, and expected-revision checks (`:99-135, 231-330`). The public wrappers grant authenticated execution only. `20261016195619_restrict_platform_trigger_execution.sql:1-7` removes excessive platform trigger execute grants. These are source observations; hosted grants and policies still need verification after migrations.
- Browser CMS code uses one Supabase client with a public URL and publishable key (`civicpulse-web/src/lib/cms-client.ts:1-15`); its token is retrieved from the session (`src/scripts/admin.ts:23-33`) and role display comes from `cms_role` (`:185-210`). The database remains the authorization boundary. Draft and error text use `textContent`, and Astro escapes event text in normal markup.
- The vendored client and type SHA-256 values exactly match both `src/vendor/civicpulse-api/manifest.json` and the pinned API commit `8b95b89`; no web runtime dependency on the sibling API checkout was found.
- Resident event/map content selects a build-time snapshot, and local content remains the default (`civicpulse-web/src/lib/events.ts:20-22`, `src/data/maps.ts:3-4`). The public site does not require a resident Supabase session. This verifies code structure, not the future exporter or outage recovery pipeline.

## Design gaps and production blockers, not claims of current exploitation

1. **M2 API contract is pending.** Review a nonempty committed generation/epoch/outbox/manifest migration and SQL tests before any hosted additive migration. Check exact A/pages/B inventory, zero-kind/layer and deliberate removal semantics, immutable generation binding, save-versus-publish behavior, auth/grants for each `SECURITY DEFINER` function, search paths, runner/dispatcher/reconciler/operator role separation, generic transition RPC bypass, leases/fences, unknown upload lockout, restore epoch/baseline and all-empty approval binding. No CI operator credential should exist.
2. **M2 web exporter is pending.** Verify bounded pages, exact counts/IDs/revisions and feature counts, manifest A/B equality, secure staging paths and cleanup, symlink/path traversal protection, failed-export nonzero exit without local fallback, immutable snapshot activation, no stale files after withdrawal, safe 404/410 behavior, and source/hash binding. A failed last layer or missing final page must leave the previous active snapshot and release intact.
3. **M3 delivery is pending.** Inspect actual workflow and configured protections before activation: trusted protected `main` SHA, pinned actions/dependencies, no PR secret exposure, read-only default token, fixed Pages project/account/branch, separate minimal runner/dispatcher/reconciler credentials, private artifact bucket and retained immutable artifact/receipt. Require sole production uploader and a repository-wide `cancel-in-progress:false` concurrency group. A DB lease/fence cannot stop an external Pages uploader; recovery must prove old CI and Pages operations terminal and reconcile the live marker. Verify initial legacy release marker transition, restore-state rewind, rollback/withdrawal safety and production bootstrap against an exact reviewed inventory.
4. **Hosted Auth and operations are unverified.** Check redirect allowlist, signup/provider policy, leaked-password protection, initial membership assignment and revocation behavior, session lifecycle, secret storage, backup/restore, recovery drills, alert ownership and artifact retention. Existing hosted v1 does not establish these controls. No new hosted migration, content import/publication, automated deploy or credential provisioning should proceed on this report alone.

Acceptance for the M1 checkpoint: close the two CMS cutover findings with committed fixes and tests, re-review the final snapshot consumer and API publication semantics, then review M2 and M3 at their actual commit hashes. Static resident pages must still build and serve through API outages. Security review remains required for material auth, grants, workflow, or snapshot changes.
