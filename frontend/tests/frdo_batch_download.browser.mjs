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
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-navigation'));
const calls=[],errors=[],checks=[];let mode='',release=null;let downloadCalls=0;let missing=false;let created=0,revoked=0;
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
 if(u.origin!==base)return route.abort();
 if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
 calls.push({method:req.method(),path:p});
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(p.endsWith('/download')){downloadCalls++;if(mode==='slow')await new Promise(r=>{release=r});if(mode==='network')return route.abort('failed');if(['403','404','409'].includes(mode))return json({detail:'synthetic'},Number(mode));return route.fulfill({status:200,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers:{'Content-Disposition':'attachment; filename=synthetic-frdo.xlsx'},body:Buffer.from('PK synthetic XLSX')});}
 if(req.method()!=='GET')return json({detail:'Unexpected write'},405);
 if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
 if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
 const m=p.match(/\/(frdo|mintrud)\/batches(?:\/([^/]+))?$/);
 if(m){const [,reg,id]=m;if(!id)return json([summary(reg,a),summary(reg,b)]);
  if(mode==='slow'&&id===a)await new Promise(r=>{release=r});
  if(mode==='error')return json({detail:'Synthetic inaccessible'},404);
  if(mode==='mismatch')return json(detail(reg,b));
  if(mode==='registry')return json(detail(reg==='frdo'?'mintrud':'frdo',id));
  return json({...detail(reg,id),has_artifact:!missing,items:detail(reg,id).items.map(i=>({...i,result_status:'accepted',result_recorded_at:'now'}))});
 }
 return json([]);
});
const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const selected=()=>page.getByTestId('selected-registry-batch');
const url=(id,reg='frdo')=>base+'/admin/registries?registry='+reg+'&registryView=batches&batchStage=submitted'+(id===null?'':'&batchId='+id);
const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);};
async function shown(id){await selected().getByText('Обязательство: obligation-'+id,{exact:true}).waitFor();}

const downloadButton=()=>selected().getByRole('button',{name:'Скачать XLSX',exact:true});
try{
 await page.goto(url(a));await downloadButton().waitFor();check(downloadCalls===0,'no automatic download direct URL');check(await page.getByRole('button',{name:'Скачать XLSX',exact:true}).count()===1,'only selected button');
 await page.evaluate(()=>{window.__urls={created:0,revoked:0};const c=URL.createObjectURL.bind(URL),r=URL.revokeObjectURL.bind(URL);URL.createObjectURL=b=>{window.__urls.created++;return c(b)};URL.revokeObjectURL=u=>{window.__urls.revoked++;return r(u)};});
 const file=page.waitForEvent('download');await downloadButton().click();check((await file).suggestedFilename()==='synthetic-frdo.xlsx','server filename');await page.waitForFunction(()=>window.__urls.revoked===1);check(await page.evaluate(()=>window.__urls.created===1),'object URL cleaned');
 for(const failure of ['403','404','409','network']){mode=failure;await downloadButton().click();await selected().getByRole('region',{name:'Скачивание XLSX'}).getByRole('alert').waitFor();check(true,'download error '+failure);}
 mode='slow';const before=downloadCalls;await downloadButton().click();await selected().getByRole('button',{name:'Скачивание XLSX…'}).waitFor();check(await selected().getByRole('button',{name:'Скачивание XLSX…'}).isDisabled(),'duplicate click disabled');
 await page.getByTestId('admin-registries-frdo-batch-'+b).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await downloadButton().waitFor();mode='';release?.();await page.waitForTimeout(200);check(new URL(page.url()).searchParams.get('batchId')===b,'late download no navigation');check(downloadCalls===before+1,'one slow request');
 const count=downloadCalls;await page.reload();await downloadButton().waitFor();await page.goBack();await downloadButton().waitFor();await page.goForward();await downloadButton().waitFor();check(downloadCalls===count,'reload Back Forward no download');
 missing=true;await page.goto(url(a));await selected().getByText('Сохранённый файл XLSX не указан. Скачивание недоступно.').waitFor();check(await downloadButton().count()===0,'missing artifact no button');missing=false;
 await page.goto(url(a,'mintrud'));await selected().getByRole('heading',{name:'Минтруд · XML'}).waitFor();check(await selected().getByRole('region',{name:'Скачивание XLSX'}).count()===0,'Mintrud unchanged');
 await page.goto(url(a));await downloadButton().waitFor();check((await selected().innerText()).includes('Принято'),'card still shows partial results');await page.screenshot({path:resolve(out,'selected-download.png'),fullPage:true});check(errors.length===0,'no page errors');check(calls.every(c=>c.method==='GET'),'no POST');
}finally{await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,calls,errors,downloadCalls},null,2));await context.close();await browser.close();await server.httpServer.close();}
console.log('PASS '+checks.length+' checks');
