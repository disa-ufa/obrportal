import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
after(()=>server.close());
const Component=(await server.ssrLoadModule('/src/components/admin/registries/MintrudBatchHistory.jsx')).default;
test('Mintrud history initially shows loading with refresh disabled and no write actions',()=>{
  const html=renderToStaticMarkup(createElement(Component,{onSelect:()=>assert.fail('render must not select')}));
  assert.match(html,/Загрузка истории/);
  assert.match(html,/<button[^>]*disabled/);
  assert.equal((html.match(/<button/g)||[]).length,1);
  assert.doesNotMatch(html,/Создать|Отправить|Сформировать/);
});
