import { canonicalJson } from './admin-publish-gate.mjs';

export function assertRecordIdentity(kind, id, draft, published) {
  for (const row of [draft, published].filter(Boolean)) {
    if (row.kind !== kind || row.id !== id || row.payload?.id !== id || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new Error('The API returned a different record identity or invalid revision. Editing remains paused.');
    canonicalJson(row.payload);
  }
  if (!draft) throw new Error('The saved draft could not be found. Your local text is unchanged.');
  if (published && (published.revision > draft.revision || (published.revision === draft.revision && canonicalJson(published.payload) !== canonicalJson(draft.payload)))) throw new Error('The draft and publication reads are inconsistent. Editing remains paused.');
}

/** @param {number|null} [previousPublishedRevision] */
export function makeActionReceipt(action, kind, id, draft, published, previousPublishedRevision = null) {
  const copy = row => row ? { revision: row.revision, payload: JSON.parse(canonicalJson(row.payload)) } : null;
  return { action, kind, id, draft: copy(draft), published: copy(published), previousPublishedRevision };
}

/** Exact known-result reconciliation, never an arbitrary >= revision check. */
export function inspectActionReceipt(receipt, draft, published, history) {
  const same = (expected, row) => expected === null ? row === null : !!row && expected.revision === row.revision && canonicalJson(expected.payload) === canonicalJson(row.payload);
  const actionRevision = receipt.action === 'withdraw' ? receipt.previousPublishedRevision : receipt.action === 'publish' ? receipt.published.revision : receipt.draft.revision;
  const auditMatches = history.some(row => row.action === receipt.action && row.revision === actionRevision);
  if (same(receipt.draft, draft) && same(receipt.published, published) && auditMatches) return { matches: true, superseded: false, message: '' };
  // A payload mismatch at the SAME revision is not a newer concurrent edit.
  const inconsistent = [ [receipt.draft, draft], [receipt.published, published] ].some(([expected, row]) => expected && row && expected.revision === row.revision && canonicalJson(expected.payload) !== canonicalJson(row.payload));
  const draftAdvanced = draft.revision > receipt.draft.revision;
  const publicationAdvanced = !!published && published.revision > (receipt.published?.revision ?? receipt.previousPublishedRevision ?? 0);
  const newerDraftAudited = !draftAdvanced || history.some(row => row.action === 'save' && row.revision === draft.revision);
  const newerPublicationAudited = !publicationAdvanced || history.some(row => row.action === 'publish' && row.revision === published.revision);
  // A truncated or stale activity page is never evidence that an action happened.
  const superseded = auditMatches && newerDraftAudited && newerPublicationAudited && !inconsistent && draft.revision >= receipt.draft.revision && (draftAdvanced || publicationAdvanced);
  return {
    matches: false, superseded,
    message: superseded
      ? 'A newer saved state supersedes this confirmed action. Review the complete newer state explicitly before making another change.'
      : 'The draft, publication or activity read does not match the confirmed action yet. Editing remains paused. Reload to check again; do not repeat the action.',
  };
}
