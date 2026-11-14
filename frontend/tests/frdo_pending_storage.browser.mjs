import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const out=process.env.UI_EVIDENCE_DIR;
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR || 'dist'},preview:{host:'127.0.0.1',port:4194,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4194',a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',h='33333333-3333-4333-8333-333333333333';
const summary=(registry,id)=>({id,registry,status:'submitted',artifact_kind:registry==='frdo'?'frdo_po_xlsx':'mintrud_eisot_xml',record_count:1,obligation_count:1,generated_at:'2026-01-01',has_artifact:true});
const detail=(registry,id)=>({...summary(registry,id),items:[{id:'item-'+id,obligation_id:'obligation-'+id,position:1,record_count:1,approval_fingerprint:"synthetic",approval_snapshot_json:{historical:true},result_status:null}]});
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-navigation'));
const calls=[],errors=[],checks=[];let mode='',release=null;let saved=false;let posts=0;
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
 if(u.origin!==base)return route.abort();
 if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
 calls.push({method:req.method(),path:p});
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(req.method()!=='GET'){posts++;if(mode==='timeout')return route.abort('timedout');saved=true;return json({...detail('frdo',a),items:[{...detail('frdo',a).items[0],result_status:'accepted',external_id:null,errors_json:[],result_recorded_at:'now'}]});}
 if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
 if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
 const m=p.match(/\/(frdo|mintrud)\/batches(?:\/([^/]+))?$/);
 if(m){const [,reg,id]=m;if(!id)return json([summary(reg,a),summary(reg,b)]);
  if(mode==='slow'&&id===a)await new Promise(r=>{release=r});
  if(mode==='error')return json({detail:'Synthetic inaccessible'},404);
  if(mode==='mismatch')return json(detail(reg,b));
  if(mode==='registry')return json(detail(reg==='frdo'?'mintrud':'frdo',id));
  return json(saved ? {...detail(reg,id),items:[{...detail(reg,id).items[0],result_status:'accepted',external_id:null,errors_json:[],result_recorded_at:'now'}]} : detail(reg,id));
 }
 return json([]);
});
const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const selected=()=>page.getByTestId('selected-registry-batch');
const url=(id,reg='frdo')=>base+'/admin/registries?registry='+reg+'&registryView=batches&batchStage=submitted'+(id===null?'':'&batchId='+id);
const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);};
async function shown(id){await selected().getByText('Обязательство: obligation-'+id,{exact:true}).waitFor();}

const row=()=>selected().getByRole('region',{name:'Сверка результатов ФРДО'});
const pending=()=>row().getByRole('button',{name:'Проверить сохранённые результаты'});
const saveButton=()=>row().getByRole('button',{name:'Сохранить выбранные результаты'});
async function attempt(){await row().getByLabel('Источник результатов (обязательно)').fill('Synthetic source');await row().getByLabel('Результат получен').check();await saveButton().click();}
try {
 mode='timeout';await page.goto(url(a));await attempt();await pending().waitFor();check(posts===1,'one timeout POST');
 await page.reload();await pending().waitFor();check(posts===1,'reload restores pending without POST');check(await saveButton().isDisabled(),'repeat click blocked');
 await pending().click();await row().getByRole('alert').waitFor();check(posts===1,'unchanged GET does not retry');
 await page.getByTestId('admin-registries-frdo-batch-'+b).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await page.goBack();await page.goForward();await saveButton().waitFor();check(posts===1,'switch Back Forward no POST');check(!await saveButton().isDisabled(),'other batch not blocked');
 await page.getByRole('group',{name:'Реестр партий'}).getByRole('button',{name:'Минтруд · XML v1.0.9',exact:true}).click();await page.getByRole('group',{name:'Реестр партий'}).getByRole('button',{name:'ФРДО · XLSX',exact:true}).click();await page.getByTestId('admin-registries-frdo-batch-'+a).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await pending().waitFor();check(posts===1,'unmount and reopening restores pending');
 const second=await context.newPage();await second.goto(url(a));await second.getByTestId('selected-registry-batch').getByRole('button',{name:'Проверить сохранённые результаты'}).waitFor();check(true,'another tab restores pending');await second.close();
 mode='error';await pending().click();await row().getByRole('alert').waitFor();check(posts===1,'GET failure no POST');mode='';saved=true;await pending().click();await pending().waitFor({state:'detached'});check(true,'confirmed GET clears fence');
 saved=false;await page.reload();await attempt();await row().getByText(/Доступен только просмотр/).waitFor();check(posts===2,'successful POST');
 saved=false;await page.reload();await saveButton().waitFor();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('blocked')}});await attempt();await row().getByRole('alert').waitFor();check(posts===2,'unavailable storage no POST');
 await row().screenshot({path:resolve(out,'pending-storage.png')});check(errors.length===0,'no page errors');check(calls.filter(c=>c.method!=='GET').every(c=>c.path.endsWith('/results')),'only results writes');
} finally {await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,calls,errors},null,2));await context.close();await browser.close();await server.httpServer.close();}
console.log('PASS '+checks.length+' checks');
