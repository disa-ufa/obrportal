import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';import react from '@vitejs/plugin-react';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom'});test.after(()=>server.close());
const {AdminRegistriesPage}=await server.ssrLoadModule('/src/pages/AdminRegistriesPage.jsx');
const {MintrudProtocolDraftsPanel}=await server.ssrLoadModule('/src/components/admin/MintrudProtocolDraftsPanel.jsx');
const {OwnMintrudProtocolsPage}=await server.ssrLoadModule('/src/pages/OwnMintrudProtocolsPage.jsx');
test('actual administrative page remains renderable and denies unconfirmed protocol access',()=>{
 const html=renderToStaticMarkup(createElement(AdminRegistriesPage));assert.ok(html.includes('Реестр')||html.includes('реестр'));
 assert.match(renderToStaticMarkup(createElement(MintrudProtocolDraftsPanel,{courseId:'synthetic'})),/Доступ к протоколам не подтверждён/);
 assert.match(renderToStaticMarkup(createElement(OwnMintrudProtocolsPage)),/Доступ к протоколам не подтверждён/);
});
test('all administrative mutation handlers and controls require live write permission',()=>{
 const source=readFileSync(new URL('../src/components/admin/MintrudProtocolDraftsPanel.jsx',import.meta.url),'utf8');
 for(const name of ['save','saveEdit','recordSavedDraft','beginEdit'])assert.match(source,new RegExp('function '+name+'\\([^)]*\\) \\{\\s*if \\(!canWriteNow\\(\\)\\) return;'));
 assert.match(source,/if \(!canWriteNow\(\) \|\| !report/);assert.match(source,/schemaReady && canWrite/);assert.match(source,/canWrite && readinessById/);assert.match(source,/canWrite && editingDraft/);
});
