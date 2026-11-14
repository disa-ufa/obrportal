// P6.2: real production UI, in-memory synthetic API only. No external registry I/O.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const out=process.env.UI_EVIDENCE_DIR;
assert.ok(out,'UI_EVIDENCE_DIR required');await mkdir(out,{recursive:true});
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR || 'dist'},preview:{host:'127.0.0.1',port:4194,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4194',a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const checks=[],runs=[];let complete=false;
const check=(value,name)=>{assert.ok(value,name);checks.push(name);};
const row=n=>({id:'synthetic-obligation-'+n,registry:'frdo',status:'approved',applicability_decision:'required',regulatory_program_type:'vocational_training',user_full_name:'Синтетический слушатель '+n,user_id:'synthetic-user-'+n,user_email:'synthetic@example.invalid',course_id:'synthetic-course',course_title:'Синтетический курс',frdo_requirement_mode:'required',readiness_errors:[]});
const sp='obrportal:frdo:submit-pending:v1:',rp='obrportal:frdo:result-pending:v1:';
async function fixture(name,stage='exported'){
 const state={name,calls:[],unexpected:[],errors:[],created:false,sent:new Set(stage==='submitted'?[a,b]:[]),results:{},mode:'',operation:'',holdGet:false,release:null,releaseGet:null,manualSent:false};
 const full=(id=a)=>({id,registry:'frdo',status:state.sent.has(id)?'submitted':'exported',artifact_kind:'frdo_po_xlsx',record_count:2,obligation_count:2,has_artifact:true,artifact_sha256:'a'.repeat(64),generated_at:'2026-11-08T10:00:00Z',submitted_at:state.sent.has(id)?'2026-11-08T11:00:00Z':null,submitted_by_user_id:state.sent.has(id)?'synthetic-actor':null,external_reference:state.sent.has(id)?'synthetic-manual-ref':null,reconciled_at:Object.keys(state.results[id]||{}).length===2?'2026-11-08T12:00:00Z':null,items:[0,1].map(n=>({id:'item-'+id+'-'+n,obligation_id:row(n).id+(id===a?'':'-B'),position:n,record_count:1,result_status:null,approval_fingerprint:'synthetic',approval_snapshot_json:{historical:true},...(state.results[id]?.[row(n).id+(id===a?'':'-B')]||{})}))});
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-operator'));
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname,method=req.method();
  if(u.origin!==base){state.unexpected.push(method+' '+u.origin);return route.abort();}
  if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
  const entry={method,path:p};state.calls.push(entry);
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(method!=='GET'){
   const m=p.match(/^\/api\/v1\/admin\/frdo\/batches(?:\/([^/]+)\/(submitted|results))?$/);
   if(method!=='POST'||!m){state.unexpected.push(method+' '+p);return json({detail:'Unexpected write'},405);}
   entry.body=req.postDataJSON();const op=m[2]||'create',id=m[1]||a;
   if(state.operation===op){
    if(state.mode==='slow')await new Promise(r=>state.release=r);
    if(['timeout','network'].includes(state.mode))return route.abort(state.mode==='timeout'?'timedout':'failed');
    if(/^\d+$/.test(state.mode))return json({detail:'synthetic '+op+' rejection '+state.mode},Number(state.mode));
   }
   if(op==='create')state.created=true;
   if(op==='submitted')state.sent.add(id);
   if(op==='results')for(const item of entry.body.items){state.results[id]??={};state.results[id][item.obligation_id]={...item,errors_json:item.errors,result_recorded_at:'2026-11-08T12:00:00Z'};}
   return json(full(id),op==='create'?201:200);
  }
  if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
  if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
  if(p.endsWith('/courses'))return json([{id:'synthetic-course',title:'Синтетический курс',frdo_requirement_mode:'required'}]);
  if(p.endsWith('/obligations'))return json(p.includes('/frdo/')?[row(0),row(1),{...row(2),applicability_decision:'not_required'},{...row(3),status:'ready'},{...row(4),regulatory_program_type:'advanced_training'}]:[]);
  if(p.endsWith('/download'))return route.fulfill({status:200,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers:{'Content-Disposition':'attachment; filename=synthetic-operator.xlsx'},body:Buffer.from('PK synthetic operator XLSX')});
  const m=p.match(/\/(frdo|mintrud)\/batches(?:\/([^/]+))?$/);
  if(m){const [,reg,id]=m;if(!id)return json((state.created?[full(a),full(b)]:[full(b)]).map(d=>({...d,registry:reg})));
   if(state.holdGet&&id===a)await new Promise(r=>state.releaseGet=r);
   return json({...full(id),registry:reg});}
  return json([]);
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>state.errors.push(e.message));
 const url=(id=null,reg='frdo')=>base+'/admin/registries?registry='+reg+'&registryView=batches'+(id?'&batchId='+id:'');
 const card=()=>page.getByTestId('selected-registry-batch');
 const submission=()=>card().getByRole('region',{name:'Подтверждение отправки ФРДО'});
 const results=()=>card().getByRole('region',{name:'Сверка результатов ФРДО'});
 const creation=()=>page.getByTestId('frdo-batch-creation');
 const posts=()=>state.calls.filter(c=>c.method==='POST');
 const journal=prefix=>page.evaluate(key=>localStorage.getItem(key),prefix+a);
 const shown=async id=>card().getByText('Обязательство: '+row(0).id+(id===a?'':'-B'),{exact:true}).first().waitFor();
 const select=async id=>{await page.getByTestId('admin-registries-frdo-batch-'+id).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await shown(id);};
 const confirm=async()=>{await submission().getByRole('button',{name:'Зафиксировать отправку',exact:true}).click();await submission().getByLabel('Внешний номер отправки (необязательно)').fill(' synthetic-manual-ref ');await submission().getByRole('button',{name:'Подтвердить фактическую отправку',exact:true}).click();};
 const save=async()=>{await results().getByLabel('Источник результатов (обязательно)').fill('Synthetic operator protocol');await results().getByLabel('Результат получен').first().check();await results().getByRole('button',{name:'Сохранить выбранные результаты'}).click();};
 const create=async()=>{await creation().getByRole('checkbox').first().waitFor();await creation().getByRole('button',{name:'Выбрать утверждённые на странице'}).click();await creation().getByTestId('admin-registries-frdo-batch-create').evaluate(el=>{el.click();el.click();});};
 const waitHeld=async key=>{await page.waitForFunction(()=>true);for(let n=0;!state[key]&&n<100;n++)await new Promise(r=>setTimeout(r,20));assert.ok(state[key],'held '+key);};
 const close=async()=>{check(state.errors.length===0,name+': no page errors');check(state.unexpected.length===0,name+': no external or unexpected writes');runs.push({...state,sent:[...state.sent],release:undefined,releaseGet:undefined});await context.close();};
 return {state,full,page,context,url,card,submission,results,creation,posts,journal,shown,select,confirm,save,create,waitHeld,close};
}
try{
 // A continuous operator cycle, including evidence of a real browser download.
 let f=await fixture('complete-cycle');await f.page.goto(f.url());
 await f.creation().getByRole('checkbox').first().waitFor();check(await f.creation().getByRole('checkbox').count()===2,'only required approved vocational records');
 const firstDownload=f.page.waitForEvent('download');await f.create();check((await firstDownload).suggestedFilename()==='synthetic-operator.xlsx','creation downloads XLSX');
 await f.page.getByTestId('admin-registries-frdo-batch-'+a).waitFor();await f.creation().getByRole('button',{name:'Открыть созданную партию'}).click();await f.shown(a);
 check(f.posts().length===1 && f.posts()[0].body.obligation_ids.length===2,'one create POST with selected records');
 const savedDownload=f.page.waitForEvent('download');await f.card().getByRole('button',{name:'Скачать XLSX',exact:true}).click();await savedDownload;check(f.posts().length===1,'existing batch download is GET only');
 f.state.manualSent=true;check(f.state.manualSent,'manual external upload simulated in fixture only');
 f.state.holdGet=true;await f.confirm();await f.waitHeld('releaseGet');check(Boolean(await f.journal(sp)),'POST alone preserves submission pending');
 check(f.posts().length===2,'one submission POST');f.state.holdGet=false;f.state.releaseGet();await f.submission().getByText('Подтверждение получено',{exact:true}).waitFor();check(await f.journal(sp)===null,'sufficient GET clears submission pending');
 await f.card().screenshot({path:resolve(out,'cycle-submitted.png')});
 await f.save();await f.results().getByText(/Результат зафиксирован:/).waitFor();check(await f.results().getByLabel('Результат получен').count()===1,'partial results keep only remaining item editable');
 await f.card().screenshot({path:resolve(out,'cycle-partial.png')});await f.page.reload();await f.results().getByLabel('Результат получен').waitFor();check(f.posts().length===3,'reload partial no POST');
 await f.select(b);await f.page.goBack();await f.results().getByLabel('Результат получен').waitFor();await f.page.goForward();await f.shown(b);await f.page.goBack();await f.results().getByLabel('Результат получен').waitFor();check(f.posts().length===3,'Back Forward selected batches no POST');
 await f.save();await f.results().getByText(/Доступен только просмотр/).waitFor();check(f.posts().length===4,'two explicit result POSTs total');
 const resultPosts=f.posts().filter(c=>c.path.endsWith('/results'));check(resultPosts[0].body.items[0].obligation_id!==resultPosts[1].body.items[0].obligation_id,'final POST contains only remaining obligation');
 check(await f.journal(rp)===null,'full result proof clears pending');await f.page.reload();await f.results().getByText(/Доступен только просмотр/).waitFor();check(await f.card().getByText(/Принято/, {exact:false}).count()>0,'final results rendered');
 await f.page.getByRole('combobox',{name:'Стадия партии'}).selectOption('reconciled');await f.page.getByTestId('admin-registries-frdo-batch-'+a).waitFor();check(await f.page.getByTestId('admin-registries-frdo-batch-'+a).count()===1,'reconciled history has one matching batch');
 await f.select(a);await f.card().screenshot({path:resolve(out,'cycle-final.png')});await f.page.setViewportSize({width:390,height:844});await f.card().screenshot({path:resolve(out,'cycle-mobile.png')});check(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no overflow');
 const before=f.posts().length;await f.page.getByRole('group',{name:'Реестр партий'}).getByRole('button',{name:'Минтруд · XML v1.0.9',exact:true}).click();await f.page.getByRole('group',{name:'Реестр партий'}).getByRole('button',{name:'ФРДО · XLSX',exact:true}).click();check(f.posts().length===before,'registry navigation no POST');
 complete=true;await f.close();

 // Independent contexts: errors cannot contaminate another scenario's journals.
 for(const operation of ['create','submitted','results'])for(const failure of ['403','409','422','503','timeout','network']){
  f=await fixture(operation+'-'+failure,operation==='results'?'submitted':'exported');f.state.operation=operation;f.state.mode=failure;
  await f.page.goto(f.url(operation==='create'?null:a));
  if(operation==='create'){await f.create();await f.creation().getByRole('alert').waitFor();}
  if(operation==='submitted'){await f.confirm();await f.submission().getByText(/Результат операции неизвестен/).waitFor();check(Boolean(await f.journal(sp)),operation+' '+failure+' retains journal');}
  if(operation==='results'){await f.save();await f.results().getByRole('button',{name:'Проверить сохранённые результаты'}).waitFor();check(Boolean(await f.journal(rp)),operation+' '+failure+' retains journal');}
  check(f.posts().length===1,operation+' '+failure+' no automatic retry');
  if(operation!=='create'){
   await f.page.reload();if(operation==='submitted')await f.submission().getByText(/Результат операции неизвестен/).waitFor();else await f.results().getByRole('button',{name:'Проверить сохранённые результаты'}).waitFor();
   check(f.posts().length===1,operation+' '+failure+' reload GET only');
  }else if(['503','timeout','network'].includes(failure))check(await f.creation().getByTestId('admin-registries-frdo-batch-create').isDisabled(),'uncertain creation blocked only in current page '+failure);
  await f.close();
 }

 for(const operation of ['submitted','results']){
  f=await fixture('storage-'+operation,operation==='results'?'submitted':'exported');await f.page.goto(f.url(a));await f.shown(a);
  await f.page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('synthetic storage unavailable');};});
  if(operation==='submitted'){await f.confirm();await f.submission().getByText(/Результат операции неизвестен/).waitFor();}else{await f.save();await f.results().getByRole('alert').waitFor();}
  check(f.posts().length===0,'storage unavailable prevents '+operation+' POST');await f.close();
 }

 // Late A mutation response must preserve B's current form, data and selection.
 for(const operation of ['submitted','results']){
  f=await fixture('late-'+operation,operation==='results'?'submitted':'exported');f.state.created=true;f.state.operation=operation;f.state.mode='slow';await f.page.goto(f.url(a));
  if(operation==='submitted')await f.confirm();else await f.save();await f.waitHeld('release');await f.select(b);
  const draft=operation==='submitted'?f.submission().getByLabel('Внешний номер отправки (необязательно)'):f.results().getByLabel('Источник результатов (обязательно)');
  if(operation==='submitted')await f.submission().getByRole('button',{name:'Зафиксировать отправку',exact:true}).click();await draft.fill('B synthetic draft');
  f.state.mode='';f.state.release();await f.page.waitForTimeout(300);
  check(new URL(f.page.url()).searchParams.get('batchId')===b,'late '+operation+' A keeps B selected');check(await draft.inputValue()==='B synthetic draft','late '+operation+' A preserves B draft');
  check(await f.results().getByText(/Результат зафиксирован:/).count()===0,'late '+operation+' A does not replace B results');check(f.posts().length===1,'late '+operation+' no repeat POST');await f.close();
 }
}finally{
 await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({completeOperatorCycle:complete,checks,runs},null,2));await browser.close();await server.httpServer.close();
}
console.log('PASS '+checks.length+' checks; COMPLETE_OPERATOR_CYCLE='+complete);
