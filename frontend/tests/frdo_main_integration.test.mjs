import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
globalThis.sessionStorage=storage(); globalThis.localStorage=storage();
const events=[];globalThis.window=new EventTarget();
const dispatch=window.dispatchEvent.bind(window);window.dispatchEvent=e=>{events.push(e.type);return dispatch(e)};
const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});after(()=>server.close());
const api=await server.ssrLoadModule('/src/api/client.js');
const {bindRegistrySession}=await server.ssrLoadModule('/src/utils/registrySession.js');
const presentation=await server.ssrLoadModule('/src/utils/registryPresentation.js');
const {RegistryProfileCompletenessNotice}=await server.ssrLoadModule('/src/components/admin/AdminRegistryLearnerProfileForm.jsx');
const response=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data)});

test('real login stores session token and changes generation',async()=>{
 const prior=api.captureAuthSession();globalThis.fetch=async()=>response({access_token:'synthetic-A'});
 await api.login('synthetic@example.invalid','synthetic');
 assert.equal(api.getStoredToken(),'synthetic-A');assert.equal(api.isCurrentAuthSession(prior),false);
 assert.ok(events.includes('obrportal-auth-change'));
});
test('same-token login is a new session',()=>{api.storeToken('synthetic-A');const a=api.captureAuthSession();api.storeToken('synthetic-A');assert.equal(api.isCurrentAuthSession(a),false)});
test('logout invalidates ownership and removes both real token stores',()=>{const a=api.captureAuthSession();api.clearToken();assert.equal(api.getStoredToken(),null);assert.equal(api.isCurrentAuthSession(a),false)});
test('persistent login and actor switch invalidate the old owner',()=>{api.storeToken('synthetic-A',{persist:true});assert.equal(sessionStorage.getItem('obrportal_access_token'),null);const a=api.captureAuthSession();api.storeToken('synthetic-B');assert.equal(api.isCurrentAuthSession(a),false);assert.equal(localStorage.getItem('obrportal_access_token'),null)});
test('observed external token change invalidates async ownership',()=>{const a=api.captureAuthSession();sessionStorage.setItem('obrportal_access_token','synthetic-C');assert.equal(api.isCurrentAuthSession(a),false)});
test('late old-session operation cannot continue as the new actor',async()=>{let release,followups=0;const owner=api.captureAuthSession();const owned=bindRegistrySession({first:()=>new Promise(r=>release=r),second:async()=>++followups},owner);const action=owned.first().then(()=>owned.second());api.storeToken('synthetic-new-actor');release({id:'synthetic'});await assert.rejects(action,/Сессия изменилась/);assert.equal(followups,0);await assert.rejects(owned.second(),/Сессия изменилась/)});
for(const status of [401,403])test(`real API keeps HTTP ${status}; session helper never grants rights`,async()=>{globalThis.fetch=async()=>response({detail:'synthetic access denial'},status);await assert.rejects(api.getAdminFrdoObligations(),e=>e.status===status&&e.payload.detail==='synthetic access denial')});
test('late XLSX body after logout cannot create a browser download',async()=>{let release,created=0;api.storeToken('synthetic-download');globalThis.fetch=async()=>({ok:true,status:200,blob:()=>new Promise(r=>release=r)});window.URL={createObjectURL(){created++}};const pending=api.downloadAdminFrdoSubmissionBatch('synthetic-id');await new Promise(r=>setImmediate(r));api.clearToken();release(new Blob(['synthetic']));await assert.rejects(pending,/Сессия изменилась/);assert.equal(created,0)});
test('profile warning is real completeness advice and never expands XML rights',()=>{const html=(profile,registry)=>renderToStaticMarkup(createElement(RegistryProfileCompletenessNotice,{profile,registry}));assert.equal(html({sex:'female'},'frdo'),'');assert.match(html({},'frdo'),/обязательное поле/);assert.match(html({},'mintrud'),/само по себе не блокирует XML/);assert.doesNotMatch(html({},'mintrud'),/type="submit"|Утвердить/);assert.equal(html(null,'frdo'),'');const component=readFileSync(new URL('../src/components/admin/AdminRegistryLearnerProfileForm.jsx',import.meta.url),'utf8');assert.match(component,/getAdminLearnerProfile\(userId\)/);assert.match(component,/\[userId, refreshKey\]/);assert.ok(component.indexOf('setOriginal(values);',component.indexOf('await updateAdminLearnerProfile'))<component.indexOf('await onSaved?.()'))});
test('presentation keeps drafts separate and omits locked source fields',()=>{assert.deepEqual(presentation.buildMintrudContextPayload({protocol_number:'draft',profession_or_position:' engineer '},true),{profession_or_position:'engineer'});assert.equal(presentation.protocolDisplayStatus({status:'draft'}),'Черновик');assert.match(presentation.draftTransferMessage({},[{status:'draft',protocol_number:'SYNTHETIC'}]),/ещё не перенесены/);assert.equal(presentation.draftTransferMessage({protocol_number:'x',knowledge_check_date:'y',knowledge_check_result:'z'},[{status:'draft'}]),'')});
test('main Mintrud routing stays separate from M4 destinations',()=>{const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');const page=read('pages/AdminRegistriesPage.jsx'),frdo=read('pages/FrdoRegistryWorkspace.jsx'),mintrud=read('pages/MainMintrudRegistriesPage.jsx');assert.equal((page.match(/<FrdoRegistryWorkspace\b/g)||[]).length,1);assert.equal((page.match(/<MainMintrudRegistriesPage\b/g)||[]).length,1);assert.match(mintrud,/useState\("mintrud"\)/);assert.doesNotMatch(mintrud,/setActiveRegistry\("frdo"\)/);assert.match(mintrud,/prepareAndDownloadMintrudBatch\(/);assert.match(mintrud,/markAdminMintrudSubmissionBatchImported\(/);assert.doesNotMatch(page+frdo+mintrud,/useMintrudPermissions|knowledge-protocols|MintrudSignaturePanel|\/me\/permissions/);assert.doesNotMatch(read('api/client.js'),/effective_permissions|permissions_count/)});
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),espree=require('espree');
function functionHashes(relative) {
 const source=readFileSync(new URL('../src/'+relative,import.meta.url),'utf8').replaceAll('\r\n','\n');
 const ast=espree.parse(source,{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true},range:true}),result={};
 function walk(node){if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&node.id)result[node.id.name]=createHash('sha256').update(source.slice(...node.body.range)).digest('hex');for(const [key,value]of Object.entries(node))if(key!=='range'){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value)}}
 walk(ast);return result;
}
test('53 main and 179 API bodies match P8; M4 form and proxy status are pinned',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/main_registry_contract.json',import.meta.url),'utf8'));
 const mintrud=functionHashes('pages/MainMintrudRegistriesPage.jsx'),client=functionHashes('api/client.js');
 // Restore M4's saved-versus-draft separation; pins verified against c77e96d.
 const m4Form={MintrudContextForm:'7fbc47919ce5332552c4999e89798978718cf0c02d68b99472cad4c03c7f2d04',submit:'ae9895d36674788e8ea728549e76b0024f42f02460dd33f2e209bf714907afc2'};
 for(const [name,sha]of Object.entries(fixture.mintrud))assert.equal(mintrud[name],m4Form[name]||sha,'main helper/action '+name);
 // M4 c77e96d preserves a proxy HTML error's HTTP status (not present in P8).
 // Keep all 179 other P8 bodies pinned and pin request to the committed M4 body.
 assert.equal(fixture.api.request,'57f6ce5815889631b9861f5b252869c8425d2d93b6363952ed7b0479c67efc43');
 for(const [name,sha]of Object.entries(fixture.api))assert.equal(client[name],name==='request'?'4fbba6c87b9548512ab51b917648266265ad6a8b577fa104ca068c99d20d3731':sha,'main API '+name);
});

for(const status of [413,401,403,503])test(`non-JSON HTTP ${status} retains status without retry`,async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return {ok:false,status,text:async()=>'<html>proxy failure</html>'}};
 await assert.rejects(api.getAdminFrdoObligations(),e=>e.status===status);assert.equal(calls,1);
});
test('M4 own permissions uses existing backend RBAC, strict flags and no cache',async()=>{
 let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.ok(url.endsWith('/api/v1/auth/me/permissions'));assert.equal(options.cache,'no-store');return response({mintrud:{read:true,write:false}})};
 assert.deepEqual(await api.getMintrudUiPermissions(),['mintrud.read']);assert.equal(calls,1);
 globalThis.fetch=async()=>response({mintrud:{read:'true',write:1}});assert.deepEqual(await api.getMintrudUiPermissions(),[]);
 globalThis.fetch=async()=>response({detail:'denied'},403);await assert.rejects(api.getMintrudUiPermissions(),e=>e.status===403);
 const backend=readFileSync(new URL('../../backend/app/api/v1/auth.py',import.meta.url),'utf8');
 assert.match(backend,/@router.get\("\/me\/permissions"/);assert.match(backend,/get_user_permission_codes\(current_user, session\)/);assert.match(backend,/"read": "mintrud.read" in codes/);assert.match(backend,/"write": "mintrud.write" in codes/);
});
