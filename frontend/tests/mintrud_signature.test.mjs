import test from "node:test";
import assert from "node:assert/strict";
import { signaturePayload, confirmAndRead, validateScan, MAX_SCAN } from "../src/lib/mintrudSignature.js";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const p = { id:"synthetic", status:"recorded", updated_at:"2026-11-04T00:00:00Z", protocol_number:"S-1", protocol_date:"2026-11-04", participants:[] };
test("exact signing payload, stable id on retry after unknown response and read-before-retry", async () => {
 const payload=signaturePayload(p,"2026-11-04","same-uuid"), calls=[];
 assert.deepEqual(Object.keys(payload).sort(),["confirmation_id","confirmed_paper_original_signed","expected_updated_at","signed_on"]);
 const api={confirm:async(id,body)=>{calls.push(body);throw new Error("network");},read:async()=>{calls.push("read");return p;}};
 await confirmAndRead(api,p.id,payload);await confirmAndRead(api,p.id,payload);
 assert.equal(calls[0],calls[2]);assert.equal(calls[1],"read");assert.equal(calls[3],"read");
});
test("unknown commit discovered as signed; 409 classified; read failure blocks retry",async()=>{
 const signed=await confirmAndRead({confirm:async()=>{throw Error();},read:async()=>({...p,is_signed:true})},p.id,{});assert.equal(signed.protocol.is_signed,true);
 const conflict=await confirmAndRead({confirm:async()=>{throw Object.assign(Error(),{status:409});},read:async()=>p},p.id,{});assert.equal(conflict.conflict,true);
 const lost=await confirmAndRead({confirm:async()=>{throw Error();},read:async()=>{throw Error();}},p.id,{});assert.equal(lost.readFailed,true);assert.equal(lost.protocol,null);
});
test("scan size and extension/type validation",()=>{
 for(const [name,type] of [["s.pdf","application/pdf"],["s.jpg","image/jpeg"],["s.png","image/png"]])assert.equal(validateScan({name,type,size:MAX_SCAN}),"");
 for(const file of [{name:"s.pdf",type:"application/pdf",size:MAX_SCAN+1},{name:"s.pdf",size:0},{name:"s.exe",size:10},{name:"s.pdf",type:"image/png",size:10}])assert.ok(validateScan(file));
});
const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true},appType:"custom",optimizeDeps:{noDiscovery:true}});
test.after(()=>server.close());
const {MintrudSignaturePanel,SignatureSyncSummary}=await server.ssrLoadModule('/src/components/admin/MintrudSignaturePanel.jsx');
const render=(component,props)=>renderToStaticMarkup(createElement(component,props));
test("RBAC, draft gate, read-only signed download, optional scan",()=>{
 assert.doesNotMatch(render(MintrudSignaturePanel,{protocol:p}),/Подтвердить подписание<\/button>/);
 assert.doesNotMatch(render(MintrudSignaturePanel,{protocol:{...p,status:"draft"},permissions:["mintrud.read","mintrud.write"]}),/Подтвердить подписание<\/button>/);
 assert.match(render(MintrudSignaturePanel,{protocol:p,permissions:["mintrud.read","mintrud.write"]}),/Подтвердить подписание<\/button>/);
 const signed={...p,is_signed:true,signed_on:"2026-11-04",signed_scan_available:true,signed_scan_size:100};
 const view=render(MintrudSignaturePanel,{protocol:signed,permissions:["mintrud.read"]});assert.match(view,/Скачать скан/);assert.doesNotMatch(view,/type="file"/);
 assert.match(render(MintrudSignaturePanel,{protocol:{...signed,signed_scan_available:false},permissions:["mintrud.read","mintrud.write"]}),/подписание действительно без скана/);
});
test("partial synchronization never claims universal success, protected/conflict/matching are distinct",()=>{
 const html=render(SignatureSyncSummary,{receipt:{status:"UPDATED",changed_obligation_ids:["a"],unchanged_obligation_ids:["b"],blocked_obligations:[{reason:"protected_history"},{reason:"manual_conflict"}]},comparison:{members:[{enrollment_id:"e",sync_reason:"already_matching"}]}});
 for(const text of ["Заполнено: 1","Защищённая история","Конфликт реквизитов","текущие реквизиты совпадают","Часть записей"])assert.ok(html.includes(text));assert.ok(!html.includes("все данные перенесены"));
 assert.match(render(SignatureSyncSummary,{}),/не подтверждён/);
});
test("scan download uses bearer infrastructure; no public storage link; upload multipart",async()=>{
 global.sessionStorage={getItem:()=>"synthetic-token"};global.localStorage={getItem:()=>null};
 const client=await server.ssrLoadModule('/src/api/client.js');let options,clicked=false,revoked=false;
 global.fetch=async(url,o)=>{options=o;assert.match(url,/signed-scan$/);return {ok:true,blob:async()=>new Blob(["synthetic"],{type:"application/pdf"})};};
 global.document={createElement:()=>({click(){clicked=true},remove(){}}),body:{appendChild(){}}};
 const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;URL.createObjectURL=()=>"blob:synthetic";URL.revokeObjectURL=()=>{revoked=true};
 try{await client.downloadAdminMintrudScan("p");assert.equal(options.headers.Authorization,"Bearer synthetic-token");assert.ok(clicked);await new Promise(r=>setTimeout(r,1100));assert.ok(revoked);}finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
 global.fetch=async(url,o)=>{assert.ok(o.body instanceof FormData);assert.ok(!o.headers['Content-Type']);return {ok:true,text:async()=>"{}"};};await client.uploadAdminMintrudScan("p",new Blob(["x"],{type:"application/pdf"}));
});
