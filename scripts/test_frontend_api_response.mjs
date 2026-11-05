import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../frontend/src/api/client.js', import.meta.url), 'utf8');
function storage() {
  const data = new Map();
  return { get length(){return data.size}, key:i=>[...data.keys()][i], getItem:k=>data.get(k)??null,
    setItem:(k,v)=>data.set(k,v), removeItem:k=>data.delete(k) };
}
function load(text) {
  // Only module syntax/environment is adapted for the built-in Node VM.
  // Request/response handling is executed unchanged from the real source.
  const context = vm.createContext({ FormData, Blob, URL, URLSearchParams, AbortController, DOMException,
    Event, setTimeout, clearTimeout, sessionStorage:storage(), localStorage:storage(), window:new EventTarget(),
    __env:{PROD:true}, fetch:async()=>{throw Error('Unexpected fetch')} });
  const executable = text.replace(/import\.meta\.env/g,'__env')
    .replace(/\bexport\s+(?=(?:async\s+)?function\b|const\b|let\b)/g,'');
  vm.runInContext(executable+'\nglobalThis.api = { request, storeToken, clearToken, getCurrentUser, uploadAdminMintrudScan };',context);
  return context;
}
const response = (status,body) => ({ok:status>=200&&status<300,status,text:async()=>body});
async function contract(text, alter = api => api) {
  const c=load(text), a=alter(c.api);
  a.storeToken('synthetic');
  c.fetch=async(url,options)=>{
    assert.equal(url,'/api/v1/auth/me'); assert.equal(options.headers.Authorization,'Bearer synthetic');
    return response(200,'{"id":"synthetic","value":7}');
  };
  assert.equal((await a.getCurrentUser()).value,7);
  c.fetch=async()=>response(204,'');assert.equal(await a.request('/empty'),null);
  for(const status of [401,403,409,415,422,500]) {
    c.fetch=async()=>response(status,JSON.stringify({detail:'synthetic refusal',code:'synthetic'}));
    await assert.rejects(()=>a.request('/refusal'), e=>e.status===status&&e.payload?.code==='synthetic'&&e.message==='synthetic refusal');
  }
  c.fetch=async()=>response(413,'<html>Request too large</html>');
  await assert.rejects(()=>a.uploadAdminMintrudScan('p',new Blob(['x'])), e=>e.status===413);
  c.fetch=async(url,options)=>{
    assert.equal(url,'/api/v1/admin/mintrud/protocol-drafts/p/signed-scan');
    assert.ok(options.body instanceof FormData);assert.equal(options.headers['Content-Type'],undefined);
    assert.equal(options.headers.Authorization,'Bearer synthetic');return response(200,'{"saved":true}');
  };
  assert.equal((await a.uploadAdminMintrudScan('p',new Blob(['x']))).saved,true);
  c.fetch=async(url,options)=>{
    assert.equal(options.method,'PATCH');assert.equal(options.body,'{"value":1}');
    assert.equal(options.headers['Content-Type'],'application/json');return response(200,'{"value":1}');
  };
  assert.equal((await a.request('/json',{method:'PATCH',body:'{"value":1}'})).value,1);
  a.clearToken();
  c.fetch=async(url,options)=>{assert.equal(options.headers.Authorization,undefined);return response(200,'{}')};
  await a.request('/guest');
  c.fetch=async()=>response(200,'<html>invalid success</html>');
  await assert.rejects(()=>a.request('/invalid-json'));
}

test('real API response, authorization, JSON and FormData contract',()=>contract(source));
// Broken handlers are injected at the API interface. Equivalent correct
// implementations need not retain particular source-code fragments.
for(const [name,alter] of [
  ['HTML status lost', api=>({...api, uploadAdminMintrudScan:async(...args)=>{
    try{return await api.uploadAdminMintrudScan(...args)}catch(error){delete error.status;throw error}
  }})],
  ['JSON status lost', api=>({...api, request:async(...args)=>{
    try{return await api.request(...args)}catch(error){delete error.status;throw error}
  }})],
  ['successful JSON discarded', api=>({...api, getCurrentUser:async()=>{await api.getCurrentUser();return null}})],
  ['authorization removed', api=>({...api, getCurrentUser:async()=>{api.clearToken();return api.getCurrentUser()}})],
]) test('negative guard rejects '+name,async()=>{
  await assert.rejects(()=>contract(source,alter));
});
