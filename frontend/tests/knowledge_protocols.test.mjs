import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { protocolPresentation, protocolMatches } from '../src/utils/knowledgeProtocolPresentation.js';
import { buildAdminKnowledgeProtocolPath, getAdminKnowledgeProtocolRouteParams, getAdminPageFromPathname } from '../src/utils/adminRoutes.js';

const draft = { id:'synthetic', status:'draft', protocol_number:'UI-1', protocol_date:'2026-11-05', course_id:'course', participant_count:1, participants:[{enrollment_id:'learner',learner_name:'Тестовый участник'}] };
test('new list, creation and direct detail routes coexist with old registry routes', () => {
  assert.equal(getAdminPageFromPathname('/admin/registries'),'registries');
  for (const path of ['/admin/knowledge-protocols','/admin/knowledge-protocols/','/admin/knowledge-protocols/new','/admin/knowledge-protocols/synthetic']) assert.equal(getAdminPageFromPathname(path),'knowledgeProtocols');
  assert.deepEqual(getAdminKnowledgeProtocolRouteParams('/admin/knowledge-protocols/new'),{mode:'new'});
  assert.deepEqual(getAdminKnowledgeProtocolRouteParams(buildAdminKnowledgeProtocolPath('id with space')),{mode:'detail',id:'id with space'});
  for (const path of ['/admin/knowledge-protocols/a/b','/admin/knowledge-protocols/%','/admin/knowledge-protocols/%2F']) assert.equal(getAdminKnowledgeProtocolRouteParams(path),null);
});
test('status and next step never infer commission, signature or scan from online completion', () => {
  const p = {...draft,completed_at:'2026-11-05',score:100,is_signed:true};
  assert.equal(protocolPresentation(p).key,'draft');
  assert.equal(protocolPresentation(p).step,1);
  assert.equal(protocolPresentation({...draft,participants:[]}).step,0);
  const commission = {...draft,commission_chair:'А',commission_order_number:'1',commission_order_date:'2026-11-01',commission_members:['Б','В']};
  assert.equal(protocolPresentation(commission).step,2);
  assert.equal(protocolPresentation({...commission,commission_members:['а','А']}).step,1);
  const ready = {...commission,participants:[{...draft.participants[0],knowledge_check_date:'2026-11-05',knowledge_check_result:'satisfactory'}]};
  assert.equal(protocolPresentation(ready).step,3);
  assert.equal(protocolPresentation(ready).label,'Черновик');
  assert.equal(protocolPresentation({...ready,status:'recorded'}).label,'Ожидает подписания');
  assert.equal(protocolPresentation({...ready,status:'recorded',is_signed:true}).label,'Подписан');
  assert.equal(protocolPresentation({...ready,status:'recorded',is_signed:true}).scan,'Скан не прикреплён');
  assert.equal(protocolPresentation({...ready,status:'unexpected',is_signed:true}).key,'unknown');
});
test('search combines number, course and participants with a status filter', () => {
  for (const text of ['ui-1','участник','ОХРАНА']) assert.ok(protocolMatches(draft,text,'draft','Охрана труда'));
  assert.ok(!protocolMatches(draft,'участник','signed'));
  assert.ok(!protocolMatches(draft,'другой','draft'));
});

const server = await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
test.after(() => server.close());
const {ProtocolList,AdminKnowledgeProtocolsPage} = await server.ssrLoadModule('/src/pages/AdminKnowledgeProtocolsPage.jsx');
const {KnowledgeProtocolOverview} = await server.ssrLoadModule('/src/components/admin/KnowledgeProtocolOverview.jsx');
const {MintrudParticipantCards} = await server.ssrLoadModule('/src/components/admin/MintrudParticipantCards.jsx');
const {MintrudProtocolDetails} = await server.ssrLoadModule('/src/components/admin/MintrudRegistryDetails.jsx');
const render = (component,props) => renderToStaticMarkup(createElement(component,props));
test('list renders compact rows and direct links without participant editors or signing controls', () => {
  const html = render(ProtocolList,{protocols:[draft],courseTitle:()=> 'Охрана труда'});
  for (const text of ['UI-1','05.11.2026','Охрана труда','Черновик','до 100','/admin/knowledge-protocols/synthetic']) assert.ok(html.includes(text));
  assert.equal((html.match(/<tbody>/g)||[]).length,1);
  assert.doesNotMatch(html,/type="file"|type="checkbox"|Подтвердить подписание/);
  assert.match(render(ProtocolList,{protocols:[]}),/Сохранённых протоколов пока нет/);
  assert.match(render(ProtocolList,{protocols:[draft],query:'absent'}),/По заданным условиям/);
});
test('all six stages, blocking reasons and read-only explanation remain visible', () => {
  const html = render(KnowledgeProtocolOverview,{protocol:draft,canWrite:false,onStep:()=>{}});
  for (const text of ['Состав','Комиссия','Результаты','Фиксация','Подписание','Минтруд','Подписание недоступно','Доступен просмотр']) assert.ok(html.includes(text));
  assert.match(html,/aria-current="step"/);
  assert.match(render(AdminKnowledgeProtocolsPage,{pathname:'/admin/knowledge-protocols'}),/Доступ к протоколам не подтверждён/);
});
test('compact participant table preserves existing hashes and separates registry data', () => {
  const html = render(MintrudParticipantCards,{protocol:draft,permissions:['mintrud.read'],compact:true});
  assert.match(html,/<table/);
  assert.match(html,/#participant=synthetic:learner/);
  assert.match(html,/Результат комиссии/);
  assert.match(html,/Сохранённые реквизиты Минтруда открываются отдельно/);
  assert.doesNotMatch(html,/100|Удовлетворительно/);
  assert.doesNotMatch(render(MintrudParticipantCards,{protocol:draft,compact:true}),/<table/);
});
test('registry source has a new direct link and retains the legacy action', () => {
  const html = render(MintrudProtocolDetails,{protocols:[draft],onOpenProtocol:()=>{}});
  assert.match(html,/href="\/admin\/knowledge-protocols\/synthetic"/);
  assert.match(html,/Открыть в прежнем интерфейсе/);
});
