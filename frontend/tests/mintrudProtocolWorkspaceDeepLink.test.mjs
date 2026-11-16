import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveMintrudWorkspaceParticipant } from '../src/lib/mintrudProtocolWorkspaceDeepLink.js';

const protocolId = '723618e8-a2c6-4852-a5f3-f579d99a9343';
const enrollmentId = 'e690f4d3-3107-4c8a-8a36-983fb239f086';

const member = {
  member_id: '11111111-1111-4111-8111-111111111111',
  enrollment_id: enrollmentId,
  obligation_id: '22222222-2222-4222-8222-222222222222',
  user_id: '33333333-3333-4333-8333-333333333333',
};

function composition(members = [member]) {
  return {
    protocol: { id: protocolId },
    complete: true,
    read_only: true,
    participant_count: members.length,
    members,
  };
}

const hash = `#participant=${protocolId}:${enrollmentId}`;

test('valid verified member opens its exact context', () => {
  assert.deepEqual(
    resolveMintrudWorkspaceParticipant(protocolId, hash, composition()),
    member
  );
});

test('different protocol is rejected', () => {
  assert.equal(
    resolveMintrudWorkspaceParticipant(
      '44444444-4444-4444-8444-444444444444',
      hash,
      composition()
    ),
    null
  );
});

test('missing enrollment is rejected', () => {
  assert.equal(
    resolveMintrudWorkspaceParticipant(
      protocolId,
      `#participant=${protocolId}:55555555-5555-4555-8555-555555555555`,
      composition()
    ),
    null
  );
});

test('ambiguous enrollment is rejected', () => {
  const duplicate = {
    ...member,
    member_id: '66666666-6666-4666-8666-666666666666',
  };

  assert.equal(
    resolveMintrudWorkspaceParticipant(
      protocolId, hash, composition([member, duplicate])
    ),
    null
  );
});

test('missing obligation or user is rejected', () => {
  for (const field of ['obligation_id', 'user_id']) {
    const broken = { ...member, [field]: null };
    assert.equal(
      resolveMintrudWorkspaceParticipant(
        protocolId, hash, composition([broken])
      ),
      null
    );
  }
});

test('incomplete server composition is rejected', () => {
  const data = composition();
  data.complete = false;

  assert.equal(
    resolveMintrudWorkspaceParticipant(protocolId, hash, data),
    null
  );
});

test('malformed URL hash is rejected', () => {
  assert.equal(
    resolveMintrudWorkspaceParticipant(
      protocolId, '#participant=wrong', composition()
    ),
    null
  );
});

test('producer points to the P8 protocols workspace', () => {
  const source = readFileSync(
    new URL('../src/components/admin/MintrudProtocolDraftsPanel.jsx', import.meta.url),
    'utf8'
  );

  assert.ok(
    source.includes(
      'registry=mintrud&mintrudView=protocols&protocolId=${encodeURIComponent(d.id)}#participant='
    )
  );

  assert.ok(!source.includes('registry=mintrud&registryView=work#participant='));
});
