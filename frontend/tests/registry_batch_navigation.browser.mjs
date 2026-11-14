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
const calls=[],errors=[],checks=[];let mode='',release=null;
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url()),p=u.pathname;
 if(u.origin!==base)return route.abort();
 if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
 calls.push({method:req.method(),path:p});
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(req.method()!=='GET')return json({detail:'Unexpected write'},405);
 if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
 if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
 const m=p.match(/\/(frdo|mintrud)\/batches(?:\/([^/]+))?$/);
 if(m){const [,reg,id]=m;if(!id)return json([summary(reg,a),summary(reg,b)]);
  if(mode==='slow'&&id===a)await new Promise(r=>{release=r});
  if(mode==='error')return json({detail:'Synthetic inaccessible'},404);
  if(mode==='mismatch')return json(detail(reg,b));
  if(mode==='registry')return json(detail(reg==='frdo'?'mintrud':'frdo',id));
  return json(detail(reg,id));
 }
 return json([]);
});
const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const selected=()=>page.getByTestId('selected-registry-batch');
const url=(id,reg='frdo')=>base+'/admin/registries?registry='+reg+'&registryView=batches&batchStage=submitted'+(id===null?'':'&batchId='+id);
const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);};
async function shown(id){await selected().getByText('Обязательство: obligation-'+id,{exact:true}).waitFor();}
try{
 await page.goto(url(a));await shown(a);check(true,'direct URL');await page.screenshot({path:resolve(out,'direct-url.png'),fullPage:true});
 mode='registry';await selected().getByRole('button',{name:'Обновить состав',exact:true}).click();await selected().getByRole('alert').waitFor();check(true,'refresh rejects wrong registry');mode='';await selected().getByRole('button',{name:'Повторить чтение',exact:true}).click();await shown(a);
 await page.reload();await shown(a);check(true,'reload restores');
 const rows=()=>page.getByTestId('admin-registries-frdo-batch-'+b);
 await rows().getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await shown(b);check(new URL(page.url()).searchParams.get('batchId')===b,'selection updates URL');
 await page.goBack();await shown(a);await page.goForward();await shown(b);check(true,'Back Forward restores selection');await page.screenshot({path:resolve(out,'forward.png'),fullPage:true});
 await selected().getByRole('button',{name:'Закрыть выбранную партию',exact:true}).click();await selected().waitFor({state:'detached'});check(!new URL(page.url()).searchParams.has('batchId'),'close removes id');check(new URL(page.url()).searchParams.get('batchStage')==='submitted','close retains stage');
 await page.goBack();await shown(b);
 await page.getByRole('combobox',{name:'Стадия партии'}).selectOption('exported');await selected().waitFor({state:'detached'});check(!new URL(page.url()).searchParams.has('batchId'),'stage clears selection');await page.goBack();await shown(b);check(true,'Back restores stage and selection');
 await page.getByRole('group',{name:'Реестр партий'}).getByRole('button',{name:'Минтруд · XML v1.0.9',exact:true}).click();await selected().waitFor({state:'detached'});check(new URL(page.url()).searchParams.get('registry')==='mintrud','registry switches');await page.goBack();await shown(b);check(true,'Back restores registry selection');
 await page.goto(url(h,'mintrud'));await shown(h);check(true,'historical outside list');check((await selected().innerText()).includes('Режим просмотра'),'read-only');check((await selected().innerText()).includes('не предоставляет право экспорта'),'export not inferred');
 for(const bad of ['bad-uuid',null]){const before=calls.length;await page.goto(url(bad));if(bad)await selected().getByRole('alert').waitFor();else await page.getByRole('heading',{name:'Партии и отправки',exact:true}).waitFor();check(!calls.slice(before).some(c=>c.path.endsWith('/batches/'+bad)),'invalid or absent UUID no detail GET '+bad);}
 mode='error';await page.goto(url(h));await selected().getByRole('alert').waitFor();mode='';await selected().getByRole('button',{name:'Повторить чтение партии'}).click();await shown(h);check(true,'GET error retry');
 mode='mismatch';await page.goto(url(a));await selected().getByRole('alert').waitFor();check(await selected().getByText('Обязательство: obligation-'+b).count()===0,'wrong response UUID rejected');
 mode='registry';await page.goto(url(a));await selected().getByRole('alert').waitFor();check(true,'wrong response registry rejected');
 mode='slow';await page.goto(url(a));await page.waitForFunction(()=>document.querySelector('[data-testid="selected-registry-batch"]')?.textContent.includes('Загрузка'));
 await page.getByTestId('admin-registries-frdo-batch-'+b).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await shown(b);mode='';release?.();await page.waitForTimeout(200);check(await selected().getByText('Обязательство: obligation-'+a,{exact:true}).count()===0,'late response cannot overwrite new selection');
 check(errors.length===0,'no page errors');check(calls.every(c=>c.method==='GET'),'no POST or other writes');await page.screenshot({path:resolve(out,'stale-guard.png'),fullPage:true});
} finally {
 await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,calls,errors},null,2));await context.close();await browser.close();await server.httpServer.close();
}
console.log('PASS '+checks.length+' browser checks');
