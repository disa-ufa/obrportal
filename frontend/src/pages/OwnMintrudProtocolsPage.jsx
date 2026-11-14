import { MintrudParticipantCards } from "../components/admin/MintrudParticipantCards";
import { useEffect, useRef, useState } from "react";
import { useMintrudPermissions } from "../hooks/useMintrudPermissions";
import { listAdminMintrudProtocolDrafts } from "../api/client";
import { MintrudSignaturePanel } from "../components/admin/MintrudSignaturePanel";
export function OwnMintrudProtocolsPage() {
  const {permissions,sessionKey,revision,canWriteNow}=useMintrudPermissions();
  const previousSession = useRef(sessionKey);
  useEffect(() => {
    if (previousSession.current !== sessionKey && window.location.hash.startsWith("#participant=")) {
      window.history.replaceState(null,"",window.location.pathname+window.location.search);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    previousSession.current = sessionKey;
  }, [sessionKey]);
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900"><div className="mx-auto max-w-5xl space-y-4">
    <h1 className="text-xl font-bold">Протоколы проверки знаний Минтруда</h1>
    <nav className="flex gap-4"><a href="/account">Личный кабинет</a><a href="/login">Вход в систему</a></nav>
    {permissions.includes("mintrud.read") ? <Cards key={`${sessionKey}:${revision}`} permissions={permissions} canWriteNow={canWriteNow}/> : <p role="status" data-denied>Доступ к протоколам не подтверждён.</p>}
  </div></main>;
}
function Cards({permissions,canWriteNow}) {
  const [protocols,setProtocols]=useState(null),[error,setError]=useState(false);
  useEffect(()=>{let alive=true;listAdminMintrudProtocolDrafts().then(p=>{if(alive)setProtocols(p)}).catch(()=>{if(alive)setError(true)});return()=>{alive=false}},[]);
  if(error)return <p role="alert">Не удалось получить протоколы. Проверьте доступ и обновите страницу.</p>;
  if(!protocols)return <p role="status">Загрузка протоколов…</p>;
  return protocols.length ? protocols.map(p=><article key={p.id} className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="font-bold">Протокол № {p.protocol_number} от {p.protocol_date}</h2><MintrudSignaturePanel protocol={p} permissions={permissions} canWriteNow={canWriteNow} onChanged={updated=>setProtocols(items=>items.map(item=>item.id===updated.id?updated:item))}/><MintrudParticipantCards protocol={p} permissions={permissions} canWriteNow={canWriteNow}/></article>) : <p>Сохранённых протоколов нет.</p>;
}

export function OwnMintrudProtocolsLink() {
 const {permissions}=useMintrudPermissions();
 return permissions.includes("mintrud.read") ? <a className="mb-4 inline-block rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm" href="/mintrud/protocols">Протоколы Минтруда</a> : null;
}
