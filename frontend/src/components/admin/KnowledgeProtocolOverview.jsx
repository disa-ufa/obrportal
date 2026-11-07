import { protocolPresentation, protocolSteps, protocolDateLabel } from "../../utils/knowledgeProtocolPresentation";

export function KnowledgeProtocolOverview({ protocol, canWrite, onStep }) {
  const state = protocolPresentation(protocol);
  return <section className="mb-5 space-y-4" aria-label="Этапы протокола">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Протокол № {protocol.protocol_number}</h1><p className="mt-1 text-sm text-slate-600">{protocolDateLabel(protocol.protocol_date)} · {protocol.participant_count ?? protocol.participants?.length ?? 0} участников</p></div>
      <div className="text-right text-sm"><strong className="rounded-lg bg-blue-50 px-3 py-2 text-blue-900">{state.label}</strong><p className="mt-3">{state.scan}</p></div>
    </div>
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{protocolSteps.map((label, index) => <li key={label}>
      <button type="button" aria-current={state.step === index ? "step" : undefined} onClick={() => onStep(index)} className={`h-full w-full rounded-xl border p-3 text-left text-sm ${state.step === index ? "border-blue-600 bg-blue-50 font-bold text-blue-900" : "border-slate-200 bg-white"}`}>
        <span className="block text-xs text-slate-500">Этап {index + 1}</span>{label}
      </button>
    </li>)}</ol>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm" role="status">
      <p className="font-bold">Следующее действие: {state.next}</p><p className="mt-1">{state.reason}</p>
      {!canWrite && <p className="mt-2">Доступен просмотр. Для изменения протокола требуется право записи Минтруда.</p>}
      <button type="button" className="mt-3 rounded-lg border border-blue-600 bg-white px-3 py-2 font-semibold text-blue-800" onClick={() => onStep(state.step)}>{canWrite || state.step >= 4 ? state.next : "Просмотреть текущий этап"}</button>
    </div>
  </section>;
}
