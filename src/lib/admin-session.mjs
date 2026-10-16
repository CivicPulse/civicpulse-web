/** Supabase callbacks must return before work that may acquire its auth lock. */
export function deferredAuthRefresh(refresh, schedule = callback => setTimeout(callback, 0)) {
  return (_event, session) => { schedule(() => { void refresh(session); }); };
}

/** A same-user token/refocus event is not a new editing session. */
export function changesEditorSession(previousUserId, nextUserId) {
  return previousUserId !== nextUserId;
}
