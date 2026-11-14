import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMintrudContextPayload } from '../src/utils/registryPresentation.js';

test('self training saves central-source scenario without stale listener employer', () => {
  const payload = buildMintrudContextPayload({reporting_scenario:'employer_self_training', employer_name:'Stale', employer_inn:'123'}, false);
  assert.equal(payload.reporting_scenario, 'employer_self_training');
  assert.equal(payload.employer_name, null);
  assert.equal(payload.employer_inn, null);
});
test('external employer survives save and protected protocol fields stay absent', () => {
  const payload = buildMintrudContextPayload({reporting_scenario:'external_training_provider', employer_name:' External ', employer_inn:' 0274000001 ', protocol_number:'protected'}, true);
  assert.equal(payload.employer_name, 'External');
  assert.equal(payload.employer_inn, '0274000001');
  assert.equal('protocol_number' in payload, false);
});
