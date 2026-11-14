import test from 'node:test';
import assert from 'node:assert/strict';
import {batchSelectionUrl,validBatchId} from '../src/utils/registryBatchNavigation.js';
const id='11111111-1111-4111-8111-111111111111';
test('UUID validation',()=>{assert.ok(validBatchId(id));for(const bad of ['',null,'../../api','synthetic'])assert.equal(validBatchId(bad),false);});
test('selection and close preserve stage and course query',()=>{const start='https://example.invalid/admin/registries?registry=frdo&registryView=batches&batchStage=submitted&course=course-1';const u=batchSelectionUrl(start,'mintrud',id);assert.equal(u.searchParams.get('batchId'),id);assert.equal(u.searchParams.get('registry'),'mintrud');assert.equal(u.searchParams.get('course'),'course-1');assert.equal(u.searchParams.get('batchStage'),'submitted');const close=batchSelectionUrl(u.href,'mintrud','');assert.equal(close.searchParams.has('batchId'),false);assert.equal(close.searchParams.get('batchStage'),'submitted');});
