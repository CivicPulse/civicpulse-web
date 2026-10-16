import { getCmsSupabase } from '../lib/cms-client';
import { canPublishReviewedDraft, publishReviewedDraft } from '../lib/admin-publish-gate.mjs';
import { cmsRefreshStatus } from '../lib/cms-refresh-status';
import { ApiError, createCivicPulseClient } from '../vendor/civicpulse-api/client.mjs';
import type { Tables } from '../vendor/civicpulse-api/database.types';

type Kind = 'organization' | 'calendar' | 'event' | 'layer' | 'map';
type Role = 'editor' | 'admin';
type Draft = Tables<'cms_drafts'>;
type Published = Tables<'content'>;
type DraftSummary = { kind: string | null; id: string | null; revision: number | null; updated_at: string | null; name: string | null; title: string | null };
const refreshStatus = cmsRefreshStatus(import.meta.env.PUBLIC_CONTENT_SOURCE);
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const loginPanel = byId<HTMLElement>('login-panel');
const workspace = byId<HTMLElement>('workspace');
const accessPanel = byId<HTMLElement>('access-panel');
const configNotice = byId<HTMLElement>('config-notice');
const loginMessage = byId<HTMLParagraphElement>('login-message');
const editorMessage = byId<HTMLDivElement>('editor-message');
const conflictPanel = byId<HTMLElement>('conflict-panel');
const kindFilter = byId<HTMLSelectElement>('kind-filter');
const editorKind = byId<HTMLSelectElement>('editor-kind');
const recordId = byId<HTMLInputElement>('record-id');
const payloadInput = byId<HTMLTextAreaElement>('payload');
const recordList = byId<HTMLUListElement>('record-list');
const supabase = (() => {
  try { return getCmsSupabase(); }
  catch { configNotice.hidden = false; return null; }
})();

let api: ReturnType<typeof createCivicPulseClient> | null = null;
if (supabase) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  api = createCivicPulseClient({ url, publishableKey, accessToken: async () => (await supabase.auth.getSession()).data.session?.access_token });
}

let role: Role | null = null;
let currentDraft: Draft | null = null;
let currentPublished: Published | null = null;
let expectedRevision = 0;
let listOffset = 0;
let hasMore = false;
let loadingList = false;
let authRun = 0;
let editorRun = 0;
let saving = false;
let publishing = false;

function showMessage(target: HTMLElement, message: string, kind: 'error' | 'success' | 'info' = 'info') {
  target.textContent = message;
  target.className = `form-message ${kind === 'info' ? '' : kind}`.trim();
  target.hidden = false;
}
function hideMessage(target: HTMLElement) { target.hidden = true; target.textContent = ''; }
function userMessage(error: unknown) {
  const code = error instanceof ApiError ? error.code : (error as { code?: string } | null)?.code;
  if (code === '40001') return 'This draft changed after you opened it. Your unsaved text is preserved below so you can compare it with the latest saved revision.';
  if (code === '42501') return 'Access was denied. Your staff membership may have changed; refresh your role or ask an administrator.';
  if (code === '23503') return 'A referenced organization, calendar, or layer is missing or cannot be changed yet. Resolve the dependency and try again.';
  if (code === 'P0002') return 'The selected record or published layer no longer exists. Refresh the record list.';
  if (['22023', '22007', '22008', '23514'].includes(code || '')) {
    const detail = error instanceof Error ? error.message : '';
    return detail ? `The API rejected this content: ${detail}` : 'The API rejected this content. Review required fields, dates, references, and geometry, then try again.';
  }
  if (error instanceof Error && error.message) return `Could not complete the request: ${error.message}`;
  return 'Could not complete the request. Check the connection and try again.';
}
function parsePayload(showErrors = true) {
  let parsed: unknown;
  try { parsed = JSON.parse(payloadInput.value); }
  catch (error) {
    if (showErrors) showMessage(editorMessage, `JSON syntax error: ${(error as Error).message}`, 'error');
    return null;
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    if (showErrors) showMessage(editorMessage, 'The payload must be a JSON object.', 'error');
    return null;
  }
  if ((parsed as Record<string, unknown>).id !== recordId.value.trim()) {
    if (showErrors) showMessage(editorMessage, 'The payload id must exactly match the Record ID field.', 'error');
    return null;
  }
  if (!recordId.value.trim()) {
    if (showErrors) showMessage(editorMessage, 'Enter a record ID.', 'error');
    return null;
  }
  return parsed as Record<string, unknown>;
}
function labelFor(row: Draft | DraftSummary) {
  const value = (('payload' in row && row.payload) || {}) as Record<string, unknown>;
  return String(('name' in row && row.name) || ('title' in row && row.title) || value.name || value.title || row.id || 'Untitled record');
}
function clearEditor() {
  editorRun++;
  currentDraft = null; currentPublished = null; expectedRevision = 0;
  saving = false; publishing = false;
  recordId.value = ''; payloadInput.value = '{\n  "id": "",\n  "name": ""\n}';
  editorKind.disabled = false; recordId.disabled = false;
  byId('editor-summary').textContent = 'New draft · revision 0';
  byId('revision-label').textContent = 'New';
  byId<HTMLButtonElement>('publish').hidden = true;
  byId<HTMLButtonElement>('withdraw').hidden = true;
  byId<HTMLElement>('history-panel').hidden = true;
  conflictPanel.hidden = true; hideMessage(editorMessage);
  updateSaveState();
}
function updateSaveState() {
  const parsed = parsePayload(false);
  byId<HTMLButtonElement>('save-draft').disabled = !role || !parsed || !recordId.checkValidity() || saving || publishing;
  const publish = byId<HTMLButtonElement>('publish');
  publish.disabled = !canPublishReviewedDraft({
    role, draft: currentDraft, kind: editorKind.value, id: recordId.value.trim(), expectedRevision,
    payloadText: payloadInput.value, conflicted: !conflictPanel.hidden, busy: saving || publishing,
    alreadyPublished: currentPublished?.revision === currentDraft?.revision,
  });
  payloadInput.disabled = publishing;
}
function clearRecordList() {
  recordList.replaceChildren(); listOffset = 0; hasMore = false;
  byId<HTMLButtonElement>('load-more').hidden = true;
}
async function loadDrafts(append = false) {
  if (!supabase || !role || loadingList) return;
  const sessionRequest = authRun;
  const roleRequest = role;
  loadingList = true;
  const kind = kindFilter.value as Kind;
  const offset = append ? listOffset : 0;
  if (!append) clearRecordList();
  byId('record-status').textContent = 'Loading drafts…';
  try {
    const { data, error } = await supabase.from('cms_drafts').select('kind,id,revision,updated_at,name:payload->>name,title:payload->>title')
      .eq('kind', kind).order('id', { ascending: true }).range(offset, offset + 49);
    if (error) throw error;
    if (sessionRequest !== authRun || roleRequest !== role) return;
    const rows = (data || []) as DraftSummary[];
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const item = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button'; button.className = 'record-button'; button.dataset.id = row.id || '';
      button.setAttribute('aria-current', currentDraft?.id === row.id ? 'true' : 'false');
      const name = document.createElement('span'); name.className = 'record-name'; name.textContent = labelFor(row);
      const meta = document.createElement('span'); meta.className = 'record-meta'; meta.textContent = `${row.id} · revision ${row.revision ?? 0}`;
      button.append(name, meta); button.addEventListener('click', () => void selectDraft(kind, row.id || ''));
      item.append(button); fragment.append(item);
    }
    recordList.append(fragment);
    listOffset = offset + rows.length; hasMore = rows.length === 50;
    byId<HTMLButtonElement>('load-more').hidden = !hasMore;
    byId('record-status').textContent = rows.length ? `${listOffset} ${kind} draft${listOffset === 1 ? '' : 's'} loaded.` : 'No drafts of this type yet. Start a new draft.';
  } catch (error) {
    if (sessionRequest === authRun && roleRequest === role) byId('record-status').textContent = userMessage(error);
  } finally { if (sessionRequest === authRun) loadingList = false; }
}
async function loadHistory(kind: Kind, id: string) {
  const editorRequest = editorRun; const sessionRequest = authRun;
  const panel = byId<HTMLElement>('history-panel'); const list = byId<HTMLOListElement>('history-list');
  list.replaceChildren(); panel.hidden = false;
  const { data, error } = await supabase!.from('cms_history').select('action,actor,occurred_at,revision,sequence')
    .eq('kind', kind).eq('id', id).order('sequence', { ascending: false }).limit(10);
  if (error) throw error;
  if (editorRequest !== editorRun || sessionRequest !== authRun) return;
  for (const row of data || []) {
    const item = document.createElement('li');
    const when = row.occurred_at ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.occurred_at)) : 'Time unavailable';
    item.textContent = `${row.action || 'Changed'} · revision ${row.revision ?? '—'} · ${when}`;
    list.append(item);
  }
  if (!list.children.length) { const item = document.createElement('li'); item.textContent = 'No activity is recorded yet.'; list.append(item); }
}
async function refreshPublished(kind: Kind, id: string, editorRequest: number, sessionRequest: number) {
  const { data, error } = await supabase!.from('content').select('*').eq('kind', kind).eq('id', id).maybeSingle();
  if (error) throw error;
  if (editorRequest !== editorRun || sessionRequest !== authRun) return;
  currentPublished = data as Published | null;
  const publish = byId<HTMLButtonElement>('publish'); const withdraw = byId<HTMLButtonElement>('withdraw');
  publish.hidden = role !== 'admin'; withdraw.hidden = role !== 'admin';
  publish.textContent = currentPublished ? 'Publish draft update' : 'Publish reviewed draft';
  withdraw.disabled = role !== 'admin' || !currentPublished;
  const draftRevision = currentDraft?.revision ?? 0;
  const publishedRevision = currentPublished?.revision ?? null;
  byId('revision-label').textContent = currentPublished
    ? `Draft r${draftRevision} · Published r${publishedRevision}${draftRevision === publishedRevision ? ' · current' : ' · unpublished changes'}`
    : `Draft r${draftRevision} · Not published`;
  publish.disabled = role !== 'admin' || !currentDraft || !parsePayload(false) || (currentPublished?.revision === draftRevision);
  withdraw.title = currentPublished ? `Withdraw the published revision ${publishedRevision}.` : 'This record has no live publication.';
}
async function selectDraft(kind: Kind, id: string) {
  const editorRequest = ++editorRun;
  const sessionRequest = authRun;
  currentDraft = null; currentPublished = null; expectedRevision = 0;
  saving = false; publishing = false;
  editorKind.value = kind; recordId.value = id;
  editorKind.disabled = true; recordId.disabled = true;
  byId<HTMLButtonElement>('publish').disabled = true;
  updateSaveState();
  hideMessage(editorMessage); conflictPanel.hidden = true;
  try {
    const row = await api!.getDraft(kind, id) as Draft | null;
    if (editorRequest !== editorRun || sessionRequest !== authRun) return;
    if (!row) { byId('record-status').textContent = 'This draft was removed. Refresh the list.'; return; }
    currentDraft = row; expectedRevision = row.revision || 0;
    editorKind.value = kind; editorKind.disabled = true;
    recordId.value = row.id || ''; recordId.disabled = true;
    payloadInput.value = JSON.stringify(row.payload, null, 2);
    byId('editor-summary').textContent = `${labelFor(row)} · ${kind}`;
    byId<HTMLButtonElement>('save-draft').textContent = 'Save draft';
    document.querySelectorAll('.record-button').forEach(button => button.setAttribute('aria-current', (button as HTMLButtonElement).dataset.id === id ? 'true' : 'false'));
    await refreshPublished(kind, id, editorRequest, sessionRequest);
    if (editorRequest !== editorRun || sessionRequest !== authRun) return;
    await loadHistory(kind, id);
    if (editorRequest !== editorRun || sessionRequest !== authRun) return;
    updateSaveState();
    if (location.hash !== '#editor') location.hash = 'editor';
  } catch (error) {
    if (editorRequest === editorRun && sessionRequest === authRun) showMessage(editorMessage, userMessage(error), 'error');
  }
}
async function refreshRole(session: { user: { email?: string } } | null) {
  const run = ++authRun;
  role = null;
  clearEditor();
  clearRecordList();
  loadingList = false;
  workspace.hidden = true; accessPanel.hidden = true; loginPanel.hidden = !!session; loginMessage.hidden = true;
  byId('access-signout').hidden = !session;
  if (!session || !supabase || !api) return;
  accessPanel.hidden = false; byId('access-heading').textContent = 'Checking staff access'; byId('access-message').textContent = 'Confirming your current membership with the Civic Pulse API…';
  byId('staff-email').textContent = session.user.email || 'Signed-in staff member';
  try {
    const result = await api.role();
    if (run !== authRun) return;
    if (result !== 'editor' && result !== 'admin') {
      byId('access-heading').textContent = 'You do not have CMS access';
      byId('access-message').textContent = 'This account is signed in, but it is not an editor or administrator. Ask a Civic Pulse administrator to review your membership.';
      return;
    }
    role = result;
    accessPanel.hidden = true; workspace.hidden = false;
    byId('role-label').textContent = result === 'admin' ? 'Administrator' : 'Editor';
    byId('publishing-nav').hidden = result !== 'admin'; byId('publishing').hidden = result !== 'admin';
    byId<HTMLButtonElement>('new-draft').hidden = false;
    await loadDrafts();
  } catch (error) {
    if (run !== authRun) return;
    byId('access-heading').textContent = 'Could not confirm CMS access';
    byId('access-message').textContent = userMessage(error);
  }
}

if (supabase && api) {
  byId<HTMLFormElement>('login-form').addEventListener('submit', async event => {
    event.preventDefault(); hideMessage(loginMessage);
    const email = byId<HTMLInputElement>('email').value.trim(); const password = byId<HTMLInputElement>('password').value;
    const button = byId<HTMLButtonElement>('login-form').querySelector('button')!; button.disabled = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) { showMessage(loginMessage, error instanceof Error ? error.message : 'Sign in failed. Check your credentials and try again.', 'error'); }
    finally { button.disabled = false; }
  });
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) { showMessage(loginMessage, error.message, 'error'); loginPanel.hidden = false; }
  else await refreshRole(session);
  supabase.auth.onAuthStateChange((_event, session) => { void refreshRole(session); });
}

async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) showMessage(editorMessage, error.message, 'error');
}
byId<HTMLButtonElement>('signout').addEventListener('click', () => void signOut());
byId<HTMLButtonElement>('access-signout').addEventListener('click', () => void signOut());
kindFilter.addEventListener('change', () => { clearEditor(); editorKind.value = kindFilter.value; void loadDrafts(); });
byId<HTMLButtonElement>('load-more').addEventListener('click', () => void loadDrafts(true));
byId<HTMLButtonElement>('new-draft').addEventListener('click', () => { clearEditor(); editorKind.value = kindFilter.value; recordId.focus(); });
editorKind.addEventListener('change', () => { kindFilter.value = editorKind.value; clearRecordList(); void loadDrafts(); });
recordId.addEventListener('input', updateSaveState); payloadInput.addEventListener('input', updateSaveState);

byId<HTMLFormElement>('editor-form').addEventListener('submit', async event => {
  event.preventDefault(); hideMessage(editorMessage);
  const parsed = parsePayload(); if (!parsed) return;
  if (!api || !role) { showMessage(editorMessage, 'Your CMS session is unavailable. Sign in again.', 'error'); return; }
  const editorRequest = editorRun; const sessionRequest = authRun;
  const kind = editorKind.value as Kind; const id = recordId.value.trim(); const revision = expectedRevision;
  saving = true; updateSaveState();
  try {
    const savedRevision = await api.saveDraft(kind, parsed, revision) as number;
    if (editorRequest !== editorRun || sessionRequest !== authRun || editorKind.value !== kind || recordId.value.trim() !== id) return;
    expectedRevision = savedRevision;
    currentDraft = { kind, id, revision: savedRevision, payload: parsed as import('../vendor/civicpulse-api/database.types').Json, updated_at: new Date().toISOString(), updated_by: null };
    byId('editor-summary').textContent = `${String(parsed.name || parsed.title || recordId.value)} · ${editorKind.value}`;
    showMessage(editorMessage, `Draft saved to the Civic Pulse API as revision ${savedRevision}. Review the saved payload before publishing. Resident pages are unchanged. ${refreshStatus}`, 'success');
    conflictPanel.hidden = true;
    saving = false; updateSaveState();
    await refreshPublished(kind, id, editorRequest, sessionRequest);
    if (editorRequest !== editorRun || sessionRequest !== authRun) return;
    await loadHistory(kind, id);
    if (editorRequest === editorRun && sessionRequest === authRun) await loadDrafts();
  } catch (error) {
    if (editorRequest !== editorRun || sessionRequest !== authRun) return;
    if (error instanceof ApiError && error.code === '40001') {
      const local = payloadInput.value;
      byId<HTMLTextAreaElement>('conflict-local').value = local;
      byId<HTMLTextAreaElement>('conflict-latest').value = 'The latest saved draft could not be loaded. Refresh the record before publishing.';
      byId('conflict-panel').dataset.revision = String(expectedRevision);
      conflictPanel.hidden = false;
      try {
        const latest = await api.getDraft(kind, id) as Draft | null;
        if (editorRequest !== editorRun || sessionRequest !== authRun) return;
        byId<HTMLTextAreaElement>('conflict-latest').value = latest ? JSON.stringify(latest.payload, null, 2) : 'This draft no longer exists.';
        byId('conflict-panel').dataset.revision = String(latest?.revision ?? 0);
      } catch { /* Keep the original editor text and show the API conflict. */ }
    }
    showMessage(editorMessage, userMessage(error), 'error');
  } finally {
    if (editorRequest === editorRun && sessionRequest === authRun) { saving = false; updateSaveState(); }
  }
});
byId<HTMLButtonElement>('keep-local').addEventListener('click', () => {
  expectedRevision = Number(byId('conflict-panel').dataset.revision || 0);
  try {
    const latest = JSON.parse(byId<HTMLTextAreaElement>('conflict-latest').value) as Record<string, unknown>;
    if (currentDraft) currentDraft = { ...currentDraft, revision: expectedRevision, payload: latest as import('../vendor/civicpulse-api/database.types').Json };
  } catch { currentDraft = null; }
  conflictPanel.hidden = true;
  showMessage(editorMessage, `Your text is unchanged. The save will target revision ${expectedRevision}; click Save draft again to confirm.`, 'info');
  updateSaveState();
});
byId<HTMLButtonElement>('load-latest').addEventListener('click', () => {
  const latest = byId<HTMLTextAreaElement>('conflict-latest').value;
  try {
    const parsed = JSON.parse(latest) as Record<string, unknown>;
    payloadInput.value = JSON.stringify(parsed, null, 2);
    expectedRevision = Number(byId('conflict-panel').dataset.revision || 0);
    if (currentDraft) currentDraft = { ...currentDraft, revision: expectedRevision, payload: parsed as import('../vendor/civicpulse-api/database.types').Json };
    conflictPanel.hidden = true; showMessage(editorMessage, `Loaded the latest saved revision ${expectedRevision}. Review it; any change must be saved before publishing.`, 'success');
    updateSaveState();
  } catch { showMessage(editorMessage, 'The latest draft is no longer available. Refresh the record list.', 'error'); }
});
byId<HTMLButtonElement>('publish').addEventListener('click', async () => {
  if (role !== 'admin' || !currentDraft || !api) return;
  const publishState = {
    role, draft: currentDraft, kind: editorKind.value, id: recordId.value.trim(), expectedRevision,
    payloadText: payloadInput.value, conflicted: !conflictPanel.hidden, busy: saving || publishing,
    alreadyPublished: currentPublished?.revision === currentDraft?.revision,
  };
  if (!canPublishReviewedDraft(publishState)) {
    showMessage(editorMessage, 'Publish is available only for the exact saved payload shown at the matching revision. Save your changes, resolve the conflict, and review the saved payload first.', 'error');
    updateSaveState(); return;
  }
  const kind = editorKind.value as Kind; const id = recordId.value.trim();
  const editorRequest = editorRun; const sessionRequest = authRun;
  publishing = true; updateSaveState();
  try {
    const invoked = await publishReviewedDraft(publishState,
      (publishKind, publishId, publishRevision) => api!.publish(publishKind as Kind, publishId, publishRevision));
    if (!invoked) return;
    if (editorRequest !== editorRun || sessionRequest !== authRun || role !== 'admin') return;
    showMessage(editorMessage, `Published to the Civic Pulse API. Resident pages are unchanged. ${refreshStatus}`, 'success');
    publishing = false; updateSaveState();
    await selectDraft(kind, id); await loadDrafts();
  } catch (error) {
    if (editorRequest === editorRun && sessionRequest === authRun) showMessage(editorMessage, userMessage(error), 'error');
  } finally {
    if (editorRequest === editorRun && sessionRequest === authRun) { publishing = false; updateSaveState(); }
  }
});
byId<HTMLButtonElement>('withdraw').addEventListener('click', async () => {
  if (role !== 'admin' || !currentPublished || !api) return;
  if (!confirm(`Withdraw the published ${editorKind.value} “${recordId.value}”? Its draft and audit history will remain.`)) return;
  const button = byId<HTMLButtonElement>('withdraw'); button.disabled = true;
  try {
    await api.withdraw(editorKind.value as Kind, recordId.value, currentPublished.revision || 0);
    showMessage(editorMessage, `Publication withdrawn from the Civic Pulse API. Resident pages are unchanged. ${refreshStatus}`, 'success');
    await selectDraft(editorKind.value as Kind, recordId.value); await loadDrafts();
  } catch (error) { showMessage(editorMessage, userMessage(error), 'error'); }
  finally { updateSaveState(); }
});

if (!supabase) { loginPanel.hidden = true; accessPanel.hidden = true; }
