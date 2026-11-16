import RegistryBatchCard from "./registries/RegistryBatchCard";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminFrdoSubmissionBatches,
  getAdminFrdoSubmissionBatch,
} from "../../api/client";

const BUTTON = "rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = BUTTON + " bg-slate-900 text-white hover:bg-slate-700";
const SECONDARY = BUTTON + " bg-white text-slate-700 ring-1 ring-slate-300";
const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
const OUTCOMES = [
  ["accepted", "Принято"],
  ["rejected", "Отклонено"],
  ["correction_required", "Требуется исправление"],
];

function errorText(error) {
  const detail = error?.payload?.detail;
  if (typeof detail === "string") return detail;
  if (detail != null) return JSON.stringify(detail);
  return error?.message || "Не удалось выполнить операцию";
}

function pendingForm(item) {
  return {
    result_status: "accepted",
    external_id: "",
    errors: "",
    selected: false,
    ...(item.result_status ? {
      result_status: item.result_status,
      external_id: item.external_id || "",
      errors: (item.errors_json || []).join("\n"),
    } : {}),
  };
}

export function FrdoPoBatchesPanel({ readOnly = false, stage = "all", onSelectBatch, confirmedSubmission, refreshKey = 0 }) {
  const detailTarget = useRef(null);
  const detailGeneration = useRef(0);
  const historyGeneration = useRef(0);
  const [batches, setBatches] = useState([]);
  const [detail, setDetail] = useState(null);
  const [forms, setForms] = useState({});
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const generation = ++historyGeneration.current;
    const data = await getAdminFrdoSubmissionBatches();
    if (generation !== historyGeneration.current) return;
    setError("");
    setBatches(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reload().catch((err) => {
      if (active) setError(errorText(err));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; historyGeneration.current += 1; };
  }, [reload, refreshKey]);

  async function perform(callback) {
    setBusy(true);
    setError("");
    try {
      await callback();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(batch) {
    const generation = ++detailGeneration.current;
    detailTarget.current = batch.id;
    if (detail?.id === batch.id) {
      detailTarget.current = null;
      setDetail(null);
      return;
    }
    await perform(async () => {
      const next = await getAdminFrdoSubmissionBatch(batch.id);
      if (generation !== detailGeneration.current || next?.id !== batch.id || !Array.isArray(next.items)) return;
      setDetail(next);
      setForms(Object.fromEntries(
        (next.items || []).map((item) => [item.obligation_id, pendingForm(item)])
      ));
      setSourceDescription("");
      setSourceReference("");
    });
  }

  useEffect(() => {
    if (confirmedSubmission?.registry !== "frdo") return;
    setBatches(current => current.map(batch => batch.id === confirmedSubmission.id ? { ...batch, ...confirmedSubmission } : batch));
  }, [confirmedSubmission]);

  return (
    <section data-testid="admin-registries-frdo-batches" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-bold text-slate-950">Пакеты ФРДО ПО (XLSX)</h2>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        {readOnly
          ? "История ранее сформированных партий ФРДО. Доступны просмотр деталей и скачивание XLSX. Изменение данных отключено."
          : "Откройте партию для скачивания XLSX, подтверждения ручной отправки и внесения фактических результатов. Система не отправляет сведения во внешний реестр автоматически."}
      </p>
      {error ? (
        <div role="alert" data-testid="admin-registries-frdo-batch-error" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {readOnly && <p data-testid="admin-registries-frdo-batches-readonly" className="text-xs text-slate-600">Режим только для просмотра. Создание партий и изменение результатов недоступны.</p>}
        <button type="button" className={SECONDARY} disabled={busy} onClick={() => perform(reload)}>Обновить историю</button>
      </div>

      <h3 className="mt-6 text-sm font-bold text-slate-900">История пакетов</h3>
      {loading ? <p className="mt-2 text-xs">Загрузка пакетов...</p> : null}
      {!loading && !error && batches.length === 0 ? <p className="mt-2 text-xs text-slate-500">Пакетов пока нет.</p> : null}
      {!loading && !error && batches.length > 0 && !batches.some(batch => stage === "all" || (stage === "reconciled" ? Boolean(batch.reconciled_at) : !batch.reconciled_at && batch.status === stage)) ? <p role="status" className="mt-2 text-sm text-slate-600">В выбранной стадии партий нет. Выберите другую стадию.</p> : null}
      <div className="mt-3 grid gap-3">
        {batches.filter(batch => stage === "all" || (stage === "reconciled" ? Boolean(batch.reconciled_at) : !batch.reconciled_at && batch.status === stage)).map((batch) => {
          const expanded = detail?.id === batch.id;
          return (
            <article key={batch.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"
              data-testid={`admin-registries-frdo-batch-${batch.id}`}>
              <RegistryBatchCard batch={batch} knownDetail={detail} expanded={onSelectBatch ? false : undefined} onToggle={onSelectBatch ? () => onSelectBatch(batch.id) : undefined} />
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="break-all text-sm font-semibold">ФРДО ПО · XLSX</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {batch.record_count} записей · создано: {batch.generated_at || "—"}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {batch.reconciled_at ? "Результаты сверены" : batch.status === "submitted" ? "Ожидаются результаты" : "Ожидается отправка"}
                </span>
              </div>
              <details className="mt-2 break-all text-xs text-slate-500"><summary>Технические реквизиты</summary><p>UUID: {batch.id}</p><p>SHA-256: {batch.artifact_sha256}</p></details>
              <div className="mt-3 flex flex-wrap gap-2">

                <button type="button" className={SECONDARY} disabled={busy} onClick={() => openDetail(batch)}>
                  {expanded ? "Скрыть детали" : "Детали и результаты"}
                </button>
              </div>
              {expanded ? (
                <div className="mt-4 grid gap-3">
                  <p className="text-xs text-slate-700">
                    Записей: {detail.items?.length || 0}; обработано: {
                      (detail.items || []).filter((item) => item.result_status !== null).length
                    }. Для частичной сверки отметьте только записи, результаты которых уже получены.
                  </p>
                    <div className="grid gap-2">
                      {(detail.items || []).map((item) => (
                        <div key={item.id} className="rounded-lg bg-white p-2 text-xs">
                          <span className="break-all">{item.obligation_id}</span> — {item.result_status || "ожидает результата"}
                          {item.external_id ? " · " + item.external_id : ""}
                          {(item.errors_json || []).length ? " · " + item.errors_json.join("; ") : ""}
                        </div>
                      ))}
                    </div>

                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
