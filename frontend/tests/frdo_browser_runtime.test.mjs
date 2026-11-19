import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const helper=new URL('./frdo_browser_runtime.mjs',import.meta.url).href;
function child(expression,extra={}) {
  const env={...process.env,UI_BROWSER_PATH:process.execPath,...extra};
  delete env.PLAYWRIGHT_MODULE;
  if(extra.PLAYWRIGHT_MODULE)env.PLAYWRIGHT_MODULE=extra.PLAYWRIGHT_MODULE;
  return spawnSync(process.execPath,['--input-type=module','-e',`const runtime=await import(${JSON.stringify(helper)}); ${expression}`],{env,encoding:'utf8',timeout:15000});
}
function pass(expression,extra){const result=child(expression,extra);assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'PASS');}
test('default package loader works with PLAYWRIGHT_MODULE absent',()=>pass("if(typeof runtime.chromium.launch!=='function')throw Error('missing chromium');console.log('PASS')"));
test('normalizes a named ESM export',()=>pass("const b={launch(){},executablePath(){}};if(runtime.chromiumFromModule({chromium:b})!==b)throw Error('ESM');console.log('PASS')"));
test('normalizes CommonJS default exports',()=>pass("const b={launch(){},executablePath(){}};if(runtime.chromiumFromModule({default:{chromium:b}})!==b)throw Error('CJS');console.log('PASS')"));
test('rejects an invalid browser module',()=>pass("let rejected=false;try{runtime.chromiumFromModule({default:{}})}catch{rejected=true}if(!rejected)throw Error('accepted missing browser');console.log('PASS')"));
test('explicit real CJS module remains supported',()=>{
  const url=pathToFileURL(createRequire(import.meta.url).resolve('playwright-core')).href;
  pass("if(typeof runtime.chromium.launch!=='function')throw Error('CJS override');console.log('PASS')",{PLAYWRIGHT_MODULE:url});
});
test('Windows chooses Edge without needing a Linux browser',()=>pass("if(runtime.selectBrowserPath({},'win32','')!=='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')throw Error('Edge');console.log('PASS')"));
test('Linux chooses installed Chromium; explicit executable overrides selection',()=>pass("const b={executablePath:()=>'/synthetic/chromium'};if(runtime.selectBrowserPath(b,'linux','')!=='/synthetic/chromium'||runtime.selectBrowserPath(b,'linux','/explicit/browser')!=='/explicit/browser')throw Error('selection');console.log('PASS')"));
test('missing executable fails instead of returning PASS',()=>{
  const result=child("console.log('UNEXPECTED PASS')",{UI_BROWSER_PATH:new URL('./missing-synthetic-browser',import.meta.url).pathname});
  assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/Browser missing/);assert.doesNotMatch(result.stdout,/PASS/);
});
