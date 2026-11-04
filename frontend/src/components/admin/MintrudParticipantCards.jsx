import { useEffect, useRef, useState } from "react";
import { getAdminMintrudProtocolRegistryReconciliation } from "../../api/client";
import { SavedMintrudFields } from "./MintrudRegistryDetails";
import { participantCard, participantHash, selectedParticipant } from "../../lib/mintrudParticipant";
const historyLabels = { approval: "История утверждения", submitted: "История отправки", accepted: "История принятия", export_attempt: "История выгрузки", batch_item: "История партии", registry_status: "Защищённое состояние реестра" };
const statusLabels = { pending_data: "Ожидает заполнения", ready: "Данные готовы", approved: "Утверждено", exported: "Выгружено", submitted: "Отправлено", accepted: "Принято" };
export function MintrudParticipantCardView({ card, onClose }) {
  return <section role="region" aria-label="Карточка участника" className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4" data-testid="mintrud-participant-card">
    <h3 className="text-base font-bold">Карточка участника — {card.name}</h3>
    <p className="text-sm">Курс (идентификатор): {card.courseId}</p>
    <p className="text-sm">Состояние обязательства Минтруда: {statusLabels[card.obligationStatus] || card.obligationStatus || "Не подтверждено"}</p>
    <SavedMintrudFields context={card.fields} />
    <p role="status" className="mt-3 text-sm font-semibold">{card.status}</p>
    {card.historyReasons.map(reason => <p key={reason} className="text-sm text-amber-900">{historyLabels[reason] || "История требует ручной проверки"}</p>)}
    {card.structuralIssues.length > 0 && <p className="text-sm text-amber-900">Связи записи требуют ручной проверки.</p>}
    <p className="mt-2 text-xs text-slate-600">Только чтение сохранённых реквизитов. Совпадение данных не подтверждает способ их переноса и не разрешает утверждение или экспорт.</p>
    <button type="button" onClick={onClose} className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">Вернуться к протоколу</button>
  </section>;
}
export function MintrudParticipantCards({ protocol, permissions = [] }) {
  const [hash, setHash] = useState(() => typeof window === "undefined" ? "" : window.location.hash);
  const [state, setState] = useState(null);
  const lastLink = useRef(null);
  const selected = selectedParticipant(protocol.id, hash);
  const allowed = permissions.includes("mintrud.read");
  useEffect(() => { const changed = () => setHash(window.location.hash);window.addEventListener("hashchange", changed);return () => window.removeEventListener("hashchange", changed); }, []);
  useEffect(() => {
    let alive = true;setState(null);
    if (!allowed || !selected) return;
    if (!protocol.participants?.some(p => p.enrollment_id === selected)) { setState({owner:selected,error:true});return; }
    getAdminMintrudProtocolRegistryReconciliation(protocol.id).then(report => {
      const card = participantCard(protocol, selected, report);
      if (alive) setState({owner:selected,card});
    }).catch(() => { if (alive) setState({owner:selected,error:true}); });
    return () => { alive = false; };
  }, [protocol, selected, allowed]);
  function close() {
    window.history.replaceState(null,"",window.location.pathname+window.location.search);
    setHash("");window.dispatchEvent(new HashChangeEvent("hashchange"));lastLink.current?.focus();
  }
  if (!allowed) return null;
  return <section className="mt-4" aria-label="Участники протокола">
    <h3 className="text-sm font-bold">Участники протокола</h3>
    <ul className="mt-2 space-y-2">{(protocol.participants || []).map(p => <li key={p.enrollment_id} className="flex flex-wrap items-center gap-3 text-sm">
      <span>{p.learner_name || p.enrollment_id}</span>
      <a data-enrollment-id={p.enrollment_id} className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-blue-800" href={participantHash(protocol.id,p.enrollment_id)} onClick={e => { lastLink.current=e.currentTarget; }}>Карточка участника</a>
    </li>)}</ul>
    {selected && (!state || state.owner !== selected) && <p role="status">Загрузка сохранённых реквизитов…</p>}
    {selected && state?.owner === selected && (state.error ? <div role="alert"><p>Не удалось подтвердить сохранённые реквизиты участника. Данные протокола не используются вместо реестра.</p><button type="button" onClick={close}>Вернуться к протоколу</button></div> : <MintrudParticipantCardView card={state.card} onClose={close} />)}
  </section>;
}
