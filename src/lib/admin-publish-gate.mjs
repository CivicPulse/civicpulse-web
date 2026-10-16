/** Stable JSON text for comparing data values while ignoring object-key order. */
export function canonicalJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('JSON numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const object = value;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
  }
  throw new TypeError('Value is not JSON-compatible');
}

/** @param {{role:string|null,draft?:{kind?:string|null,id?:string|null,revision?:number|null,payload?:unknown}|null,kind:string,id:string,expectedRevision:number,payloadText:string,conflicted?:boolean,busy?:boolean,alreadyPublished?:boolean}} state */
export function canPublishReviewedDraft(state) {
  const { role, draft, kind, id, expectedRevision, payloadText, conflicted = false, busy = false, alreadyPublished = false } = state;
  if (role !== 'admin' || !draft || conflicted || busy || alreadyPublished || draft.kind !== kind || draft.id !== id) return false;
  if (draft.revision == null || Number(draft.revision) !== Number(expectedRevision)) return false;
  let edited;
  try { edited = JSON.parse(payloadText); } catch { return false; }
  if (!edited || typeof edited !== 'object' || Array.isArray(edited) || edited.id !== id) return false;
  try { return canonicalJson(edited) === canonicalJson(draft.payload); }
  catch { return false; }
}

/** Invoke the write only after the same review gate used to enable the control. */
export async function publishReviewedDraft(state, publish) {
  if (!canPublishReviewedDraft(state)) return false;
  await publish(state.kind, state.id, Number(state.draft.revision));
  return true;
}
