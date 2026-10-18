import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryStatusController, compareStatusCounters } from '../src/lib/admin-delivery-status.mjs';
import { createCivicPulseClient } from '../src/vendor/civicpulse-api-status-local/client.mjs';
import { createCmsJsonFetch } from '../src/lib/admin-json.mjs';
const epoch='11111111-1111-4111-8111-111111111111',stamp='2026-10-18T12:00:00Z';
export const statusGlobal = (extra={}) => ({dataset_epoch:epoch,desired_generation:'9007199254740994',live_dataset_epoch:epoch,live_generation:'9007199254740993',generation_lag:'1',live_inventory_complete:true,live_deployment_id:'fixture',live_source_sha:'a'.repeat(40),live_at:stamp,paused:false,bootstrap_complete:true,state:'building',active_job:{job_id:'22222222-2222-4222-8222-222222222222',generation:'9007199254740994',run_url:null},last_error:null,next_attempt_at:null,status_error:null,observed_at:stamp,...extra});
export const statusRecord = (extra={}) => ({dataset_epoch:epoch,live_dataset_epoch:epoch,last_event_id:'33333333-3333-4333-8333-333333333333',last_action:'publish',last_generation:'9007199254740994',published_revision:'2',live_revision:'1',website_state:'pending_publication',observed_at:stamp,...extra});
const context=(extra={})=>({user:'staff-a',selection:1,staff:true,source:'supabase',available:true,uncertain:false,record:{kind:'event',id:'__proto__',draftRevision:'3',publishedRevision:'2'},...extra});
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function harness(){
 const views=[],timers=new Map(),state={global:statusGlobal(),record:statusRecord(),visible:true,globalRead:null,recordRead:null,calls:[]};let id=0;
 const port={publicationStatus:()=>{state.calls.push('global');return state.globalRead?state.globalRead():Promise.resolve(structuredClone(state.global));},recordPublicationStatus:(kind,recordId)=>{state.calls.push([kind,recordId]);return state.recordRead?state.recordRead():Promise.resolve(structuredClone(state.record));}};
 const controller=createDeliveryStatusController({port,render:view=>views.push(view),isVisible:()=>state.visible,schedule:(work,delay)=>{assert.equal(delay,30000);timers.set(++id,work);return id;},cancel:id=>timers.delete(id)});
 return{controller,state,timers,views,view:()=>views.at(-1),async bind(value=context()){controller.setContext(value);await flush();},async refresh(){await controller.refresh();await flush();},async tick(){const work=[...timers.values()][0];timers.clear();work?.();await flush();}};
}

test('actual status controller shows pending->live and distinct draft/API/verified revisions without Number narrowing',async()=>{
 const h=harness();await h.bind();assert.equal(h.view().record.website_state,'pending_publication');assert.equal(h.view().draftRevision,'3');assert.equal(h.view().apiRevision,'2');
 assert.equal(h.view().global.desired_generation,'9007199254740994');assert.equal(compareStatusCounters('9007199254740993','9007199254740994'),-1);
 h.state.global=statusGlobal({live_generation:'9007199254740994',generation_lag:'0',state:'live'});h.state.record=statusRecord({live_revision:'2',website_state:'live'});await h.refresh();
 assert.equal(h.view().record.website_state,'live');assert.match(h.view().message,/active delivery job remains/);assert.match(h.view().message,/terminal reconciliation/);
 assert.deepEqual(h.state.calls.slice(0,2),['global',['event','__proto__']]);h.controller.dispose();
});
test('withdrawal pending_removal->absent, failure prior-live, paused and unknown remain independent',async()=>{
 const h=harness();h.state.record=statusRecord({published_revision:null,last_action:'withdraw',website_state:'pending_removal'});await h.bind(context({record:{kind:'event',id:'x',draftRevision:'3',publishedRevision:null}}));assert.equal(h.view().record.website_state,'pending_removal');
 h.state.record=statusRecord({published_revision:null,live_revision:null,last_action:'withdraw',website_state:'absent'});await h.refresh();assert.equal(h.view().record.website_state,'absent');
 h.state.global=statusGlobal({state:'failed',paused:true,last_error:{code:'deployment_failed',occurred_at:stamp}});h.state.record=statusRecord({published_revision:'1',live_revision:'1',website_state:'live'});
 await h.bind(context({selection:2,record:{kind:'event',id:'x',draftRevision:'3',publishedRevision:'1'}}));assert.equal(h.view().record.website_state,'live');assert.match(h.view().message,/failed/);assert.match(h.view().message,/paused/);
 h.state.global=statusGlobal({state:'deployment_unknown'});await h.refresh();assert.match(h.view().message,/No retry/);assert.equal(h.view().record.website_state,'live');h.controller.dispose();
});
test('source-only lag0 does not prove job or source/terminal completion',async()=>{
 const h=harness();h.state.global=statusGlobal({live_generation:'9007199254740994',generation_lag:'0'});h.state.record=statusRecord({live_revision:'2',website_state:'live'});await h.bind();
 assert.match(h.view().message,/source-only updates/);assert.match(h.view().message,/active delivery job/);assert.equal(h.view().global.live_source_sha,'a'.repeat(40));h.controller.dispose();
});
test('epoch/rewind/stale published revision/out-of-order observations and malformed counters cannot claim live',async()=>{
 for(const mode of ['epoch','rewind','revision','observed','numeric','unknownstate']){
  const h=harness();await h.bind();
  if(mode==='epoch')h.state.global.dataset_epoch='44444444-4444-4444-8444-444444444444';
  if(mode==='rewind')h.state.global=statusGlobal({desired_generation:'9007199254740993',live_generation:'9007199254740993',generation_lag:'0'});
  if(mode==='revision')h.state.record.published_revision='3';
  if(mode==='observed')h.state.global.observed_at='2026-10-17T12:00:00Z';
  if(mode==='numeric')h.state.global.desired_generation=1;
  if(mode==='unknownstate')h.state.record.website_state='deployed';
  await h.refresh();assert.equal(h.view().availability,'unavailable',mode);assert.equal(h.view().global,null);assert.equal(h.view().record,null);assert.equal(h.timers.size,0);h.controller.dispose();
 }
});
test('auth/record switch clears and discards delayed results, with no privileged state restored',async()=>{
 const h=harness(),pending=deferred();h.state.globalRead=()=>pending.promise;await h.bind();
 h.controller.setContext(context({staff:false,user:null,record:null}));assert.equal(h.view().availability,'signed_out');pending.resolve(statusGlobal());await flush();assert.equal(h.view().global,null);
 h.state.globalRead=null;await h.bind(context({selection:2,record:{kind:'event',id:'new',draftRevision:'1',publishedRevision:'2'}}));assert.equal(h.view().availability,'ready');
 const late=deferred();h.state.recordRead=()=>late.promise;const request=h.refresh();await flush();h.controller.setContext(context({selection:3,staff:false}));late.resolve(statusRecord());await request;
 assert.equal(h.view().availability,'signed_out');assert.equal(h.view().record,null);h.controller.dispose();
});
test('local/missing RPC/outage/auth denial are unknown-first, stop automatic checks, and never retry mutations',async()=>{
 const local=harness();await local.bind(context({source:'local'}));assert.equal(local.state.calls.length,0);assert.equal(local.view().availability,'not_enabled');local.controller.dispose();
 for(const error of [{code:'PGRST202'},new Error('SENSITIVE_SYNTHETIC_STATUS_ERROR'),{code:'42501'}]){
  const h=harness();h.state.globalRead=()=>Promise.reject(error);await h.bind();assert.equal(h.view().global,null);assert.equal(h.view().record,null);assert.equal(h.timers.size,0);assert.equal(JSON.stringify(h.view()).includes('SENSITIVE'),false);assert.ok(['not_enabled','unavailable'].includes(h.view().availability));assert.equal(h.state.calls.length,2);h.controller.dispose();
 }
});
test('visible authenticated polling is capped, hidden checks stop, manual refresh is single-flight',async()=>{
 const h=harness();await h.bind();for(let i=0;i<10;i++)await h.tick();assert.equal(h.timers.size,0);assert.equal(h.state.calls.length,22);
 h.state.visible=false;await h.refresh();assert.equal(h.state.calls.length,22);h.controller.visibilityChanged();assert.equal(h.timers.size,0);
 h.state.visible=true;const pending=deferred();h.state.globalRead=()=>pending.promise;const first=h.refresh();await flush();await h.refresh();assert.equal(h.state.calls.length,24);pending.resolve(statusGlobal());await first;h.controller.dispose();
});
test('hidden context switch clears the previous record status and does not fetch',async()=>{
 const h=harness();await h.bind(context({selection:1,record:{kind:'event',id:'old',draftRevision:'3',publishedRevision:'2'}}));
 assert.equal(h.view().global.dataset_epoch,epoch);assert.equal(h.view().record.website_state,'pending_publication');
 h.state.visible=false;const calls=h.state.calls.length;
 h.controller.setContext(context({selection:2,record:{kind:'event',id:'new',draftRevision:'4',publishedRevision:'3'}}));await flush();
 assert.equal(h.state.calls.length,calls);assert.equal(h.view().global,null);assert.equal(h.view().record,null);assert.match(h.view().message,/hidden/i);assert.equal(h.view().draftRevision,'4');
 h.state.visible=true;h.state.global=statusGlobal({live_generation:'9007199254740994',generation_lag:'0',state:'live'});h.state.record=statusRecord({published_revision:'3',live_revision:'3',website_state:'live'});
 await h.refresh();assert.equal(h.view().record.website_state,'live');assert.ok(h.state.calls.some(c=>Array.isArray(c)&&c[0]==='event'&&c[1]==='new'));h.controller.dispose();
});
test('hidden sign-out clears sensitive status without fetching',async()=>{
 const h=harness();await h.bind();h.state.visible=false;const calls=h.state.calls.length;
 h.controller.setContext(context({staff:false,user:null,record:null}));await flush();
 assert.equal(h.view().availability,'signed_out');assert.equal(h.view().global,null);assert.equal(h.view().record,null);assert.equal(h.state.calls.length,calls);h.controller.dispose();
});
test('actual vendored status client + guarded raw transport preserves string counters, rejects unsafe2xx, preserves non2xx ApiError',async()=>{
 let response=statusGlobal(),raw=null,calls=0;
 const api=createCivicPulseClient({url:'https://example.test',publishableKey:'public-fixture',accessToken:()=> 'session-fixture',fetch:createCmsJsonFetch(async(url,init)=>{
  calls++;assert.equal(new URL(url).pathname,'/rest/v1/rpc/cms_publication_status');assert.equal(init.cache,'no-store');assert.equal(init.headers.Authorization,'Bearer session-fixture');return new Response(raw??JSON.stringify(response),{status:response===null?409:200,headers:{'content-type':'application/json'}});
 },'https://example.test')});
 assert.equal((await api.publicationStatus()).desired_generation,'9007199254740994');
 raw=JSON.stringify(statusGlobal()).replace('"desired_generation":"9007199254740994"','"desired_generation":1e-400');await assert.rejects(api.publicationStatus(),error=>error.name==='CmsJsonValueError');assert.equal(calls,2);
 response=null;raw='{"code":"40001","message":"conflict","details":{"value":1e-400}}';await assert.rejects(api.publicationStatus(),error=>error.status===409&&error.code==='40001');assert.equal(calls,3);
});
