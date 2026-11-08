import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const out=process.env.UI_EVIDENCE_DIR;
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR || 'dist'},preview:{host:'127.0.0.1',port:4194,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4194',a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',h='33333333-3333-4333-8333-333333333333';
const summary=(registry,id)=>({id,registry,status:'submitted',artifact_kind:registry==='frdo'?'frdo_po_xlsx':'mintrud_eisot_xml',record_count:1,obligation_count:1,generated_at:'2026-01-01',has_artifact:false});
const detail=(registry,id)=>({...summary(registry,id),items:[{id:'item-'+id,obligation_id:'obligation-'+id,position:1,record_count:1,result_status:null}]});
const full=(reg,id)=>({...detail(reg,id),has_artifact:true,reconciled_at:Object.keys(results).length===2?'now':null,items:[0,1].map(n=>({id:'item-'+n,position:n,obligation_id:'obligation-'+n,record_count:1,result_status:null,approval_fingerprint:'synthetic',approval_snapshot_json:{historical:true},...results['obligation-'+n]}))});
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-navigation'));
const calls=[],errors=[],checks=[];let mode='',release=null;let posts=0;let results={};
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
 if(u.origin!==base)return route.abort();
 if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
 calls.push({method:req.method(),path:p});
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(req.method()!=='GET'){posts++;if(mode==='timeout')return route.abort('timedout');if(mode==='403'||mode==='409')return json({detail:'Synthetic denied'},Number(mode));for(const item of req.postDataJSON().items)results[item.obligation_id]={...item,errors_json:item.errors,result_recorded_at:'now'};return json(full('frdo',a));}
 if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
 if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
 const m=p.match(/\/(frdo|mintrud)\/batches(?:\/([^/]+))?$/);
 if(m){const [,reg,id]=m;if(!id)return json([summary(reg,a),summary(reg,b)]);
  if(mode==='slow'&&id===a)await new Promise(r=>{release=r});
  if(mode==='error')return json({detail:'Synthetic inaccessible'},404);
  if(mode==='mismatch')return json(detail(reg,b));
  if(mode==='registry')return json(detail(reg==='frdo'?'mintrud':'frdo',id));
  return json(full(reg,id));
 }
 return json([]);
});
const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const selected=()=>page.getByTestId('selected-registry-batch');
const url=(id,reg='frdo')=>base+'/admin/registries?registry='+reg+'&registryView=batches&batchStage=submitted'+(id===null?'':'&batchId='+id);
const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);};
async function shown(id){await selected().getByText('Обязательство: obligation-'+id,{exact:true}).waitFor();}

const area=()=>selected().getByRole('region',{name:'Сверка результатов ФРДО'});
async function save(){await area().getByLabel('Источник результатов (обязательно)').fill('Synthetic source');await area().getByLabel('Результат получен').first().check();await area().getByRole('button',{name:'Сохранить выбранные результаты'}).click();}
try{
 await page.goto(url(a));await area().getByLabel('Результат получен').first().waitFor();check(await page.getByTestId('admin-registries-frdo-batch-results-form').count()===1,'single form selected only');await page.screenshot({path:resolve(out,'before-partial.png'),fullPage:true});
 await save();await area().getByText(/Результат зафиксирован:/).waitFor();check(await area().getByLabel('Результат получен').count()===1,'recorded item read-only partial');check(posts===1,'one partial POST');await page.screenshot({path:resolve(out,'after-partial.png'),fullPage:true});
 await page.reload();await area().getByLabel('Результат получен').waitFor();check(posts===1,'reload partial no POST');
 await save();await area().getByText(/Доступен только просмотр/).waitFor();check(posts===2,'final result form removed');
 for(const failure of ['403','409','timeout']){
  results={};mode=failure;await page.goto(url(a));await save();await area().getByRole('button',{name:'Проверить сохранённые результаты'}).waitFor();check(await area().getByRole('button',{name:'Сохранить выбранные результаты'}).isDisabled(),failure+' blocks repeat');const before=posts;mode='error';await area().getByRole('button',{name:'Проверить сохранённые результаты'}).click();await area().getByRole('alert').waitFor();check(posts===before,failure+' failed GET keeps pending');mode=failure;
  await page.reload();await area().getByRole('button',{name:'Проверить сохранённые результаты'}).waitFor();check(posts===before,failure+' reload no POST');
  await page.getByTestId('admin-registries-frdo-batch-'+b).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await page.goBack();await page.goForward();check(posts===before,failure+' Back Forward no POST');
  // Simulate proof of the committed target; no reset endpoint or storage deletion.
  results={'obligation-0':{result_status:'accepted',external_id:null,errors_json:[],result_recorded_at:'now'}};mode='';await page.goto(url(a));await area().getByRole('heading',{name:'Частичная сверка результатов ФРДО'}).waitFor();await area().getByRole('button',{name:'Проверить сохранённые результаты'}).waitFor({state:'detached'});
 }
 check(errors.length===0,'no page errors');check(calls.filter(c=>c.method!=='GET').every(c=>c.path.endsWith('/results')),'only explicit result writes');await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'partial-mobile.png'),fullPage:true});
}finally{await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,calls,errors},null,2));await context.close();await browser.close();await server.httpServer.close();}
console.log('PASS '+checks.length+' checks');
