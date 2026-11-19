import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
test.after(()=>server.close());
const client=await server.ssrLoadModule('/src/api/client.js');
function storage(){const data=new Map();return {get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
function setup(){
 global.sessionStorage=storage();global.localStorage=storage();global.window=new EventTarget();
 let clicks=0,created=0,revoked=0;
 global.document={createElement:()=>({click(){clicks++},remove(){}}),body:{appendChild(){}}};
 URL.createObjectURL=()=>{created++;return 'blob:synthetic'};URL.revokeObjectURL=()=>{revoked++};
 client.storeToken('synthetic-session-A');
 return {counts:()=>({clicks,created,revoked})};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('logout while fetch is pending cancels signal and never clicks',async()=>{
 const state=setup();let resolve,signal;global.fetch=(_,o)=>{signal=o.signal;return new Promise(r=>resolve=r)};
 const result=client.downloadAdminMintrudScan('p');client.clearToken();assert.ok(signal.aborted);
 resolve({ok:true,blob:async()=>new Blob(['synthetic'])});await assert.rejects(result,{name:'AbortError'});assert.equal(state.counts().clicks,0);
});
for(const [name,change] of [['A to B during blob',()=>client.storeToken('synthetic-session-B')],['new login same token during blob',()=>client.storeToken('synthetic-session-A')]])test(name,async()=>{
 const state=setup();let resolve,signal;global.fetch=async(_,o)=>{signal=o.signal;return {ok:true,blob:()=>new Promise(r=>resolve=r)}};
 const result=client.downloadAdminMintrudScan('p');await tick();change();resolve(new Blob(['synthetic']));await assert.rejects(result,{name:'AbortError'});assert.ok(signal.aborted);assert.deepEqual(state.counts(),{clicks:0,created:0,revoked:0});
});
test('stable session completes one authenticated download and releases URL',async()=>{
 const state=setup();global.fetch=async(_,o)=>{assert.equal(o.headers.Authorization,'Bearer synthetic-session-A');return {ok:true,blob:async()=>new Blob(['synthetic'],{type:'application/pdf'})}};
 await client.downloadAdminMintrudScan('p');assert.equal(state.counts().clicks,1);await new Promise(r=>setTimeout(r,1100));assert.equal(state.counts().revoked,1);
});
test('network failure never creates a link',async()=>{const state=setup();global.fetch=async()=>{throw Error('synthetic unavailable')};await assert.rejects(()=>client.downloadAdminMintrudScan('p'));assert.deepEqual(state.counts(),{clicks:0,created:0,revoked:0})});
test('session cancellation during URL creation revokes URL and never clicks',async()=>{
 const state=setup();let revoked=0;URL.createObjectURL=()=>{client.clearToken();return 'blob:synthetic'};URL.revokeObjectURL=()=>revoked++;
 global.fetch=async()=>({ok:true,blob:async()=>new Blob(['synthetic'])});await assert.rejects(()=>client.downloadAdminMintrudScan('p'),{name:'AbortError'});assert.equal(revoked,1);assert.equal(state.counts().clicks,0);
});
