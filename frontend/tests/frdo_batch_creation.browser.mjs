import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const out=process.env.UI_EVIDENCE_DIR;
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR || 'dist'},preview:{host:'127.0.0.1',port:4194,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4194', id='11111111-1111-4111-8111-111111111111', oldId='22222222-2222-4222-8222-222222222222';
const row={id:'synthetic-obligation',registry:'frdo',status:'approved',applicability_decision:'required',regulatory_program_type:'vocational_training',user_full_name:'Синтетический слушатель',user_id:'synthetic-user',user_email:'synthetic@example.invalid',course_id:'synthetic-course',course_title:'Синтетический курс',frdo_requirement_mode:'required',readiness_errors:[]};
const batch={id,registry:'frdo',status:'exported',artifact_kind:'frdo_po_xlsx',record_count:1,obligation_count:1,has_artifact:true,artifact_sha256:'a'.repeat(64),generated_at:'2026-11-07',items:[]};
const checks=[],runs=[]; const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);};
async function fixture(){
 const state={rows:[row,{...row,id:'other',registry:'mintrud'},{...row,id:'review',applicability_decision:'needs_review'},{...row,id:'not-required',applicability_decision:'not_required'},{...row,id:'not-approved',status:'ready'},{...row,id:'other-program',regulatory_program_type:'advanced_training'}],posts:[],calls:[],errors:[],mode:'',downloadError:false,created:false,release:null};
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-creation'));
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname;
  if(u.origin!==base)return route.abort();
  if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
  state.calls.push({method:req.method(),path:p,query:u.search});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(req.method()!=='GET'){
   state.posts.push({path:p,body:req.postDataJSON()});
   if(req.method()!=='POST'||p!=='/api/v1/admin/frdo/batches')return json({detail:'unexpected write'},405);
   if(state.mode==='slow')await new Promise(r=>state.release=r);
   if(state.mode==='network')return route.abort('failed');
   if(/^\d+$/.test(state.mode))return json({detail:state.mode==='422'?[{msg:'synthetic validation'}]:'synthetic rejection '+state.mode},Number(state.mode));
   if(state.mode==='malformed')return json({...batch,id:'invalid'} ,201);
   state.created=true;return json(batch,201);
  }
  if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
  if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
  if(p.endsWith('/courses'))return json([{id:row.course_id,title:row.course_title,frdo_requirement_mode:'required'}]);
  if(p.endsWith('/obligations'))return json(p.includes('/frdo/')?state.rows:[]);
  if(p.endsWith('/download'))return state.downloadError?json({detail:'synthetic SHA rejection'},409):route.fulfill({status:200,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers:{'Content-Disposition':'attachment; filename=synthetic-created.xlsx'},body:Buffer.from('PK synthetic XLSX')});
  if(p==='/api/v1/admin/frdo/batches'){const list=[...(state.created?[batch]:[]),{...batch,id:oldId}];if(state.slowHistory){state.slowHistory=false;await new Promise(r=>state.releaseHistory=r);}return json(list);}
  if(p.startsWith('/api/v1/admin/frdo/batches/'))return json({...batch,id:p.split('/').at(-1)});
  return json([]);
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>state.errors.push(e.message));
 const form=()=>page.getByTestId('frdo-batch-creation');
 const create=()=>form().getByTestId('admin-registries-frdo-batch-create');
 const nav=name=>page.getByRole('navigation',{name:'Разделы Госреестров'}).getByRole('button',{name,exact:true});
 const start=async()=>{await page.goto(base+'/admin/registries?registry=frdo&registryView=batches');await form().getByRole('checkbox').first().waitFor();};
 const select=async()=>form().getByRole('button',{name:'Выбрать утверждённые на странице'}).click();
 const close=async()=>{check(state.errors.length===0,'no page errors');check(state.posts.every(p=>p.path==='/api/v1/admin/frdo/batches'),'only creation POST');runs.push(state);await context.close();};
 return {state,page,context,form,create,nav,start,select,close};
}
try {
 let f=await fixture();await f.start();await f.form().screenshot({path:resolve(out,'creation-form.png')});
 check(await f.form().getByRole('checkbox').count()===1,'only approved required PO FRDO selectable');
 check(await f.create().isDisabled(),'empty disabled');check(await f.page.getByTestId('admin-registries-frdo-batches').getByTestId('admin-registries-frdo-batch-create').count()===0,'old form removed');
 await f.select();await f.form().getByRole('button',{name:'Очистить выбор'}).click();check(await f.create().isDisabled(),'clear selection');await f.select();
 f.state.mode='slow';await f.create().evaluate(b=>{b.click();b.click();});
 await f.page.waitForTimeout(150);check(f.state.posts.length===1,'rapid double click one POST');check(await f.create().isDisabled(),'pending disabled');
 await f.page.getByTestId('admin-registries-frdo-batch-'+oldId).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();
 await f.nav('Обзор').click();await f.nav('Партии').click();check(await f.create().isDisabled(),'pending survives view and selected-card navigation');
 f.state.release();await f.form().getByText('Партия создана. Отправка и принятие ещё не подтверждены.').waitFor();
 await f.page.getByTestId('admin-registries-frdo-batch-'+id).waitFor();
 check(f.state.posts[0].body.obligation_ids.length===1 && f.state.posts[0].body.obligation_ids[0]===row.id && Object.keys(f.state.posts[0].body).length===1,'exact unchanged POST body');
 await f.page.waitForTimeout(250);check(f.state.calls.filter(c=>c.path.endsWith('/download')).length===1,'success downloads once');check(await f.create().isDisabled(),'stale approved response cannot repeat successful creation');
 check(!new URL(f.page.url()).searchParams.has('batchId'),'completion does not navigate');
 await f.form().getByRole('button',{name:'Открыть созданную партию'}).click();await f.page.getByTestId('selected-registry-batch').getByRole('button',{name:'Скачать XLSX',exact:true}).waitFor();check(new URL(f.page.url()).searchParams.get('batchId')===id,'explicit open created card');
 check(await f.page.getByTestId('selected-registry-batch').getByRole('button',{name:'Зафиксировать отправку',exact:true}).count()===1,'P5.2 submission remains');
 await f.page.screenshot({path:resolve(out,'created-desktop.png'),fullPage:true});
 await f.page.setViewportSize({width:390,height:844});check(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no horizontal overflow');await f.page.screenshot({path:resolve(out,'created-mobile.png'),fullPage:true});await f.form().screenshot({path:resolve(out,'creation-form-mobile.png')});
 const n=f.state.posts.length;await f.page.reload();await f.form().getByRole('checkbox').first().waitFor();await f.page.goBack();await f.page.goForward();check(f.state.posts.length===n,'reload Back Forward no POST');await f.close();

 for(const mode of ['400','403','409','422','500','network','malformed']) {
  f=await fixture();f.state.mode=mode;await f.start();await f.select();await f.create().click();await f.form().getByRole('alert').waitFor();
  check(f.state.posts.length===1,'no automatic retry '+mode);check(!f.state.calls.some(c=>c.path.endsWith('/download')),'no download after rejection '+mode);
  if(['500','network','malformed'].includes(mode))check(await f.create().isDisabled(),'uncertain outcome blocked '+mode);
  else {check(!(await f.create().isDisabled()),'definitive rejection permits explicit correction '+mode);check((await f.form().getByRole('alert').innerText()).includes('synthetic'),'server validation displayed '+mode);}
  await f.close();
 }
 f=await fixture();f.state.downloadError=true;await f.start();await f.select();await f.create().click();await f.form().getByRole('alert').filter({hasText:'Партия создана, но XLSX не скачан'}).waitFor();
 check(await f.create().isDisabled(),'download failure cannot recreate');await f.form().getByRole('button',{name:'Открыть созданную партию'}).click();await f.page.getByTestId('selected-registry-batch').getByRole('button',{name:'Скачать XLSX',exact:true}).click();check(f.state.posts.length===1,'download retry does not create');await f.close();

 f=await fixture();await f.start();await f.select();await f.page.getByTestId('admin-registries-frdo-scope-review').click();await f.form().getByText(/Создание недоступно/).waitFor();check(await f.create().count()===0,'review no create');
 await f.page.getByTestId('admin-registries-frdo-scope-history').click();check(await f.create().count()===0,'history no create');
 await f.nav('Минтруд').click();await f.nav('Партии').click();check(!(await f.form().isVisible()),'Mintrud no FRDO form');check(f.state.posts.length===0,'read-only navigation no writes');await f.close();

 f=await fixture();f.state.rows=Array.from({length:1002},(_,i)=>({...row,id:'synthetic-'+i}));await f.start();await f.select();check((await f.form().innerText()).includes('Выбрано: 1001 / 1001'),'select all capped 1001');
 await f.form().getByRole('checkbox').last().check();check(await f.create().isDisabled(),'1002 selection blocked');await f.close();

 f=await fixture();await f.start();await f.select();f.state.rows=[{...row,status:'ready'}];await f.page.getByTestId('admin-registries-filter-course').selectOption(row.course_id);await f.form().getByText(/нет доступных утверждённых/).waitFor();check(await f.create().isDisabled(),'approval loss prunes selection');check(f.state.posts.length===0,'approval loss no POST');await f.close();

 f=await fixture();await f.start();await f.select();f.state.mode='slow';await f.create().click();await f.page.waitForTimeout(100);await f.nav('Минтруд').click();f.state.release();await f.page.waitForTimeout(350);check(new URL(f.page.url()).searchParams.get('registry')==='mintrud','late create does not change registry');await f.nav('ФРДО').click();await f.nav('Партии').click();await f.form().getByRole('button',{name:'Открыть созданную партию'}).waitFor();check(await f.create().isDisabled(),'reservation survives registry switch');await f.close();
 f=await fixture();f.state.slowHistory=true;await f.start();await f.select();await f.create().click();await f.page.getByTestId('admin-registries-frdo-batch-'+id).waitFor();f.state.releaseHistory();await f.page.waitForTimeout(200);check(await f.page.getByTestId('admin-registries-frdo-batch-'+id).isVisible(),'late old history cannot hide created batch');await f.close();
} finally {
 await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,runs},null,2));await browser.close();await server.httpServer.close();
}
console.log('PASS '+checks.length+' checks');
