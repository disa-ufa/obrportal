import test from 'node:test';
import assert from 'node:assert/strict';
import { scanBlockReason, uploadAndRead, withScanAttemptLock, beginScanAttempt, pendingScanAttempt } from '../src/lib/mintrudSignature.js';

const valid = { sessionCurrent:true, write:true, authorized:true, signed:true };
for (const [patch,text] of [
  [{sessionCurrent:false},'Авторизация изменилась'], [{write:false},'mintrud.write'],
  [{authorized:false},'Актуальность прав'], [{signed:false},'подписание оригинала'],
  [{available:true},'Повторная загрузка запрещена'], [{busy:true},'текущей операции'],
  [{pending:true},'состояния хранилища'], [{unread:true},'актуальное состояние'],
]) test(`visible guard: ${text}`, () => assert.ok(scanBlockReason({...valid,...patch}).includes(text)));
test('only current permitted signed operation is enabled',()=>assert.equal(scanBlockReason(valid),''));
test('missing atomic browser locking cannot invoke an upload',async()=>{
  let calls=0;
  assert.deepEqual(await withScanAttemptLock('synthetic',()=>calls++,null),{unavailable:true});
  assert.equal(calls,0);
});
test('occupied lock does not queue a later upload',async()=>{
  let calls=0;
  const locks={request:async(name,options,callback)=>{assert.equal(options.ifAvailable,true);return callback(null);}};
  assert.deepEqual(await withScanAttemptLock('synthetic',()=>calls++,locks),{occupied:true});
  assert.equal(calls,0);
});
for(const status of [200,413,415,422,409,503,'network']) test(`POST ${status}: authorized readback and durable uncertainty`,async()=>{
  const calls=[],state=new Map(),storage={getItem:k=>state.get(k)??null,setItem:(k,v)=>state.set(k,v)};
  assert.equal(beginScanAttempt('synthetic',storage),true);
  const result=await uploadAndRead({upload:async()=>{calls.push('post');if(status!==200)throw Object.assign(Error('synthetic'),{status:typeof status==='number'?status:undefined});},
    read:async()=>{calls.push('get');return {signed_scan_available:false};}},'synthetic',{},()=>true,phase=>calls.push(phase));
  assert.deepEqual(calls,['post','verifying','get']);
  assert.equal(result.rejected,[413,415,422].includes(status));
  assert.equal(result.blocked,![413,415,422].includes(status));
  // The helper cannot silently erase a durable marker even on a negative GET.
  assert.equal(pendingScanAttempt('synthetic',storage),true);
});
