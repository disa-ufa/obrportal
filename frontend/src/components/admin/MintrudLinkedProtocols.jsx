import { useEffect, useState } from "react";
import { getAdminMintrudLinkedProtocols } from "../../api/client";

const labels = {
  satisfactory: "Удовлетворительно",
  unsatisfactory: "Неудовлетворительно",
};
const verdicts = {
  draft_only: "Черновик — синхронизация не разрешена",
  protected_history: "Есть утверждение или выгрузка — только ручная сверка",
  manual_conflict: "Расхождение с введёнными реквизитами Минтруда",
  blocked_inconsistent_links: "Обнаружена несогласованность связанных записей",
  source_incomplete: "В протоколе отсутствуют данные проверки",
  missing_target_fields: "Данные Минтруда ещё не синхронизированы",
  matches: "Реквизиты совпадают (не означает утверждение)",
};
function displayResult(value) {
  return labels[value] || value || "—";
}
function displayDate(value) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value);
}

export function MintrudLinkedProtocols({ obligationId, onOpenProtocol }) {
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    setData(null);
    getAdminMintrudLinkedProtocols(obligationId).then((result) => {
      if (current) setData(result);
    }).catch((exc) => {
      if (current) setError(exc?.message || "Не удалось получить связанные протоколы");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [obligationId, revision]);

  const protocols = Array.isArray(data?.protocols) ? data.protocols : [];
  return (
    <section data-testid="mintrud-linked-protocols" className="mb-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">Связанные протоколы проверки знаний</h3>
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs" onClick={() => setRevision(v => v + 1)} disabled={loading}>Обновить</button>
      </div>
      <p className="mt-1 text-xs text-slate-600">Данные для просмотра. Черновик не подтверждает решение комиссии и не заполняет реестр Минтруда.</p>
      {loading ? <p className="mt-2 text-xs">Загрузка…</p> : null}
      {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
      {!loading && !error && protocols.length === 0 ? (
        <p className="mt-2 text-xs text-slate-700">Слушатель пока не включён в проект протокола для этой записи Минтруда.</p>
      ) : null}
      {protocols.map((protocol) => {
        const result = protocol.fields?.knowledge_check_result || {};
        const checkDate = protocol.fields?.knowledge_check_date || {};
        const number = protocol.fields?.protocol_number || {};
        const isDraft = protocol.status === "draft";
        const hasConflict = (protocol.conflict_fields || []).length > 0;
        const hasHistory = (protocol.history_reasons || []).length > 0;
        const provenance = protocol.sync_provenance || {};

        return (
          <div key={protocol.id} className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Протокол № {protocol.protocol_number} от {displayDate(protocol.protocol_date)}</span>
              <span className={isDraft ? "rounded bg-amber-100 px-2 py-1 text-xs text-amber-800" : "rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"}>
                {isDraft ? "Черновик" : protocol.status === "recorded" && protocol.recorded_snapshot_verified ? "Результаты зафиксированы (не подписан)" : "Требуется проверка статуса"}
              </span>
            </div>
            {provenance.applied ? (
              <p data-testid="mintrud-protocol-synced" className="mt-2 text-xs font-semibold text-emerald-700">
                Заполнено из протокола № {protocol.protocol_number} после подтверждённой синхронизации.
              </p>
            ) : provenance.ever_synced ? (
              <p className="mt-2 text-xs font-semibold text-amber-800">
                Ранее была синхронизация этого протокола, но текущие реквизиты требуют сверки.
              </p>
            ) : null}
            <div className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
              <span>Результат из протокола: <strong>{displayResult(result.source)}</strong></span>
              <span>Дата проверки из протокола: <strong>{displayDate(checkDate.source)}</strong></span>
              <span>Номер в Минтруде: <strong>{number.existing || "—"}</strong></span>
              <span>Дата в Минтруде: <strong>{displayDate(checkDate.existing)}</strong></span>
              <span>Результат в Минтруде: <strong>{displayResult(result.existing)}</strong></span>
            </div>
            <p className={`mt-2 text-xs ${isDraft || hasConflict || hasHistory ? "text-amber-800" : "text-slate-600"}`}>
              {verdicts[protocol.verdict] || "Требуется дополнительная проверка"}.
              {hasConflict ? " Есть несовпадающие поля; автоматическая перезапись запрещена." : ""}
              {hasHistory ? " Имеется защищённая история Минтруда." : ""}
            </p>
            <button type="button" className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs" onClick={() => onOpenProtocol?.(protocol)}>
              Открыть протокол
            </button>
          </div>
        );
      })}
      <p className="mt-3 text-xs text-slate-500">Заполнить реестровые реквизиты можно только после фактической фиксации комиссии и отдельной разрешённой синхронизации.</p>
    </section>
  );
}
