import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyMintrudExportSelection} from '../src/utils/mintrudWorkflow.js';
const fixture = () => ({getAdminMintrudExportStatus: async()=>({enabled:true,read_only:true}),getAdminMintrudExportReadiness:async id=>({obligation_id:id,batch_eligible:true,read_only:true,not_authorization_for_export:true})});
test('server-confirmed selection',async()=>{assert.equal((await verifyMintrudExportSelection(fixture(),['o'])).enabled,true);});
for(const value of [null,{}, {enabled:'true',read_only:true},{enabled:true},{enabled:false,read_only:true}])test('unknown/disabled gate '+JSON.stringify(value),async()=>{const api=fixture();api.getAdminMintrudExportStatus=async()=>value;await assert.rejects(verifyMintrudExportSelection(api,['o']));});
for(const field of ['obligation_id','batch_eligible','read_only','not_authorization_for_export'])test('reject incomplete readiness '+field,async()=>{const api=fixture(),read=api.getAdminMintrudExportReadiness;api.getAdminMintrudExportReadiness=async id=>({...await read(id),[field]:false});await assert.rejects(verifyMintrudExportSelection(api,['o']));});
test('permission loss rejects without retry',async()=>{const api=fixture();let calls=0;api.getAdminMintrudExportReadiness=async()=>{calls++;throw Error('denied')};await assert.rejects(verifyMintrudExportSelection(api,['o']));assert.equal(calls,1);});
test('empty and duplicate selections fail closed',async()=>{for(const ids of [[],['o','o']])await assert.rejects(verifyMintrudExportSelection(fixture(),ids));});
