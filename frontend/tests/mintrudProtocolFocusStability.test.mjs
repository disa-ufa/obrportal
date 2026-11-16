import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/components/admin/MintrudProtocolWorkspace.jsx', import.meta.url),
  'utf8'
);

test('window focus does not trigger protocol reload', () => {
  assert.doesNotMatch(
    source,
    /window\.addEventListener\(['"]focus['"]/
  );
});

test('tab visibility does not trigger protocol reload', () => {
  assert.doesNotMatch(
    source,
    /document\.addEventListener\(['"]visibilitychange['"]/
  );
});

test('actual Mintrud input changes still refresh data', () => {
  assert.match(
    source,
    /window\.addEventListener\('obrportal-mintrud-inputs-change', onInputsChange\)/
  );
  assert.match(
    source,
    /window\.removeEventListener\('obrportal-mintrud-inputs-change', onInputsChange\)/
  );
});

test('authentication invalidation remains active', () => {
  assert.match(
    source,
    /window\.addEventListener\('obrportal-auth-change', invalidate\)/
  );
  assert.match(
    source,
    /window\.addEventListener\('storage', invalidate\)/
  );
});

test('participant deep link is preserved', () => {
  assert.match(
    source,
    /resolveMintrudWorkspaceParticipant\(/
  );
  assert.match(
    source,
    /setEditor\(\{ row: member, target: 'context' \}\)/
  );
});

test('manual refresh and preview checking remain available', () => {
  assert.ok(
    source.includes('onClick={() => { setPreview(null); setRevision(value => value + 1); }}')
  );
  assert.ok(source.includes('onClick={check}'));
  assert.ok(source.includes('setInterval(async () =>'));
});
