import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium,browserPath} from './frdo_browser_runtime.mjs';
const out = process.env.UI_EVIDENCE_DIR;
const server = await preview({build:{outDir:process.env.UI_BUILD_DIR || 'dist'},preview:{host:'127.0.0.1',port:4194,strictPort:true}});
const browser = await chromium.launch({headless:true,executablePath:browserPath});
const base='http://127.0.0.1:4194', a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const prefix='obrportal:frdo:submit-pending:v1:';
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
await context.addInitScript(()=>sessionStorage.setItem('obrportal_access_token','synthetic-navigation'));
const calls=[], errors=[], checks=[], unexpected=[];
let submitted=new Set(), references={}, postMode='', getMode='', release=null, posts=0, rejectDetail=false, overrides={};
function full(registry,id) {
  const sent=submitted.has(id);
  return {id,registry,status:sent?'submitted':'exported',artifact_kind:registry==='frdo'?'frdo_po_xlsx':'mintrud_eisot_xml',record_count:1,obligation_count:1,generated_at:'2026-01-01',has_artifact:false,
    submitted_at:sent?'2026-11-07T10:00:00Z':null,submitted_by_user_id:sent?'synthetic-actor':null,external_reference:references[id]??null,
    items:[{id:'item-'+id,obligation_id:'obligation-'+id,position:1,record_count:1,result_status:null}],...overrides};
}
await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname;
  if(u.origin!==base) {unexpected.push(req.url());return route.abort();}
  if(!p.startsWith('/api/')&&p!=='/health')return route.continue();
  calls.push({method:req.method(),path:p});
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(req.method()!=='GET') {
    const match=p.match(/^\/api\/v1\/admin\/frdo\/batches\/([^/]+)\/submitted$/);
    if(req.method()!=='POST'||!match) {unexpected.push(req.method()+' '+p);return json({detail:'Unexpected write'},405);}
    posts++; calls[calls.length-1].body=req.postDataJSON();
    if(postMode==='timeout'||postMode==='network')return route.abort(postMode==='timeout'?'timedout':'failed');
    if(postMode==='403'||postMode==='409')return json({detail:'Synthetic denied'},Number(postMode));
    if(postMode==='slow')await new Promise(r=>{release=r});
    const id=match[1];submitted.add(id);references[id]=req.postDataJSON().external_reference;
    return json(full('frdo',id));
  }
  if(p.endsWith('/auth/me'))return json({id:'synthetic-admin',email:'synthetic@example.invalid',roles:[{code:'admin'}]});
  if(p.endsWith('/me/permissions'))return json({mintrud:{read:true,write:false}});
  const m=p.match(/\/(frdo|mintrud)\/batches(?:\/([^/]+))?$/);
  if(m) {
    const [,reg,id]=m;
    if(!id)return json([full(reg,a),full(reg,b)]);
    if(rejectDetail)return json({detail:'Synthetic inaccessible'},404);
    if(getMode==='slow'&&id===a)await new Promise(r=>{release=r});
    const d=full(reg,id);
    if(getMode==='wrong-id')d.id=b;
    if(getMode==='wrong-registry')d.registry='mintrud';
    if(getMode==='missing-date') {d.status='submitted';d.submitted_at=null;d.submitted_by_user_id='actor';}
    if(getMode==='invalid-date') {d.status='submitted';d.submitted_at='invalid';d.submitted_by_user_id='actor';}
    if(getMode==='missing-actor') {d.status='submitted';d.submitted_at='2026-11-07T10:00:00Z';d.submitted_by_user_id='';}
    return json(d);
  }
  return json([]);
});
const page=await context.newPage(); page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
const selected=()=>page.getByTestId('selected-registry-batch');
const area=()=>selected().getByRole('region',{name:'Подтверждение отправки ФРДО'});
const row=id=>page.getByTestId('admin-registries-frdo-batch-'+id);
const url=(id=a,reg='frdo')=>base+'/admin/registries?registry='+reg+'&registryView=batches&batchStage=all'+(id===null?'':'&batchId='+id);
const check=(ok,name)=>{assert.ok(ok,name);checks.push(name);};
const record=()=>page.evaluate(key=>localStorage.getItem(key),prefix+a);
async function shown(id=a) {await selected().getByText('Обязательство: obligation-'+id,{exact:true}).waitFor();}
async function open(reference='synthetic-ref') {
  await area().getByRole('button',{name:'Зафиксировать отправку',exact:true}).click();
  await area().getByLabel('Внешний номер отправки (необязательно)').fill(reference);
}
async function confirm(reference='synthetic-ref') {await open(reference);await area().getByRole('button',{name:'Подтвердить фактическую отправку',exact:true}).click();}
async function unknown() {await area().getByText('Результат операции неизвестен. Повторное подтверждение заблокировано',{exact:false}).waitFor();}
async function recover() {getMode='';postMode='';rejectDetail=false;submitted.add(a);await area().getByRole('button',{name:'Проверить подтверждение отправки',exact:true}).click();await area().getByText('Подтверждение получено',{exact:true}).waitFor();check(await record()===null,'GET proof removes journal');}
async function select(id) {await row(id).getByRole('button',{name:'Просмотреть состав и результаты',exact:true}).click();await shown(id);}

try {
  await page.goto(url());await shown();
  check(await page.getByRole('region',{name:'Подтверждение отправки ФРДО'}).count()===1,'one confirmation area in selected card');
  check(await row(a).getByRole('button',{name:'Зафиксировать отправку',exact:true}).count()===0,'old history confirmation removed');
  await open('cancelled');await area().getByRole('button',{name:'Отмена',exact:true}).click();check(posts===0,'cancel has no POST');
  await open('  synthetic-ref  ');
  getMode='slow';
  await page.getByTestId('frdo-selected-submission-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
  await page.waitForFunction(key=>Boolean(localStorage.getItem(key)),prefix+a);
  await area().getByText('Проверяем результат подтверждения',{exact:true}).waitFor();
  // Wait until the post-response GET is held, not merely the reservation.
  for(let n=0;!release&&n<100;n++)await new Promise(r=>setTimeout(r,20));
  check(Boolean(release),'success reached GET proof');
  check(posts===1,'rapid double submit sends one POST');
  check(JSON.stringify(JSON.parse(await record())).includes('synthetic-ref')===false,'journal does not persist external reference');
  check(calls.find(c=>c.body)?.body.external_reference==='synthetic-ref','external reference trimmed');
  check(Boolean(await record()),'POST response alone retains pending');
  getMode='';release();release=null;await area().getByText('Подтверждение получено',{exact:true}).waitFor();
  await row(a).getByText('Ожидаются результаты',{exact:true}).waitFor();
  check((await row(b).innerText()).includes('Ожидается отправка'),'only matching history summary updated');
  check(await page.getByTestId('frdo-selected-submission-form').count()===0,'proof closes matching form');
  await page.screenshot({path:resolve(out,'submission-confirmed.png'),fullPage:true});
  await selected().screenshot({path:resolve(out,'submission-confirmed-card.png')});
  await page.reload();await area().getByText('Подтверждение получено',{exact:true}).waitFor();check(posts===1,'confirmed reload no POST');

  for(const failure of ['403','409','timeout','network']) {
    submitted.clear();postMode=failure;await page.goto(url());await confirm();await unknown();const count=posts;
    check(Boolean(await record()),failure+' unchanged GET retains pending');
    await page.reload();await unknown();check(posts===count,failure+' reload only GET');
    check(await area().getByRole('button',{name:'Зафиксировать отправку',exact:true}).isDisabled(),failure+' repeat disabled');
    await select(b);await page.goBack();await shown(a);await unknown();await page.goForward();await shown(b);await page.goBack();await shown(a);
    check(posts===count,failure+' selection Back Forward no POST');
    rejectDetail=true;await area().getByRole('button',{name:'Проверить подтверждение отправки',exact:true}).click();await area().getByText(/Не удалось проверить состояние партии/).waitFor();
    check(Boolean(await record())&&posts===count,failure+' GET failure preserves pending');
    await recover();check(posts===count,failure+' recovered without repeat POST');
  }

  submitted.clear();postMode='timeout';await page.goto(url());await confirm();await unknown();const unprovenCount=posts;
  for(const invalid of ['wrong-id','wrong-registry','missing-date','invalid-date','missing-actor']) {
    getMode=invalid;await area().getByRole('button',{name:'Проверить подтверждение отправки',exact:true}).click();await unknown();
    check(Boolean(await record())&&posts===unprovenCount,invalid+' does not clear pending');await shown(a);
  }
  await recover();

  // A late confirmation must not overwrite B, close its form or erase its draft.
  submitted.clear();postMode='slow';await page.goto(url());await confirm('   ');
  for(let n=0;!release&&n<100;n++)await new Promise(r=>setTimeout(r,20));
  check(Boolean(release),'delayed POST held');await select(b);await open('B draft');
  release();release=null;postMode='';await row(a).getByText('Ожидаются результаты',{exact:true}).waitFor();await shown(b);
  check(await area().getByLabel('Внешний номер отправки (необязательно)').inputValue()==='B draft','late A proof preserves B form and draft');
  check(calls.filter(c=>c.body).at(-1).body.external_reference===null,'blank reference sent as null');
  check((await row(b).innerText()).includes('Ожидается отправка'),'late proof does not change B summary');
  await select(a);await area().getByText('Подтверждение получено',{exact:true}).waitFor();
  await select(b);await area().getByRole('button',{name:'Зафиксировать отправку',exact:true}).click();check(await area().getByLabel('Внешний номер отправки (необязательно)').inputValue()==='','new selection opens fresh draft');

  // Existing and newly opened tabs both restore a shared pending journal with GET only.
  submitted.clear();postMode='timeout';await page.goto(url());await shown();
  const second=await context.newPage();second.on('pageerror',e=>errors.push(e.message));await second.goto(url());
  const secondArea=second.getByRole('region',{name:'Подтверждение отправки ФРДО'});
  await secondArea.getByRole('button',{name:'Зафиксировать отправку',exact:true}).waitFor();
  await confirm();await unknown();const tabCount=posts;
  await secondArea.getByText(/Результат операции неизвестен/).waitFor();check(posts===tabCount,'storage event in existing tab only GET');await second.reload();await secondArea.getByText(/Результат операции неизвестен/).waitFor();check(posts===tabCount,'second tab reload restores without POST');await second.close();await recover();

  // View-only scope and ineligible metadata never offer confirmation.
  submitted.clear();await page.goto(url());await shown();await page.getByTestId('admin-registries-frdo-scope-history').click();
  check(await area().getByRole('button',{name:'Зафиксировать отправку',exact:true}).count()===0,'history scope read-only');
  for(const extra of [{status:'legacy'},{status:'exported',submitted_at:'2026-11-07T10:00:00Z'},{status:'exported',submitted_by_user_id:'actor'}]) {
    overrides=extra;await page.goto(url());await shown();check(await area().getByRole('button',{name:'Зафиксировать отправку',exact:true}).count()===0,'ineligible '+JSON.stringify(extra));
  }
  overrides={};await page.goto(url(a,'mintrud'));await shown();check(await page.getByRole('region',{name:'Подтверждение отправки ФРДО'}).count()===0,'Mintrud has no FRDO submission UI');

  // Failed storage and corrupt journal stay closed; no reset action exists.
  await page.goto(url());await shown();await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('blocked')}});const storageCount=posts;
  await confirm();await area().getByText(/POST не отправлен/).waitFor();check(posts===storageCount,'unavailable storage prevents POST');
  check(await area().getByRole('button',{name:'Подтвердить фактическую отправку',exact:true}).isDisabled(),'failed reservation blocks repeat button');
  await page.reload();await shown();await page.evaluate(key=>localStorage.setItem(key,'broken'),prefix+a);await page.reload();await unknown();check(posts===storageCount,'corrupt journal blocks POST');
  submitted.add(a);await area().getByRole('button',{name:'Проверить подтверждение отправки',exact:true}).click();await unknown();check(await record()==='broken','corrupt journal not cleared even by submitted proof');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'submission-pending-mobile.png'),fullPage:true});
  await selected().screenshot({path:resolve(out,'submission-pending-mobile-card.png')});
  check(errors.length===0,'no page errors');check(unexpected.length===0,'no external origins or unexpected writes');
  check(calls.filter(c=>c.method!=='GET').every(c=>c.method==='POST'&&c.path.endsWith('/submitted')),'only explicit submitted POSTs');
} finally {
  if(release)release();
  await writeFile(resolve(out,'browser-evidence.json'),JSON.stringify({checks,calls,errors,unexpected,posts},null,2));
  await context.close();await browser.close();await server.httpServer.close();
}
console.log('PASS '+checks.length+' checks');
