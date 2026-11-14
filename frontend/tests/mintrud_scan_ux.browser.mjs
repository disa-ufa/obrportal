// Synthetic E2E: fresh ephemeral browser contexts; all API traffic intercepted.
// Run from frontend after build. PLAYWRIGHT_MODULE / UI_BROWSER_PATH are optional.
// UI_BUILD_DIR selects a separate build artifact without touching a running UI.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=resolve(process.env.UI_EVIDENCE_DIR||'../scan-ux-evidence');
await mkdir(output,{recursive:true});
const server=await preview({build:{outDir:process.env.UI_BUILD_DIR||'dist'},preview:{host:'127.0.0.1',port:4187,strictPort:true}});
const base='http://127.0.0.1:4187', path='/admin/knowledge-protocols/synthetic-scan';
const marker='obrportal_scan_attempt_v1:synthetic-scan';
const browser=await chromium.launch({headless:true,...(process.env.UI_BROWSER_PATH?{executablePath:process.env.UI_BROWSER_PATH}:{})});
const pdf={name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nsynthetic only\n%%EOF')};
const report=[];
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
async function fixture(options={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const state={write:true,read:true,status:200,attached:false,signed:true,reads:[],posts:[],errors:[],...options};
  await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-scan-token'));
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),p=url.pathname;
    if(url.origin!==base)return route.abort();
    if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    const protocol=()=>({id:'synthetic-scan',status:'recorded',course_id:'synthetic-course',protocol_number:'SYNTHETIC',protocol_date:'2026-11-05',updated_at:'2026-11-05T00:00:00Z',is_signed:state.signed,signed_on:'2026-11-05',participants:[],commission_members:[],signed_scan_available:state.attached,signed_scan_size:30});
    if(req.method()!=='GET'){
      state.posts.push({path:p,method:req.method(),auth:req.headers().authorization});
      if(!p.endsWith('/synthetic-scan/signed-scan')||req.method()!=='POST')return json({detail:'Forbidden synthetic mutation'},409);
      if(state.postGate)await state.postGate;
      if(state.commit)state.attached=true;
      if(state.status==='network')return route.abort('failed');
      if(state.status===200){if(!state.missing)state.attached=true;return json(protocol());}
      return json({detail:'Synthetic refusal'},state.status);
    }
    state.reads.push({path:p,auth:req.headers().authorization,cache:req.headers()['cache-control']});
    if(p==='/api/v1/auth/me')return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
    if(p.endsWith('/me/permissions')){if(state.permissionGate)await state.permissionGate;return json({mintrud:{read:state.read,write:state.write}});}
    if(p.endsWith('/courses'))return json([{id:'synthetic-course',title:'Синтетический курс'}]);
    if(p.endsWith('/protocol-candidates'))return json([]);
    if(p.endsWith('/protocol-drafts'))return json([protocol()]);
    if(p.endsWith('/registry-reconciliation'))return json({members:[]});
    if(p.endsWith('/synthetic-scan')){if(state.posts.length&&state.readGate)await state.readGate;if(state.posts.length&&state.readFails)return json({detail:'unavailable'},503);return json(protocol());}
    return json([]);
  });
  async function newPage(){const page=await context.newPage();page.on('pageerror',e=>state.errors.push(e.message));await page.goto(base+path);await page.getByRole('region',{name:'Скан подписанного оригинала',exact:true}).waitFor();return page;}
  const page=await newPage();
  const area=p=>p.getByRole('region',{name:'Скан подписанного оригинала',exact:true});
  const input=p=>p.getByLabel('Выбрать скан',{exact:true});
  const button=p=>p.getByRole('button',{name:'Прикрепить скан',exact:true});
  const pending=()=>page.evaluate(key=>localStorage.getItem(key),marker);
  const waitState=(p,value)=>p.locator(`[data-scan-state="${value}"]`).waitFor();
  async function close(label){check(state.errors.length===0,state.errors.join('\n'));check(state.posts.every(x=>x.path.endsWith('/synthetic-scan/signed-scan')),'no signing/registry/export mutations');report.push({label,posts:state.posts,reads:state.reads.length,errors:state.errors});await context.close();}
  return {context,page,state,newPage,area,input,button,pending,waitState,close};
}
try{
  {
    const f=await fixture();const {page}=f;
    await f.input(page).setInputFiles({name:'empty.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(0)});
    await f.waitState(page,'rejected');check((await f.area(page).innerText()).includes('непустой PDF'),'empty PDF visible');check(f.state.posts.length===0,'empty PDF no POST');
    await f.input(page).setInputFiles(pdf);await f.waitState(page,'selected');check(f.state.posts.length===0,'valid selection no POST');
    await f.input(page).evaluate(el=>{el.dispatchEvent(new Event('cancel',{bubbles:true}));});
    check((await page.getByTestId('scan-selection').innerText()).includes('synthetic.pdf'),'native cancel preserves selection');
    const original=await f.input(page).elementHandle();const initialReads=f.state.reads.length;
    for(let i=0;i<5;i++){
      const permission=page.waitForResponse(r=>r.url().endsWith('/me/permissions'));
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await permission;
      await page.waitForFunction(()=>!document.querySelector('input[type=file]').disabled);
    }
    check(await original.evaluate(el=>el.isConnected),'focus/revision keeps input node');
    check((await page.getByTestId('scan-selection').innerText()).includes('synthetic.pdf'),'focus preserves File');
    const focusReads=f.state.reads.slice(initialReads);
    check(focusReads.length===5&&focusReads.every(x=>x.path.endsWith('/me/permissions')),'five focus events: five permission GETs only');
    await page.waitForTimeout(700);check(f.state.reads.length===initialReads+5,'no background refetch loop');
    await page.getByRole('button',{name:'Отменить выбор',exact:true}).click();check(await page.getByTestId('scan-selection').count()===0,'explicit cancel');
    check(await f.pending()===null,'selection/cancellation did not create pending');
    await f.input(page).setInputFiles(pdf);
    let releasePost,releaseRead;
    f.state.postGate=new Promise(r=>releasePost=r);f.state.readGate=new Promise(r=>releaseRead=r);
    await f.button(page).evaluate(el=>{el.click();el.click();});await f.waitState(page,'uploading');
    check(await f.pending()==='pending','marker set before upload');releasePost();await f.waitState(page,'verifying');
    check(!((await f.area(page).innerText()).includes('Скан прикреплён')),'POST alone not success');releaseRead();await f.waitState(page,'success');
    check(f.state.posts.length===1,'exactly one explicit POST');check(await f.pending()===null,'confirmed GET clears marker');
    check(f.state.reads.at(-1).auth==='Bearer synthetic-scan-token','readback authorized');
    await page.screenshot({path:resolve(output,'scan-success.png'),fullPage:true});
    await page.reload();await page.getByRole('button',{name:'Скачать скан',exact:true}).waitFor();check(await f.input(page).count()===0,'reload no overwrite');
    report.push({focusReads});await f.close('selection, cancellation, focus, one POST, verifying, success, reload');
  }
  for(const status of [413,415,422,409,503,'network',200]){
    const f=await fixture({status,missing:status===200});const {page}=f;
    await f.input(page).setInputFiles(pdf);await f.button(page).click();
    const rejected=[413,415,422].includes(status);await f.waitState(page,rejected?'rejected':'uncertain');
    check(f.state.posts.length===1,`${status}: one POST`);check(await f.pending()===(rejected?null:'pending'),`${status}: marker policy`);
    check(await f.button(page).isDisabled()===!rejected,`${status}: retry policy`);
    if(rejected){f.state.status=200;await f.input(page).setInputFiles({...pdf,name:'corrected.pdf'});await f.button(page).click();await f.waitState(page,'success');check(f.state.posts.length===2,'definitive rejection corrected retry');}
    else{
      await page.getByRole('button',{name:'Проверить состояние протокола',exact:true}).click();
      await page.getByText('Состояние получено. Сохранение скана остаётся неопределённым; повторная загрузка требует проверки хранилища.',{exact:true}).waitFor();
      check(await f.pending()==='pending','negative GET cannot clear');
      await page.reload();await f.button(page).waitFor();check(await f.button(page).isDisabled(),'remount blocks pending');
      const second=await f.newPage();check(await f.button(second).isDisabled(),'second tab observes pending');
      check(f.state.posts.length===1,'refresh/remount/two tabs no retry');
      if(status===503)await page.screenshot({path:resolve(output,'scan-uncertain.png'),fullPage:true});
    }
    await f.close(`HTTP ${status}, negative GET, reset/remount policy`);
  }
  for(const status of [409,503,'network']){
    const f=await fixture({status,commit:true});await f.input(f.page).setInputFiles(pdf);await f.button(f.page).click();await f.waitState(f.page,'success');
    check(await f.pending()===null,'committed scan discovered by authorized GET');check(f.state.posts.length===1,'no retransmit');await f.close(`${status}: committed readback`);
  }
  {
    const f=await fixture({readFails:true});await f.input(f.page).setInputFiles(pdf);await f.button(f.page).click();await f.waitState(f.page,'uncertain');check(await f.pending()==='pending','200 failed GET pending');await f.close('200/readback unavailable');
  }
  for(const options of [{write:false},{signed:false},{attached:true}]){
    const f=await fixture(options);const text=await f.area(f.page).innerText();
    check(text.includes(options.write===false?'mintrud.write':options.signed===false?'подписание оригинала':'Повторная загрузка запрещена'),'visible blocking cause');
    check(f.state.posts.length===0,'guard no POST');await f.close(JSON.stringify(options));
  }
  {
    const f=await fixture();await f.input(f.page).setInputFiles(pdf);let release;
    f.state.permissionGate=new Promise(r=>release=r);
    await f.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await f.page.getByText('Актуальность прав не подтверждена. Дождитесь проверки авторизации.',{exact:true}).waitFor();
    check(await f.button(f.page).isDisabled(),'revalidation denies writes');f.state.write=false;release();
    await f.page.getByText('Недостаточно прав для прикрепления скана: требуется mintrud.write.',{exact:true}).waitFor();
    check(await f.button(f.page).isDisabled(),'revoked permission blocks');check(f.state.posts.length===0,'no stale permission POST');await f.close('pending/revoked permissions');
  }
  {
    const f=await fixture();const other=await f.newPage();await f.input(f.page).setInputFiles(pdf);await f.input(other).setInputFiles(pdf);
    let release;f.state.postGate=new Promise(r=>release=r);
    await Promise.all([f.button(f.page).evaluate(el=>el.click()),f.button(other).evaluate(el=>el.click())]);
    await f.page.waitForTimeout(300);check(f.state.posts.length===1,'simultaneous tabs exactly one POST');release();
    await f.page.waitForTimeout(300);check(f.state.posts.length===1,'loser never queues upload');await f.close('simultaneous tabs atomic exclusion');
  }
  {
    const f=await fixture();await f.input(f.page).setInputFiles(pdf);let release;f.state.postGate=new Promise(r=>release=r);
    await f.button(f.page).click();await f.waitState(f.page,'uploading');
    await f.page.evaluate(()=>{sessionStorage.setItem('obrportal_access_token','synthetic-changed-session');window.dispatchEvent(new Event('obrportal-auth-change'));});
    release();await f.page.waitForTimeout(300);check(await f.pending()==='pending','session switch retains old pending');
    check(f.state.posts.length===1,'session change no repeat');await f.close('session changes during upload');
  }
  console.log(JSON.stringify({checks,report},null,2));
} finally {
  await writeFile(resolve(output,'scan-browser-report.json'),JSON.stringify({checks,report},null,2));
  await browser.close();await new Promise(r=>server.httpServer.close(r));
}
