// Synthetic browser acceptance: all API requests intercepted; no backend access.
import assert from 'node:assert/strict';
import { preview } from 'vite';
import { chromium, browserPath } from './frdo_browser_runtime.mjs';
const server = await preview({build:{outDir:process.env.MINTRUD_TEST_DIST || 'dist'},preview:{host:'127.0.0.1',port:4187,strictPort:true}});
const browser = await chromium.launch({headless:true,executablePath:browserPath,args:['--disable-background-networking','--proxy-server=http://127.0.0.1:1']});
const context = await browser.newContext({serviceWorkers:'block'});
const base='http://127.0.0.1:4187';
const root='/admin/registries?registry=mintrud&registryView=batches';
const id='12345678-1234-4234-8234-123456789abc';
const batch={id,registry:'mintrud',status:'generated',record_count:1,obligation_count:1,items:[]};
let selectionMode=false, firstApproval=id;
const learnerIds=[id,'12345678-1234-4234-8234-123456789abd','12345678-1234-4234-8234-123456789abe','12345678-1234-4234-8234-123456789abf'];
let exportMode='allowed', mode='rows', writes=0, invalidReads=0, checks=0;
await context.addInitScript(() => sessionStorage.setItem('obrportal_access_token','synthetic-ui-test'));
await context.route('**/*', async route => {
  const req=route.request(), url=new URL(req.url());
  if(url.origin!==base)return route.abort();
  if(!url.pathname.startsWith('/api/') && url.pathname!=='/health')return route.continue();
  const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(req.method()!=='GET'){writes++;return json({},503);}
  const path=url.pathname;
  if(path.endsWith('/auth/me'))return json({id:'synthetic-admin',roles:[{code:'admin'}]});
  if(path.endsWith('/me/permissions'))return json({mintrud:{read:true},frdo:{read:true}});
  if(path.endsWith('/mintrud/export-status'))return json(exportMode==='unknown'?{}:{enabled:exportMode!=='disabled',read_only:true},exportMode==='denied'?403:200);
  if(path.endsWith('/export-readiness')) {
    const obligationId=path.split('/').at(-2);
    const base={obligation_id:obligationId,read_only:true,not_authorization_for_export:true};
    if(obligationId===learnerIds[2])return json({...base,batch_eligible:false,block_reason:'mintrud.data_not_ready',issue_codes:['learner_profile.snils_missing']});
    if(obligationId===learnerIds[3])return json({...base,batch_eligible:false,block_reason:'approval.current_data_fingerprint_mismatch'});
    return json({...base,batch_eligible:true,approval_event_id:obligationId===id?firstApproval:obligationId});
  }
  if(path.endsWith('/mintrud/obligations'))return json((selectionMode?learnerIds:[id]).map((rowId,index)=>({id:rowId,registry:'mintrud',status:'approved',user_full_name:`Synthetic ${index}`,course_id:'synthetic-course',mintrud_requirement_mode:'required',readiness_errors:[]})));
  if(path.includes('/mintrud/batches')) {
    if(path.endsWith('/'+id))return json(batch);
    if(path.endsWith('/invalid')){invalidReads++;return json({},404);}
    if(mode==='error')return json({},503);
    if(mode==='loading')await new Promise(resolve=>setTimeout(resolve,700));
    return json(mode==='empty'?[]:[batch]);
  }
  return json([]);
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const check=(value,message)=>{assert.ok(value,message);checks++;};
const history=()=>page.getByRole('region',{name:'История XML-партий Минтруда',exact:true});
try {
  mode='loading';await page.goto(base+root);
  await history().getByText('Загрузка истории…').waitFor();check(true,'loading');
  await history().getByRole('button',{name:'Просмотреть состав и результаты'}).click();
  await page.getByTestId('selected-registry-batch').waitFor();
  check(new URL(page.url()).searchParams.get('batchId')===id,'select updates URL');
  await page.goBack();await page.getByTestId('selected-registry-batch').waitFor({state:'detached'});check(true,'Back');
  await page.goForward();await page.getByTestId('selected-registry-batch').waitFor();check(true,'Forward');
  await page.reload();await page.getByTestId('selected-registry-batch').getByText('Технические сведения').click();await page.getByTestId('selected-registry-batch').getByText('UUID: '+id).waitFor();check(true,'direct link survives reload');
  await page.goto(base+root+'&batchId=invalid');await page.getByText('Некорректная ссылка на партию. Проверьте UUID и реестр.').waitFor();
  check(invalidReads===0,'invalid UUID never requested');
  mode='empty';await page.goto(base+root);await history().getByText('Ранее сформированных партий нет.').waitFor();check(true,'empty');
  mode='error';await history().getByRole('button',{name:'Обновить историю'}).click();await history().getByRole('alert').waitFor();check(true,'error');
  mode='rows';await history().getByRole('button',{name:'Обновить историю'}).click();await history().getByRole('button',{name:'Просмотреть состав и результаты'}).waitFor();check(true,'retry read');
  check(await history().getByRole('button').count()===2,'history exposes only refresh/select');
  await page.getByRole('button',{name:'ФРДО · XLSX',exact:true}).click();
  check(new URL(page.url()).searchParams.get('registry')==='frdo','FRDO navigation retained');
  for(const gate of ['allowed','disabled','unknown','denied']) {
    exportMode=gate;
    await page.goto(base+'/admin/registries?registry=mintrud&registryView=work');
    await page.getByRole('button',{name:'XML-партии',exact:true}).click();
    const select=page.getByTestId('admin-registries-mintrud-batch').getByRole('button').first();
    await select.waitFor();
    await page.waitForFunction(()=>{const b=document.querySelector('[data-testid="admin-registries-mintrud-batch"] button');return b&&!b.disabled;});
    await select.click();
    const create=page.getByTestId('admin-registries-mintrud-batch-download');
    check(await create.isEnabled()===(gate==='allowed'),'UI export gate '+gate);
  }
  selectionMode=true;exportMode='disabled';
  await page.goto(base+'/admin/registries?registry=mintrud&registryView=work&mintrudView=learners');
  const rowCheck=index=>page.getByTestId('admin-registries-mintrud-batch-select-'+learnerIds[index]);
  const count=number=>page.getByText('Выбрано для пакета: '+number,{exact:true}).waitFor();
  const reason=(index,message)=>page.getByText(message).and(page.locator(`[id="mintrud-batch-block-${learnerIds[index]}"]`));
  await rowCheck(0).check();await count(1);
  await rowCheck(0).check();await count(1);
  await rowCheck(1).check();await count(2);
  await rowCheck(0).uncheck();await count(1);
  check(!(await rowCheck(0).isChecked()) && await rowCheck(1).isChecked(),'multiple rows and deselection');
  check(await rowCheck(2).isDisabled() && await reason(2,/СНИЛС/).isVisible(),'missing data has visible reason');
  check(await rowCheck(3).isDisabled() && await reason(3,/отличаются от утверждённых/).isVisible(),'stale approval has visible reason');
  check(await page.getByTestId('admin-registries-mintrud-batch-download').isDisabled(),'selection stays independent of closed export gate');
  await rowCheck(0).check();await count(2);
  firstApproval='12345678-1234-4234-8234-123456789ac0';
  const filter=page.getByTestId('admin-registries-filters');
  await filter.getByRole('textbox').fill('Synthetic');
  await filter.getByRole('button',{name:'Применить',exact:true}).click();await count(1);
  check(!(await rowCheck(0).isChecked()) && await rowCheck(1).isChecked(),'refresh keeps the same approval only');
  await page.reload();await rowCheck(0).waitFor();await count(0);
  check(!(await rowCheck(0).isChecked()) && !(await rowCheck(1).isChecked()),'page reload starts a new selection');
  selectionMode=false;
  check(writes===0,'no API writes');check(errors.length===0,JSON.stringify(errors));
  exportMode='allowed';await page.goto(base+'/admin/registries?registry=mintrud&registryView=work');
  await page.getByRole('button',{name:'XML-партии',exact:true}).click();
  const select=page.getByTestId('admin-registries-mintrud-batch').getByRole('button').first();
  await page.waitForFunction(()=>{const b=document.querySelector('[data-testid="admin-registries-mintrud-batch"] button');return b&&!b.disabled;});
  await select.click();
  const create=page.getByTestId('admin-registries-mintrud-batch-download');
  await create.click();
  await page.waitForFunction(()=>{const b=document.querySelector('[data-testid="admin-registries-mintrud-batch"] button');return b&&!b.disabled;});
  check(writes===1,'one intercepted synthetic POST');
  await select.click();await create.click();
  await page.waitForFunction(()=>!document.querySelector('[data-testid="admin-registries-mintrud-batch-select-all"]').disabled);
  check(writes===1,'unknown POST result is not retried');
  console.log(`M1_HISTORY_BROWSER: ${checks} PASS, 0 FAIL`);
} catch(error) {console.error(errors,await page.locator('body').innerText());throw error;} finally {await browser.close();await server.httpServer.close();}
