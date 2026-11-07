import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadAndRead, pendingScanAttempt, beginScanAttempt, clearScanAttempt } from '../src/lib/mintrudSignature.js';

const empty = { id: 'synthetic', is_signed: true, signed_scan_available: false };
const attached = { ...empty, signed_scan_available: true };
const failure = status => Object.assign(new Error('Synthetic refusal'), { status });

for (const status of [413, 415, 422]) test(`${status} permits a corrected file after successful reading`, async () => {
  let uploads = 0;
  const api = { upload: async () => { if (++uploads === 1) throw failure(status); }, read: async () => uploads === 1 ? empty : attached };
  const rejected = await uploadAndRead(api, empty.id, {});
  assert.equal(rejected.rejected, true); assert.equal(rejected.blocked, false); assert.equal(rejected.protocol, empty);
  const retry = await uploadAndRead(api, empty.id, {});
  assert.equal(uploads, 2); assert.equal(retry.protocol, attached); assert.equal(retry.blocked, false);
});

for (const status of [409, 500, undefined]) test(`${status ?? 'network'} remains blocked despite a successful read without a scan`, async () => {
  const result = await uploadAndRead({ upload: async () => { throw failure(status); }, read: async () => empty }, empty.id, {});
  assert.equal(result.rejected, false); assert.equal(result.blocked, true); assert.equal(result.protocol, empty);
});

for (const status of [409, 500, undefined]) test(`${status ?? 'network'} discovers a committed scan without another upload`, async () => {
  let uploads = 0;
  const result = await uploadAndRead({ upload: async () => { uploads++; throw failure(status); }, read: async () => attached }, empty.id, {});
  assert.equal(uploads, 1); assert.equal(result.protocol.signed_scan_available, true); assert.equal(result.blocked, true);
});

test('successful upload with unreadable or absent metadata cannot authorize another artifact', async () => {
  for (const read of [async () => { throw Error('read failed'); }, async () => empty]) {
    const result = await uploadAndRead({ upload: async () => {}, read }, empty.id, {});
    assert.equal(result.blocked, true);
  }
});

test('definitive rejection with failed read requires refresh, without an uncertain-commit block', async () => {
  const result = await uploadAndRead({ upload: async () => { throw failure(415); }, read: async () => { throw Error('offline'); } }, empty.id, {});
  assert.equal(result.protocol, null); assert.equal(result.blocked, false); assert.equal(result.rejected, true);
});

test('stale user, session, permission or protocol cannot start an upload', async () => {
  let calls = 0;
  assert.deepEqual(await uploadAndRead({ upload: async () => calls++, read: async () => calls++ }, empty.id, {}, () => false), { stale: true });
  assert.equal(calls, 0);
});

test('identity or permission changes during upload discard the old operation before reading', async () => {
  let current = true, reads = 0;
  const result = await uploadAndRead({ upload: async () => { current = false; }, read: async () => { reads++; return attached; } }, empty.id, {}, () => current);
  assert.deepEqual(result, { stale: true }); assert.equal(reads, 0);
});

test('identity changes during read discard the old response', async () => {
  let current = true;
  assert.deepEqual(await uploadAndRead({ upload: async () => {}, read: async () => { current = false; return attached; } }, empty.id, {}, () => current), { stale: true });
});

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) };
}
test('shared browser marker survives remount, another tab or user; another protocol is independent', () => {
  const state = storage();
  assert.equal(beginScanAttempt('p',state),true);
  assert.equal(pendingScanAttempt('p',state),true);
  assert.equal(beginScanAttempt('p',state),false);
  assert.equal(pendingScanAttempt('other',state),false);
});
test('only definitive rejection or an observed attachment permits clearing the pending marker', async () => {
  const state = storage();
  assert.equal(beginScanAttempt('p',state),true);
  const unknown = await uploadAndRead({upload:async()=>{throw failure(500)},read:async()=>empty},'p',{});
  if (unknown.rejected || unknown.protocol?.signed_scan_available) clearScanAttempt('p',state);
  assert.equal(beginScanAttempt('p',state),false);
  const confirmed = await uploadAndRead({upload:async()=>{throw failure(500)},read:async()=>attached},'p',{});
  if (confirmed.rejected || confirmed.protocol?.signed_scan_available) clearScanAttempt('p',state);
  assert.equal(pendingScanAttempt('p',state),false);
  assert.equal(beginScanAttempt('p',state),true);
  const rejected = await uploadAndRead({upload:async()=>{throw failure(415)},read:async()=>empty},'p',{});
  if (rejected.rejected || rejected.protocol?.signed_scan_available) clearScanAttempt('p',state);
  assert.equal(beginScanAttempt('p',state),true);
});
test('unavailable browser storage cannot authorize a new upload', () => {
  const broken = {getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  assert.equal(beginScanAttempt('p',undefined),false);
  assert.equal(beginScanAttempt('p',broken),false);
  assert.equal(pendingScanAttempt('p',broken),true);
  assert.equal(clearScanAttempt('p',broken),false);
});

test('HTML proxy refusals retain HTTP status in the actual upload transport', async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const previousFetch = global.fetch, previousSession = global.sessionStorage, previousLocal = global.localStorage;
  try {
    const client = await server.ssrLoadModule('/src/api/client.js');
    global.sessionStorage = { getItem: () => 'synthetic' }; global.localStorage = { getItem: () => null };
    for (const status of [413, 415, 409, 500]) {
      global.fetch = async () => ({ ok: false, status, text: async () => '<html>proxy refusal</html>' });
      await assert.rejects(() => client.uploadAdminMintrudScan('synthetic', new Blob(['x'])), error => error.status === status);
    }
  } finally {
    global.fetch = previousFetch; global.sessionStorage = previousSession; global.localStorage = previousLocal;
    await server.close();
  }
});
