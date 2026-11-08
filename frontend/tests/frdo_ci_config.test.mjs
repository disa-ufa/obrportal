import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {Linter} from 'eslint';
import config from '../eslint.config.js';
const require=createRequire(import.meta.url),yaml=require('js-yaml');
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const workflow=yaml.load(read('.github/workflows/ci.yml'));
const steps=workflow.jobs.test.steps;
const named=name=>{const s=steps.find(s=>s.name===name);assert.ok(s,name);return s;};
test('valid workflows and existing trigger branches with manual option',()=>{
  assert.deepEqual(workflow.on.push.branches,['main','develop']);assert.deepEqual(workflow.on.pull_request.branches,['main','develop']);
  assert.ok(Object.hasOwn(workflow.on,'workflow_dispatch'));assert.deepEqual(Object.keys(workflow.jobs),['test']);assert.equal(workflow.jobs.test['runs-on'],'ubuntu-24.04');
});
test('locked install and browser precede bounded regression before backend services',()=>{
  const install=named('Install locked frontend dependencies'),browser=named('Install pinned Playwright Chromium'),gate=named('Run synthetic FRDO unit and browser regressions');
  assert.equal(install.run,'npm ci --prefix frontend --ignore-scripts');assert.match(browser.run,/playwright-core\/cli.js install --with-deps chromium/);
  assert.equal(gate.run,'python scripts/check_frdo_ci.py --evidence runner-evidence/frdo');
  assert.ok(steps.indexOf(install)<steps.indexOf(browser)&&steps.indexOf(browser)<steps.indexOf(gate));assert.ok(steps.indexOf(gate)<steps.indexOf(named('Build and start services')));
  for(const s of [install,browser,gate,named('Validate FRDO CI execution contract'),named('Run full frontend lint')])assert.ok(s['timeout-minutes']>0);
});
test('diagnostics uploaded even on failure; full lint remains a gate',()=>{
  const upload=named('Preserve FRDO diagnostics');assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
  assert.equal(upload.with.path,'runner-evidence/frdo');assert.equal(named('Run full frontend lint').run,'npm run lint --prefix frontend');
  assert.ok(!Object.hasOwn(named('Run full frontend lint'),'continue-on-error'));
});
test('commands and seven browser files exist; build is performed by the gate',()=>{
  for(const p of ['frontend/tests/frdo_auth_session.browser.mjs','frontend/tests/frdo_main_workflow.browser.mjs','frontend/tests/frdo_main_integration.test.mjs','frontend/tests/fixtures/main_registry_contract.json','scripts/check_frdo_ci.py','scripts/test_frdo_ci.py','scripts/check_frdo_operator_workflow.py','scripts/check_frdo_batch_creation.py','frontend/tests/frdo_browser_runtime.test.mjs',...['frdo_batch_creation','frdo_batch_download','frdo_submission_fence','frdo_selected_results','registry_batch_navigation','frdo_pending_storage','frdo_operator_workflow'].map(n=>'frontend/tests/'+n+'.browser.mjs')])assert.ok(existsSync(new URL(p,root)),p);
  const source=read('scripts/check_frdo_ci.py');assert.ok(source.indexOf("run(out,'build'")<source.indexOf('for name in BROWSERS:'));
  assert.match(read('scripts/check_frdo_batch_creation.py'),/tests\/frdo_browser_runtime\.test\.mjs/);
  assert.match(source,/verify_unit\(log\)/);assert.match(source,/verify_browser\(folder,name,log\)/);
});
test('Playwright version pinned in existing npm lock',()=>{
  const pkg=JSON.parse(read('frontend/package.json')),lock=JSON.parse(read('frontend/package-lock.json'));
  assert.equal(pkg.devDependencies['playwright-core'],'1.57.0');assert.equal(lock.packages[''].devDependencies['playwright-core'],'1.57.0');assert.equal(lock.packages['node_modules/playwright-core'].version,'1.57.0');assert.ok(lock.packages['node_modules/playwright-core'].integrity);
});
test('FRDO JSX is parsed with the existing JSX-capable parser',async()=>{
  assert.ok(config.some(c=>c.files?.includes('tests/**/*.{js,jsx,mjs}')&&c.languageOptions.parserOptions.ecmaFeatures.jsx));
  const messages=new Linter().verify(read('frontend/src/components/admin/registries/FrdoBatchCreation.jsx'),{languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}}});assert.deepEqual(messages,[]);
});

test('main-based gate requires lifecycle and legacy evidence and 120 applicable units',()=>{
 const source=read('scripts/check_frdo_ci.py');
 assert.match(source,/'auth':18/);assert.match(source,/'main-workflow':33/);assert.match(source,/completeMainWorkflow/);assert.match(source,/<120/);
 assert.match(read('scripts/check_frdo_batch_creation.py'),/frdo_main_integration.test.mjs/);
});
