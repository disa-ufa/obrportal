import test from 'node:test';
import assert from 'node:assert/strict';
import { protocolLocation } from '../src/utils/mintrudProtocolPreview.js';

function readRoute(search) {
  const original = globalThis.window;
  try {
    globalThis.window = { location: { search } };
    return protocolLocation();
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
}

test('Mintrud work opens protocols by default', () => {
  const route = readRoute('?registry=mintrud&registryView=work');
  assert.equal(route.mode, 'protocols');
  assert.equal(route.id, '');
});

test('Mintrud direct entry opens protocols', () => {
  assert.equal(
    readRoute('?registry=mintrud').mode,
    'protocols'
  );
});

test('legacy learners remain explicitly selectable', () => {
  assert.equal(
    readRoute('?registry=mintrud&mintrudView=learners').mode,
    'learners'
  );
});

test('explicit protocol and ID are preserved', () => {
  const id = '723618e8-a2c6-4852-a5f3-f579d99a9343';
  const route = readRoute(
    '?registry=mintrud&mintrudView=protocols&protocolId=' + id
  );

  assert.equal(route.mode, 'protocols');
  assert.equal(route.id, id);
});

test('unrecognized mode does not activate legacy view', () => {
  assert.equal(
    readRoute('?registry=mintrud&mintrudView=unknown').mode,
    'protocols'
  );
});
