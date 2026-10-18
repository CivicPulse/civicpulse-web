const states = ['unknown','pending_publication','pending_removal','live','absent'];
const delivery = ['queued','exporting','building','validating','ready','deploying','live','superseded','failed','deployment_unknown'];
const errors = ['export_failed','build_failed','validation_failed','deployment_failed','deployment_unknown','reconciliation_failed'];
const kinds = ['organization','calendar','event','layer','map'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
const counter = value => typeof value === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(value);
const time = value => typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value));
const text = value => typeof value === 'string' && value.length <= 256 && !/[\x00-\x1f\x7f]/.test(value);
const optional = (value, check) => value === null || check(value);
const fail = () => { throw new Error('delivery_status_unavailable'); };
function shape(value, names) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== names.split(',').sort().join()) fail();
  for (const name of Object.keys(value)) if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value,name),'value')) fail();
}
export function compareStatusCounters(a,b) {
  if (!counter(a) || !counter(b)) fail();
  return a.length === b.length ? (a === b ? 0 : a < b ? -1 : 1) : a.length < b.length ? -1 : 1;
}
export function validatePublicationStatus(value) {
  shape(value,'dataset_epoch,desired_generation,live_dataset_epoch,live_generation,generation_lag,live_inventory_complete,live_deployment_id,live_source_sha,live_at,paused,bootstrap_complete,state,active_job,last_error,next_attempt_at,status_error,observed_at');
  if (!uuid(value.dataset_epoch) || !counter(value.desired_generation) || !optional(value.live_dataset_epoch,uuid) || !optional(value.live_generation,counter) || !optional(value.generation_lag,counter) ||
      typeof value.live_inventory_complete !== 'boolean' || !optional(value.live_deployment_id,text) || !optional(value.live_source_sha,v=>typeof v==='string'&&/^[0-9a-f]{40}$/.test(v)) || !optional(value.live_at,time) ||
      typeof value.paused !== 'boolean' || typeof value.bootstrap_complete !== 'boolean' || !optional(value.state,v=>delivery.includes(v)) || !optional(value.next_attempt_at,time) || ![null,'live_generation_ahead'].includes(value.status_error) || !time(value.observed_at)) fail();
  if (value.active_job !== null) { shape(value.active_job,'job_id,generation,run_url'); if (!uuid(value.active_job.job_id) || !counter(value.active_job.generation) || !optional(value.active_job.run_url,text)) fail(); }
  if (value.last_error !== null) { shape(value.last_error,'code,occurred_at'); if (!errors.includes(value.last_error.code) || !time(value.last_error.occurred_at)) fail(); }
  if (value.live_inventory_complete && (value.live_dataset_epoch === null || value.live_generation === null)) fail();
  if (value.generation_lag !== null && (value.live_dataset_epoch !== value.dataset_epoch || value.live_generation === null || compareStatusCounters(value.live_generation,value.desired_generation)>0 ||
      String(BigInt(value.desired_generation)-BigInt(value.live_generation)) !== value.generation_lag)) fail();
  return structuredClone(value);
}
function recordStatus(value, global, context) {
  shape(value,'dataset_epoch,live_dataset_epoch,last_event_id,last_action,last_generation,published_revision,live_revision,website_state,observed_at');
  if (value.dataset_epoch !== global.dataset_epoch || value.live_dataset_epoch !== global.live_dataset_epoch || !optional(value.last_event_id,uuid) || ![null,'publish','withdraw'].includes(value.last_action) ||
      !optional(value.last_generation,counter) || !optional(value.published_revision,counter) || !optional(value.live_revision,counter) || !states.includes(value.website_state) || !time(value.observed_at) ||
      value.published_revision !== context.publishedRevision || value.last_generation !== null && compareStatusCounters(value.last_generation,global.desired_generation)>0) fail();
  const known = global.live_inventory_complete && global.live_dataset_epoch === global.dataset_epoch && global.live_generation !== null && compareStatusCounters(global.live_generation,global.desired_generation)<=0 && global.status_error === null;
  const expected = !known ? 'unknown' : value.published_revision === null ? value.live_revision === null ? 'absent' : 'pending_removal' : value.live_revision === value.published_revision ? 'live' : 'pending_publication';
  if (value.website_state !== 'unknown' && value.website_state !== expected) fail();
  return structuredClone(value);
}
const recordCopy = {
  unknown: 'Website verification is unknown. API publication is not proof of website visibility.',
  pending_publication: 'API publication is waiting for verified website delivery.',
  pending_removal: 'API withdrawal is waiting for verified website removal.',
  live: 'The API publication matches the last verified website inventory.',
  absent: 'This record is absent from the API and the last verified website inventory.',
};
function model(global, record, context) {
  const qualifiers = [];
  if (global.paused) qualifiers.push('Automatic delivery is paused.');
  if (global.state === 'deployment_unknown') qualifiers.push('Deployment outcome is unknown. No retry is available here.');
  else if (global.state === 'failed') qualifiers.push('The latest delivery failed; the last verified website remains separate.');
  else if (global.state) qualifiers.push(`Delivery job: ${global.state}.`);
  if (global.last_error) qualifiers.push(`Last delivery error: ${global.last_error.code} (${global.last_error.occurred_at}).`);
  if (global.active_job) qualifiers.push('An active delivery job remains; completion or reconciliation may still be pending.');
  if (global.generation_lag === '0') qualifiers.push('Content generations match; source-only updates or terminal reconciliation may still be pending.');
  if (!global.bootstrap_complete) qualifiers.push('The CMS baseline is incomplete.');
  if (!global.live_inventory_complete || global.status_error || global.live_dataset_epoch !== global.dataset_epoch || global.live_generation===null || compareStatusCounters(global.live_generation,global.desired_generation)>0) qualifiers.push('Website inventory verification is unknown.');
  if (context.uncertain) qualifiers.push('Your CMS action still needs saved-record reconciliation. This status does not resolve its outcome.');
  return { availability:'ready',message:qualifiers.join(' ')||'No delivery job is reported.',global,record,
    recordMessage:record ? recordCopy[record.website_state] : 'Select a saved record to check its API and website revisions.',
    draftRevision:context.record?.draftRevision??null,apiRevision:context.record?.publishedRevision??null };
}
/** Read-only port. No mutation/reconciliation callbacks or backend retry/trigger.
 * setContext invalidates every old response, independently of editor write gates. */
export function createDeliveryStatusController({ port, render, isVisible=()=>true, schedule=setTimeout, cancel=clearTimeout }) {
  let context=null, signature='', run=0, request=0, pending=false, timer=null, automatic=0, baseline=null, stopped=false;
  const clearTimer=()=>{if(timer!==null)cancel(timer);timer=null;};
  function emit(value) {render({...value,loading:pending,canRefresh:!!context?.staff&&context.source==='supabase'&&context.available&&!pending});}
  function enqueue() {clearTimer();if(!stopped&&automatic<10&&isVisible()&&context?.staff&&context.source==='supabase'&&context.available)timer=schedule(()=>{timer=null;automatic++;void refresh();},30000);}
  async function refresh() {
    if (!context?.staff || context.source!=='supabase' || !context.available || pending || !isVisible()) return;
    clearTimer();const current=context, generation=run, serial=++request;pending=true;
    emit({availability:'checking',message:'Checking website delivery…',global:null,record:null,recordMessage:'',draftRevision:current.record?.draftRevision??null,apiRevision:current.record?.publishedRevision??null});
    try {
      const [raw,rawRecord]=await Promise.all([port.publicationStatus(),current.record?port.recordPublicationStatus(current.record.kind,current.record.id):Promise.resolve(null)]);
      if(generation!==run||serial!==request)return;
      const global=validatePublicationStatus(raw);
      if(baseline&&(Date.parse(global.observed_at)<Date.parse(baseline.observed)||baseline.epoch!==global.dataset_epoch||compareStatusCounters(global.desired_generation,baseline.desired)<0||baseline.live!==null&&global.live_generation!==null&&global.live_dataset_epoch===global.dataset_epoch&&compareStatusCounters(global.live_generation,baseline.live)<0))fail();
      const record=current.record?recordStatus(rawRecord,global,current.record):null;
      if(record&&baseline?.recordObserved&&Date.parse(record.observed_at)<Date.parse(baseline.recordObserved))fail();
      baseline={observed:global.observed_at,recordObserved:record?.observed_at??null,epoch:global.dataset_epoch,desired:global.desired_generation,live:global.live_dataset_epoch===global.dataset_epoch?global.live_generation:null};
      pending=false;emit(model(global,record,current));enqueue();
    } catch(error) {
      if(generation!==run||serial!==request)return;
      pending=false;stopped=true;
      const missing=['PGRST202','42883'].includes(error?.code);
      emit({availability:missing?'not_enabled':'unavailable',message:missing?'Website delivery status is not enabled on this API.':'Website delivery status could not be verified. No CMS action was retried.',global:null,record:null,recordMessage:'',draftRevision:current.record?.draftRevision??null,apiRevision:current.record?.publishedRevision??null});
    }
  }
  function setContext(next) {
    const nextSignature=JSON.stringify(next);if(signature===nextSignature)return;
    clearTimer();signature=nextSignature;context=structuredClone(next);run++;request++;pending=false;automatic=0;baseline=null;stopped=false;
    if(!context.staff){emit({availability:'signed_out',message:'Staff access must be verified before checking delivery.',global:null,record:null,recordMessage:''});return;}
    if(context.source!=='supabase'||!context.available){emit({availability:'not_enabled',message:context.source!=='supabase'?'CMS-to-website refresh is not enabled in this local-source build.':'Website delivery status is not configured in this build.',global:null,record:null,recordMessage:'',draftRevision:context.record?.draftRevision??null,apiRevision:context.record?.publishedRevision??null});return;}
    if(context.record&&(!kinds.includes(context.record.kind)||typeof context.record.id!=='string'||!optional(context.record.draftRevision,counter)||!optional(context.record.publishedRevision,counter))) {stopped=true;emit({availability:'unavailable',message:'Reload the saved record before checking website delivery.',global:null,record:null,recordMessage:''});return;}
    void refresh();
  }
  return {setContext,refresh:()=>{stopped=false;return refresh();},visibilityChanged:()=>{clearTimer();if(isVisible())enqueue();},dispose:()=>{clearTimer();run++;request++;context=null;pending=false;baseline=null;signature='';}};
}
