import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';

const server = await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
after(() => server.close());
const Component = (await server.ssrLoadModule('/src/components/admin/registries/FrdoBatchSubmission.jsx')).default;
const id = '11111111-1111-4111-8111-111111111111';
const batch = {id,registry:'frdo',status:'exported',submitted_at:null,submitted_by_user_id:null};
const html = (extra={}, readOnly=false, submission={}) => renderToStaticMarkup(createElement(Component,{batch:{...batch,...extra},readOnly,submission:{pending:{},states:{},errors:{},...submission}}));
test('eligible batch offers explicit manual confirmation only', () => {
  const s=html(); assert.match(s,/Зафиксировать отправку/); assert.doesNotMatch(s,/<form/); assert.match(s,/не передаёт сведения/);
});
for (const [name,extra] of [['wrong UUID',{id:'invalid'}],['wrong registry',{registry:'mintrud'}],['submitted',{status:'submitted'}],['unknown stage',{status:'other'}],['submission date',{submitted_at:'2026-11-07'}],['submission actor',{submitted_by_user_id:'actor'}]]) {
  test(name+' cannot open confirmation', () => assert.doesNotMatch(html(extra),/Зафиксировать отправку|<form/));
}
test('read-only cannot confirm', () => {assert.doesNotMatch(html({},true),/Зафиксировать отправку/); assert.match(html({},true),/Режим только для просмотра/);});
test('pending disables repeat and provides GET recovery', () => {
  const s=html({},false,{pending:{[id]:true},states:{[id]:'unknown'}});
  assert.match(s,/disabled="">Зафиксировать отправку/); assert.match(s,/Проверить подтверждение отправки/); assert.match(s,/Результат операции неизвестен/);
});
test('storage failure remains blocked without journal snapshot', () => assert.match(html({},false,{states:{[id]:'unknown'}}),/disabled="">Зафиксировать отправку/));
test('confirmed operation cannot be repeated from a stale exported detail', () => assert.doesNotMatch(html({},false,{states:{[id]:'confirmed'}}),/Зафиксировать отправку/));
test('checking disables safe GET and repeat', () => {
  const s=html({},false,{pending:{[id]:true},states:{[id]:'checking'}});
  assert.match(s,/disabled="">Проверить подтверждение отправки/); assert.match(s,/disabled="">Зафиксировать отправку/);
});
test('confirmed metadata renders proof; corrupt pending takes precedence', () => {
  const proof={status:'submitted',submitted_at:'2026-11-07T10:00:00Z',submitted_by_user_id:'actor'};
  assert.match(html(proof),/Подтверждение получено/);
  assert.doesNotMatch(html(proof,false,{pending:{[id]:true},states:{[id]:'unknown'}}),/Подтверждение получено/);
});
test('one hook owner; old form removed; API remains in P5.1 hook', () => {
  const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
  const old=read('components/admin/FrdoPoBatchesPanel.jsx'), page=read('pages/FrdoRegistryWorkspace.jsx'), component=read('components/admin/registries/FrdoBatchSubmission.jsx');
  assert.doesNotMatch(old,/useFrdoSubmissionFence|submitBatch|submissionReference|Зафиксировать отправку|Подтвердить фактическую отправку/);
  assert.equal((page.match(/useFrdoSubmissionFence\(/g)||[]).length,1);
  assert.doesNotMatch(component,/markAdminFrdoSubmissionBatchSubmitted|createFrdoSubmissionFence|localStorage|removeItem/);
  assert.match(component,/await submission.confirm\(batch, reference\)/);
});
