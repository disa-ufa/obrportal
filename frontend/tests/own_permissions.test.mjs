import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';import react from '@vitejs/plugin-react';
const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom'});test.after(()=>server.close());
const client=await server.ssrLoadModule('/src/api/client.js');
function storage(){const data=new Map();return {get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
global.sessionStorage=storage();global.localStorage=storage();global.window=new EventTarget();
test('own permissions endpoint only, no role listing, no-store, strict booleans',async()=>{
 client.storeToken('limited-synthetic');let calls=[];
 global.fetch=async(url,o)=>{calls.push(url);assert.ok(url.endsWith('/auth/me/permissions'));assert.equal(o.cache,'no-store');assert.equal(o.headers.Authorization,'Bearer limited-synthetic');return {ok:true,text:async()=>JSON.stringify({mintrud:{read:true,write:true}})}};
 assert.deepEqual(await client.getMintrudUiPermissions(),['mintrud.read','mintrud.write']);assert.equal(calls.length,1);
 global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({mintrud:{read:true,write:false}})});assert.deepEqual(await client.getMintrudUiPermissions(),['mintrud.read']);
 global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({mintrud:{read:'true',write:1}})});assert.deepEqual(await client.getMintrudUiPermissions(),[]);
});
test('permission errors propagate for fail-closed hook; auth changes clear pending signature and notify synchronously',async()=>{
 global.fetch=async()=>({ok:false,status:401,text:async()=>JSON.stringify({detail:'Unauthorized'})});await assert.rejects(()=>client.getMintrudUiPermissions());
 let events=0;window.addEventListener('obrportal-auth-change',()=>{events++});sessionStorage.setItem('obrportal_signature_attempt_v1:p','old-attempt');client.storeToken('second-synthetic');assert.equal(events,1);assert.equal(sessionStorage.getItem('obrportal_signature_attempt_v1:p'),null);assert.equal(client.getStoredToken(),'second-synthetic');client.clearToken();assert.equal(events,2);assert.equal(client.getStoredToken(),null);
});
