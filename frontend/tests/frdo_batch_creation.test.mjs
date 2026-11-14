import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
const server = await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
after(() => server.close());
const {default: Component, creationCandidates} = await server.ssrLoadModule('/src/components/admin/registries/FrdoBatchCreation.jsx');
const row={id:'synthetic-row',registry:'frdo',status:'approved',regulatory_program_type:'vocational_training',applicability_decision:'required'};
test('approved required vocational FRDO candidate preserved',()=>assert.deepEqual(creationCandidates([row]),[row]));
for(const [name,patch] of [['other registry',{registry:'mintrud'}],['unknown registry',{registry:undefined}],['not required',{applicability_decision:'not_required'}],['review',{applicability_decision:'needs_review'}],['missing applicability',{applicability_decision:undefined}],['stale status',{status:'ready'}],['already exported',{status:'exported'}],['other program',{regulatory_program_type:'advanced_training'}]]) {
  test(name+' excluded from new batch',()=>assert.deepEqual(creationCandidates([{...row,...patch}]),[]));
}
test('empty selection cannot create and manual upload explained',()=>{
  const html=renderToStaticMarkup(createElement(Component,{obligations:[row]}));
  assert.match(html,/disabled="">Сформировать и скачать XLSX/); assert.match(html,/вручную/); assert.match(html,/не передаёт сведения автоматически/);
});
test('read-only offers no selection or create button',()=>{
  const html=renderToStaticMarkup(createElement(Component,{obligations:[row],readOnly:true}));
  assert.doesNotMatch(html,/type="checkbox"|Сформировать и скачать/);
});
test('single persistent owner outside old history panel; API contract unchanged',()=>{
  const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
  const old=read('components/admin/FrdoPoBatchesPanel.jsx'), page=read('pages/FrdoRegistryWorkspace.jsx');
  assert.doesNotMatch(old,/prepareAdminFrdoSubmissionBatch|createBatch|setSelected|batch-create|Сформировать и скачать/);
  assert.equal((page.match(/<FrdoBatchCreation\b/g)||[]).length,1);
  assert.match(page,/visible=\{active && workspaceView === "batches"\}/);
  assert.match(read('api/client.js'),/body: JSON.stringify\(\{ obligation_ids: obligationIds \}\)/);
});
