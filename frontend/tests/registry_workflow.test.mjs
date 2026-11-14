import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {registryWorkflow,registryStatuses,sampleSummary,readinessTarget,registryDocumentLabel} from '../src/utils/registryWorkflowPresentation.js';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
for(const status of Object.keys(registryStatuses)) test(`workflow ${status}`,()=>{
  const view=registryWorkflow({status,applicability_decision:'required'},{registry:'frdo',write:true});
  assert.equal(view.title,registryStatuses[status][0]);assert.ok(view.description);assert.ok(view.label);
});
test('unknown status and missing data cannot recommend approval',()=>{
  for(const status of [undefined,'unknown'])assert.equal(registryWorkflow({status},{write:true}).action,'details');
  assert.equal(registryWorkflow({status:'pending_data'},{write:true}).action,'validate');
});
test('read-only, unknown rights, applicability and readiness fail closed for recommendations',()=>{
  for(const scope of ['review','history'])assert.equal(registryWorkflow({status:'ready'},{registry:'frdo',scope,write:true}).action,'details');
  for(const decision of ['not_required','needs_review',undefined])assert.notEqual(registryWorkflow({status:'ready',applicability_decision:decision},{registry:'frdo',write:true}).action,'approve');
  assert.equal(registryWorkflow({status:'ready',readiness_errors:[{code:'mintrud.employer_inn_missing'}]},{registry:'mintrud',write:true}).action,'context');
  assert.equal(registryWorkflow({status:'ready'},{registry:'mintrud',write:false}).action,'details');
  assert.equal(registryWorkflow({status:'ready'},{registry:'mintrud'}).action,'validate');
  for(const protocol of [{status:'draft'},{status:'recorded',is_signed:false}])assert.notEqual(registryWorkflow({status:'ready'},{registry:'mintrud',write:true,protocol}).action,'approve');
});
test('approved never promises fingerprint validity; submitted never claims acceptance',()=>{
  assert.match(registryWorkflow({status:'approved'}).description,/актуальности снимка/);
  assert.match(registryWorkflow({status:'submitted'}).description,/нужно сверить/);
  assert.equal(sampleSummary([{status:'approved'},{status:'pending_data'}]).export,1);
});
const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
after(()=>server.close());
const ui=await server.ssrLoadModule('/src/components/admin/registries/RegistryWorkspace.jsx');
const html=(name,props)=>renderToStaticMarkup(createElement(ui[name],props));
test('navigation, scoped overview, primary action, lazy details and distinct empty states render',()=>{
  const nav=html('RegistryNavigation',{view:'overview',registry:'frdo'});assert.match(nav,/aria-current="page"/);assert.match(nav,/Партии/);
  assert.match(html('RegistryOverview',{rows:[{status:'pending_data'}],registry:'frdo'}),/По загруженным записям/);
  assert.match(html('RegistryOverview',{rows:[],error:'failed'}),/Сводка недоступна/);
  assert.match(html('RegistryOverview',{rows:[],loading:true}),/Загрузка сводки/);
  assert.equal((html('RegistryNextAction',{row:{status:'ready'},options:{write:true}}).match(/<button/g)||[]).length,1);
  assert.doesNotMatch(html('RegistryDetails',{children:createElement('p',null,'not-mounted')}),/not-mounted/);
  for(const props of [{error:true},{filtered:true},{scope:'review'},{scope:'history'},{}])assert.match(html('RegistryEmptyState',props),/загрузки|выборке|выборку/);
});

test('issue targets distinguish profile, employer, protocol and unknown causes',()=>{
  const target=(code,registry='mintrud',extra={})=>readinessTarget({user_id:'u',readiness_errors:[{code}],...extra},registry).action;
  assert.equal(target('learner_profile.snils_missing'),'profile');
  assert.equal(target('mintrud.employer_inn_missing'),'context');
  for(const code of ['mintrud.protocol_number_missing','mintrud.knowledge_check_date_missing','mintrud.knowledge_check_result_invalid'])assert.equal(target(code),'protocol');
  assert.equal(target('frdo.context_missing','frdo',{regulatory_program_type:'vocational_training'}),'context');
  for(const code of ['course.title_missing','mintrud.learn_program_missing','unknown'])assert.equal(target(code),'details');
  assert.equal(target('learner_profile.snils_missing','mintrud',{user_id:null}),'details');
});
test('historical states never imply a linked accessible batch',()=>{
  for(const registry of ['frdo','mintrud'])for(const status of ['exported','submitted']){
    const v=registryWorkflow({status,applicability_decision:'required'},{registry,write:true});
    assert.equal(v.action,'details');assert.match(v.reason,/не подтверждена/);
  }
  assert.notEqual(registryStatuses.exported[0],registryStatuses.submitted[0]);
  assert.notEqual(registryStatuses.submitted[0],registryStatuses.accepted[0]);
});
test('empty scoped overview has no seven zero cards; errors do not become zero',()=>{
  const empty=html('RegistryOverview',{rows:[],registry:'frdo'});
  assert.match(empty,/Обзор · ФРДО/);assert.match(empty,/не общий итог/);assert.doesNotMatch(empty,/<button/);
  const filtered=html('RegistryOverview',{rows:[{status:'approved'}],registry:'mintrud',filters:'Первая помощь'});
  assert.match(filtered,/Первая помощь/);assert.match(filtered,/Другой реестр не подсчитан/);
});
test('row action has no duplicate status explanation or technical document id',()=>{
  const action=html('RegistryNextAction',{row:{status:'exported'},options:{registry:'mintrud',write:true}});
  assert.doesNotMatch(action,/Файл подготовлен|Формирование файла/);
  assert.equal(registryDocumentLabel({document_number:'TECHNICAL-UUID',document_type:'unknown'}),'Документ об обучении');
});

test('unsupported FRDO program does not recommend an empty batch form',()=>{
  const v=registryWorkflow({status:'approved',applicability_decision:'required',regulatory_program_type:'advanced_training'},{registry:'frdo',write:true});
  assert.equal(v.action,'details');
  assert.equal(registryWorkflow({status:'approved',applicability_decision:'required',regulatory_program_type:'vocational_training'},{registry:'frdo',write:true}).action,'batch');
});
