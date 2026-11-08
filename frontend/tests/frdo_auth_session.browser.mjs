import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const out=process.env.UI_EVIDENCE_DIR;
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR || 'dist'},preview:{host:'127.0.0.1',port:4195,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4195', id='11111111-1111-4111-8111-111111111111', oldId='22222222-2222-4222-8222-222222222222';
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
  if(req.method()==='POST' && p==='/api/v1/auth/login'){state.actor='synthetic-B';return json({access_token:state.loginToken || 'synthetic-B-token'});}
  if(req.method()!=='GET'){
   state.posts.push({path:p,body:req.postDataJSON()});
   if(req.method()!=='POST'||p!=='/api/v1/admin/frdo/batches')return json({detail:'unexpected write'},405);
   if(state.mode==='slow')await new Promise(r=>state.release=r);
   if(state.mode==='network')return route.abort('failed');
   if(/^\d+$/.test(state.mode))return json({detail:state.mode==='422'?[{msg:'synthetic validation'}]:'synthetic rejection '+state.mode},Number(state.mode));
   if(state.mode==='malformed')return json({...batch,id:'invalid'} ,201);
   state.created=true;return json(batch,201);
  }
  if(p.endsWith('/auth/me'))return json({id:state.actor || 'synthetic-A',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
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
 for (const sameToken of [false,true]) {
  const f=await fixture();if(sameToken) f.state.loginToken='synthetic-creation';
  await f.start();await f.select();f.state.mode='slow';await f.create().click();
  await f.page.waitForTimeout(100);check(f.state.posts.length===1,'one old-session creation before logout '+sameToken);
  await f.page.getByRole('link',{name:'Публичный сайт',exact:true}).click();
  await f.page.getByTestId('public-header-cabinet-button').click();
  await f.page.getByRole('menuitem',{name:'Выйти',exact:true}).click();
  await f.page.getByRole('button',{name:'Войти',exact:true}).click();
  await f.page.locator('#login-email').waitFor();
  check(await f.page.evaluate(()=>sessionStorage.getItem('obrportal_access_token')===null&&localStorage.getItem('obrportal_access_token')===null),'real logout removes token '+sameToken);
  await f.page.locator('#login-email').fill('synthetic-b@example.invalid');await f.page.locator('#login-password').fill('synthetic-password');
  await f.page.locator('form').filter({has:f.page.locator('#login-email')}).getByRole('button',{name:'Войти',exact:true}).click();
  await f.page.getByRole('button',{name:'Профиль администратора',exact:true}).waitFor();
  check(await f.page.evaluate(()=>Boolean(sessionStorage.getItem('obrportal_access_token'))),'real UI login stores token '+sameToken);
  f.state.release();await f.page.waitForTimeout(250);
  check(f.state.calls.filter(c=>c.path.endsWith('/download')).length===0,'late old creation cannot download for new actor '+sameToken);
  check(f.state.posts.length===1,'late old creation cannot cause another POST '+sameToken);
  f.state.mode='';await f.page.goto(base+'/admin/registries?registry=frdo&registryView=batches');await f.form().getByRole('checkbox').first().waitFor();
  check(await f.form().getByRole('button',{name:'Открыть созданную партию'}).count()===0,'new actor never receives old creation proof '+sameToken);
  check(await f.create().isDisabled(),'new actor has no inherited selected records '+sameToken);
  await f.close();
 }
} finally { await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,runs},null,2));await browser.close();await server.httpServer.close(); }
console.log('PASS '+checks.length+' checks');
