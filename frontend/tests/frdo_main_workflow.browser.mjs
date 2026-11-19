// Fresh browser only. Every API request intercepted; no real backend traffic.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const output=process.env.UI_EVIDENCE_DIR;
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR || resolve(output,'build')},preview:{host:'127.0.0.1',port:4193,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4193';let checks=0;const logs=[],proofChecks=[];
const check=(x,m)=>{assert.ok(x,m);checks++;proofChecks.push(m);};
const row={id:'synthetic-row',registry:'frdo',status:'pending_data',user_full_name:'Синтетический слушатель',user_email:'test@example.invalid',user_id:'synthetic-user',course_id:'synthetic-course',course_title:'Синтетический курс',frdo_requirement_mode:'required',mintrud_requirement_mode:'required',regulatory_program_type:'vocational_training',readiness_errors:[],applicability_decision:'required'};
async function fixture(){
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});const state={write:true,fail:false,empty:false,gate:null,rows:null,protocols:null,protocolError:false,requests:[],posts:[],errors:[]};
 await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-ui-r12'));
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname;if(u.origin!==base)return route.abort();if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
  state.requests.push(p);const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(req.method()!=='GET'){state.posts.push(p);if(p.endsWith('/validate'))return json({obligation:{...row,status:'ready'},issues:[]});return json({detail:'synthetic server rejection'},403);}
  if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
  if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:state.write}});
  if(p.endsWith('/courses'))return json([{id:row.course_id,title:row.course_title,frdo_requirement_mode:'required',mintrud_requirement_mode:'required'}]);
  if(p.endsWith('/obligations')){
   const registry=p.includes('/mintrud/')?'mintrud':'frdo';if(registry==='mintrud'&&state.gate)await state.gate;
   if(state.fail)return json({detail:'Synthetic access unavailable'},503);
   if(state.empty)return json([]);
   if(state.rows)return json(state.rows.map(r=>({...row,registry,...r})));
   return json([{...row,registry,user_full_name:registry==='mintrud'?'Минтруд слушатель':row.user_full_name}]);
  }
  if(p.includes('/protocol-drafts/by-obligation/') && state.protocolGate)await state.protocolGate;
  if(p.includes('/protocol-drafts/by-obligation/') && state.protocolError)return json({detail:'Synthetic protocol unavailable'},503);
  if(p.includes('/protocol-drafts/by-obligation/') && state.protocols)return json({protocols:state.protocols});
  if(p.includes('/protocol-drafts/by-obligation/'))return json({protocols:[{id:'synthetic-protocol',course_id:row.course_id,protocol_number:'SYNTHETIC-P',status:'draft',fields:{},conflict_fields:[],history_reasons:[]}]});
  if(p.includes('/learner-profile'))return json({});
  return json([]);
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>state.errors.push(e.message));
 const nav=label=>page.getByRole('navigation',{name:'Разделы Госреестров'}).getByRole('button',{name:label,exact:true});
 const close=async()=>{check(state.errors.length===0,state.errors.join('\n'));logs.push({requests:state.requests,posts:state.posts,errors:state.errors});await context.close();};
 return {page,context,state,nav,close};
}
try{
 const f=await fixture(),{page,state}=f;
 await page.goto(base+'/admin/registries');await page.getByRole('region',{name:'Рабочая сводка'}).waitFor();await page.getByRole('button',{name:/Требуют проверки данных\s*1/}).waitFor();
 check(state.posts.length===0,'overview is read-only');check(!state.requests.some(x=>x.includes('learner-profile')),'no hidden profile N+1');
 await page.screenshot({path:resolve(output,'overview.png'),fullPage:true});
 await f.nav('ФРДО').click();await page.getByText(row.user_full_name,{exact:true}).waitFor();
 check(page.url().includes('registryView=work'),'URL section');
 check(await page.getByTestId('admin-registries-table').getByRole('columnheader',{name:'Слушатель'}).count()===1,'Russian columns');
 check(await page.getByTestId('registry-next-action').getByRole('button').count()===1,'single primary action');
 const refreshed=page.waitForResponse(r=>r.url().includes('/obligations')&&r.request().method()==='GET'); await page.getByTestId('registry-next-action').getByRole('button',{name:'Проверить готовность'}).click(); await refreshed;
 check(state.posts.length===1&&state.posts[0].endsWith('/validate'),'only explicit validation write');
 await page.getByText('Подробности и другие действия',{exact:true}).click();
 await page.getByRole('button',{name:'Данные ФРДО',exact:true}).waitFor(); check(true,'existing data action preserved');
 await page.getByTestId('admin-registries-filter-course').selectOption(row.course_id);
 await page.getByText(row.user_full_name,{exact:true}).waitFor();await f.nav('Обзор').click();await f.nav('ФРДО').click();
 check(await page.getByTestId('admin-registries-filter-course').inputValue()===row.course_id,'view switch preserves filter');
 await page.goBack();await page.goForward();await page.getByText(row.user_full_name,{exact:true}).waitFor();check(true,'back forward retains rows');
 await page.getByTestId('admin-registries-frdo-scope-review').click();await page.getByText(row.user_full_name,{exact:true}).waitFor();
 check((await page.getByTestId('registry-next-action').innerText()).includes('Только просмотр'),'review read-only explanation');
 check(await page.getByRole('button',{name:'Утвердить',exact:true}).count()===0,'review no approval');
 let release;state.gate=new Promise(r=>release=r);await f.nav('Минтруд').click();await f.nav('ФРДО').click();release();await page.getByText(row.user_full_name,{exact:true}).waitFor();
 check(await page.getByText('Минтруд слушатель',{exact:true}).count()===0,'late other-registry response ignored');state.gate=null;
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'main-compatible FRDO mobile no overflow');
 state.empty=true;await page.goto(base+'/admin/registries?registry=frdo&registryView=work');await page.getByText(/Это не подтверждает отсутствие записей/).waitFor();check(true,'honest empty state');
 state.fail=true;await page.reload();await page.getByTestId('admin-registries-error').waitFor();check(true,'API error visible');
 state.fail=false;state.empty=false;
 const rowAt=id=>page.getByTestId('admin-registries-table').locator('tbody > tr').filter({has:page.locator(`[id="registry-details-${id}"]`)});
 state.rows=[];await page.goto(base+'/admin/registries?registry=frdo&registryView=work');await page.getByText(/Это не подтверждает отсутствие записей/).waitFor();await f.nav('Обзор').click();
 await page.getByText(/В выбранной выборке ФРДО записи не получены/).waitFor();
 check(await page.getByRole('region',{name:'Рабочая сводка'}).getByRole('button').count()===0,'empty FRDO overview has no zero cards');
 await page.screenshot({path:resolve(output,'overview-frdo-empty.png'),fullPage:true});
 state.rows=[{id:'frdo-profile',readiness_errors:[{code:'learner_profile.birth_date_missing'}]},{id:'frdo-context',readiness_errors:[{code:'frdo.context_missing'}]},{id:'frdo-export',status:'exported'}];
 await page.goto(base+'/admin/registries?registry=frdo&registryView=work');await page.getByText(row.user_full_name,{exact:true}).first().waitFor();
 check(await rowAt('frdo-profile').getByTestId('registry-next-action').getByRole('button',{name:'Заполнить профиль слушателя'}).isVisible(),'FRDO profile target');
 check(await rowAt('frdo-context').getByTestId('registry-next-action').getByRole('button',{name:'Заполнить данные ФРДО'}).isVisible(),'FRDO context target');
 await page.screenshot({path:resolve(output,'desktop-frdo.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,'mobile-frdo-full.png'),fullPage:true});await page.evaluate(()=>window.scrollTo(0,document.querySelector('[data-testid=admin-registries-table]').getBoundingClientRect().top+window.scrollY-145));await page.screenshot({path:resolve(output,'mobile-frdo.png')});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'FRDO mobile no overflow');
 state.rows=[{id:'frdo-approved-1',status:'approved',user_full_name:'Первый кандидат'},{id:'frdo-approved-2',status:'approved',user_full_name:'Второй кандидат'}];
 await page.goto(base+'/admin/registries?registry=frdo&registryView=work');await page.getByText('Первый кандидат',{exact:true}).waitFor();
 await rowAt('frdo-approved-1').getByTestId('registry-next-action').getByRole('button').click();await page.getByTestId('registry-batch-workspace').waitFor();
 check(await page.getByTestId('frdo-batch-creation').getByRole('checkbox').count()===1,'FRDO batch form is scoped to the requested record');
 await page.getByRole('button',{name:'Все кандидаты',exact:true}).click();
 check(await page.getByTestId('frdo-batch-creation').getByRole('checkbox').count()===2,'full existing batch selection remains available');
 check(await page.getByTestId('admin-registries-frdo-batches').getByRole('checkbox').count()===0,'history has no duplicate creation form');
 state.rows=[{id:'main-pending',user_full_name:'Минтруд основной интерфейс',status:'pending_data'},{id:'main-approved',user_full_name:'Минтруд утверждено',status:'approved'}];
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/admin/registries?registry=mintrud&registryView=work');
 await page.getByText('Минтруд основной интерфейс',{exact:true}).waitFor();
 check(await page.getByTestId('admin-registries-tab-mintrud').isVisible(),'main existing Mintrud tab preserved');
 const mainRow=page.getByTestId('admin-registries-table').locator('tbody > tr').filter({hasText:'Минтруд основной интерфейс'});
 check(await mainRow.getByRole('button',{name:'Проверить',exact:true}).isEnabled(),'main validation availability preserved');
 const before=state.posts.length;await mainRow.getByRole('button',{name:'Проверить',exact:true}).click();
 await page.waitForTimeout(200);check(state.posts.length===before+1&&state.posts.at(-1).includes('/mintrud/'),'main explicit validation uses Mintrud endpoint');
 await mainRow.getByRole('button',{name:'Исправить данные',exact:true}).click();await page.waitForTimeout(250);await writeFile(resolve(output,'main-editor-diagnostic.json'),JSON.stringify({errors:state.errors,text:await page.locator('body').innerText()},null,2));await page.getByTestId('admin-registries-learner-profile-form').waitFor();check(true,'main real learner profile editor preserved');
 await page.getByTestId('admin-registries-learner-profile-form').getByRole('button',{name:'Закрыть',exact:true}).click();
 await mainRow.getByRole('button',{name:'Данные Минтруда',exact:true}).click();await page.getByTestId('admin-registries-mintrud-context-form').waitFor();check(true,'main real context form preserved');
 const batchTools=page.getByTestId('admin-registries-mintrud-batch');
 await batchTools.getByTestId('admin-registries-mintrud-batch-select-all').click();
 check(await page.getByTestId('admin-registries-mintrud-batch-select-main-approved').isChecked(),'main approved batch selection preserved');
 await batchTools.getByTestId('admin-registries-mintrud-batch-download').click();
 await page.getByTestId('admin-registries-error').waitFor();check(state.posts.at(-1)==='/api/v1/admin/mintrud/batches','main batch keeps original POST endpoint and server rejection');
 check(!state.requests.some(p=>p.includes('/scans')||p.includes('/signatures')) && !state.posts.some(p=>p.includes('/me/permissions')),'main uses existing GET-only permissions without scan/signature writes');
 const protocolLinks=await page.getByTestId('admin-registries-mintrud-context-form').locator('a[href^="/admin/knowledge-protocols"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 check(protocolLinks.length>0 && protocolLinks.every(href=>href==='/admin/knowledge-protocols/synthetic-protocol'),'all M4 restored form links target the actual matching protocol card: '+JSON.stringify(protocolLinks));
 check(!(await page.getByTestId('frdo-batch-creation').isVisible()),'Mintrud never mounts a competing FRDO form');
 await page.screenshot({path:resolve(output,'main-mintrud.png'),fullPage:true});
 await f.close();console.log(JSON.stringify({checks,logs},null,2));
}finally{await writeFile(resolve(output,'browser-evidence.json'),JSON.stringify({checks:proofChecks,runs:logs,completeMainWorkflow:logs.length===1},null,2));await writeFile(resolve(output,'browser.json'),JSON.stringify({checks,logs},null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));}


console.log('PASS '+checks+' checks');
