import { useCallback, useEffect, useMemo, useState } from "react";
import {
  prepareAdminFrdoSubmissionBatch,
  getAdminFrdoSubmissionBatches,
  getAdminFrdoSubmissionBatch,
  downloadAdminFrdoSubmissionBatch,
  markAdminFrdoSubmissionBatchSubmitted,
  recordAdminFrdoSubmissionBatchResults,
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

export function FrdoPoBatchesPanel({ obligations, onRefresh }) {
  const [selected, setSelected] = useState([]);
  const [batches, setBatches] = useState([]);
  const [detail, setDetail] = useState(null);
  const [forms, setForms] = useState({});
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [submissionReference, setSubmissionReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const approved = useMemo(
    () => (obligations || []).filter(
      (item) => (
        item.status === "approved"
        && item.regulatory_program_type === "vocational_training"
      )
    ),
    [obligations]
  );
  const approvedIds = useMemo(() => new Set(approved.map((item) => item.id)), [approved]);
  const selectedVisible = approved.filter((item) => selected.includes(item.id));

  const reload = useCallback(async () => {
    const data = await getAdminFrdoSubmissionBatches();
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
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    setSelected((current) => current.filter((id) => approvedIds.has(id)));
  }, [approvedIds]);

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

  async function createBatch() {
    const ids = selectedVisible.map((item) => item.id);
    if (!ids.length || ids.length > 1001) return;
    await perform(async () => {
      const created = await prepareAdminFrdoSubmissionBatch(ids);
      setSelected([]);
      await reload();
      await downloadAdminFrdoSubmissionBatch(created.id);
      if (onRefresh) await onRefresh();
    });
  }

  async function openDetail(batch) {
    if (detail?.id === batch.id) {
      setDetail(null);
      return;
    }
    await perform(async () => {
      const next = await getAdminFrdoSubmissionBatch(batch.id);
      setDetail(next);
      setForms(Object.fromEntries(
        (next.items || []).map((item) => [item.obligation_id, pendingForm(item)])
      ));
      setSourceDescription("");
      setSourceReference("");
      setSubmissionId("");
    });
  }

  async function submitBatch(event, batch) {
    event.preventDefault();
    const completed = await perform(async () => {
      await markAdminFrdoSubmissionBatchSubmitted(batch.id, {
        external_reference: submissionReference.trim() || null,
      });
      const updated = await getAdminFrdoSubmissionBatch(batch.id);
      setDetail(updated);
      await reload();
      if (onRefresh) await onRefresh();
    });
    if (completed) setSubmissionId("");
  }

  function updateForm(obligationId, key, value) {
    setForms((previous) => ({
      ...previous,
      [obligationId]: { ...previous[obligationId], [key]: value },
    }));
  }

  async function saveResults(event, batch) {
    event.preventDefault();
    if (!detail || detail.id !== batch.id || detail.reconciled_at) return;
    const items = (detail.items || [])
      .filter((item) => item.result_status == null && forms[item.obligation_id]?.selected)
      .map((item) => {
        const form = forms[item.obligation_id];
        return {
          obligation_id: item.obligation_id,
          result_status: form.result_status,
          external_id: form.result_status === "accepted" ? (form.external_id.trim() || null) : null,
          errors: form.result_status === "accepted" ? [] :
            form.errors.split("\n").map((value) => value.trim()).filter(Boolean),
        };
      });
    if (!items.length) {
      setError("Выберите хотя бы одну запись с полученным результатом.");
      return;
    }
    await perform(async () => {
      const next = await recordAdminFrdoSubmissionBatchResults(batch.id, {
        source_description: sourceDescription.trim(),
        source_reference: sourceReference.trim() || null,
        items,
      });
      setDetail(next);
      setForms(Object.fromEntries(
        (next.items || []).map((item) => [item.obligation_id, pendingForm(item)])
      ));
      await reload();
      if (onRefresh) await onRefresh();
    });
  }

  return (
    <section data-testid="admin-registries-frdo-batches" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-bold text-slate-950">Пакеты ФРДО ПО (XLSX)</h2>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Выберите утверждённые записи, сформируйте XLSX и загрузите его во ФРДО вручную.
        После загрузки отдельно подтвердите отправку и внесите фактические результаты.
        Система не отправляет сведения во внешний реестр автоматически.
      </p>
      {error ? (
        <div role="alert" data-testid="admin-registries-frdo-batch-error" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-700">Выбрано: {selectedVisible.length} / 1001</span>
        <button type="button" className={SECONDARY} disabled={busy || !approved.length}
          onClick={() => setSelected(approved.slice(0, 1001).map((item) => item.id))}>
          Выбрать утверждённые на странице
        </button>
        <button type="button" className={SECONDARY} disabled={busy || !selected.length}
          onClick={() => setSelected([])}>Очистить выбор</button>
        <button type="button" className={PRIMARY}
          data-testid="admin-registries-frdo-batch-create"
          disabled={busy || !selectedVisible.length || selectedVisible.length > 1001}
          onClick={createBatch}>Сформировать и скачать XLSX</button>
        <button type="button" className={SECONDARY} disabled={busy}
          onClick={() => perform(reload)}>Обновить историю</button>
      </div>
      {approved.length ? (
        <div className="mt-3 max-h-36 overflow-auto rounded-xl border border-slate-200 p-2">
          {approved.map((item) => (
            <label key={item.id} className="flex items-center gap-2 p-1 text-xs text-slate-700">
              <input type="checkbox" checked={selected.includes(item.id)} disabled={busy}
                onChange={(event) => setSelected((current) =>
                  event.target.checked ?
                    [...current.filter((id) => id !== item.id), item.id] :
                    current.filter((id) => id !== item.id)
                )}/>
              <span className="break-all">{item.id}</span>
            </label>
          ))}
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">На текущей странице нет утверждённых записей профессионального обучения (ПО).</p>}

      <h3 className="mt-6 text-sm font-bold text-slate-900">История пакетов</h3>
      {loading ? <p className="mt-2 text-xs">Загрузка пакетов...</p> : null}
      {!loading && batches.length === 0 ? <p className="mt-2 text-xs text-slate-500">Пакетов пока нет.</p> : null}
      <div className="mt-3 grid gap-3">
        {batches.map((batch) => {
          const expanded = detail?.id === batch.id;
          const canRecord = expanded && batch.status === "submitted" && !detail.reconciled_at;
          return (
            <article key={batch.id} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200"
              data-testid={`admin-registries-frdo-batch-${batch.id}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="break-all text-sm font-semibold">{batch.id}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {batch.record_count} записей · {batch.status} · {batch.generated_at || "—"}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {batch.reconciled_at ? "Результаты сверены" : batch.status === "submitted" ? "Ожидаются результаты" : "Ожидается отправка"}
                </span>
              </div>
              <div className="mt-2 break-all text-[11px] text-slate-500">SHA-256: {batch.artifact_sha256}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {batch.has_artifact ? <button type="button" className={SECONDARY} disabled={busy}
                  onClick={() => perform(() => downloadAdminFrdoSubmissionBatch(batch.id))}>Скачать XLSX</button> : null}
                {batch.status === "exported" ? <button type="button" className={PRIMARY} disabled={busy}
                  onClick={() => { setSubmissionId(batch.id); setSubmissionReference(""); setDetail(null); }}>
                  Зафиксировать отправку
                </button> : null}
                <button type="button" className={SECONDARY} disabled={busy} onClick={() => openDetail(batch)}>
                  {expanded ? "Скрыть детали" : "Детали и результаты"}
                </button>
              </div>
              {submissionId === batch.id && batch.status === "exported" ? (
                <form onSubmit={(event) => submitBatch(event, batch)} className="mt-3 grid gap-2">
                  <label className="text-xs">Внешний номер отправки (необязательно)
                    <input className={INPUT} maxLength={255} value={submissionReference}
                      onChange={(event) => setSubmissionReference(event.target.value)} disabled={busy}/>
                  </label>
                  <div className="flex gap-2">
                    <button className={PRIMARY} disabled={busy} type="submit">Подтвердить фактическую отправку</button>
                    <button type="button" className={SECONDARY} disabled={busy} onClick={() => setSubmissionId("")}>Отмена</button>
                  </div>
                </form>
              ) : null}
              {expanded ? (
                <div className="mt-4 grid gap-3">
                  <p className="text-xs text-slate-700">
                    Записей: {detail.items?.length || 0}; обработано: {
                      (detail.items || []).filter((item) => item.result_status !== null).length
                    }. Для частичной сверки отметьте только записи, результаты которых уже получены.
                  </p>
                  {canRecord ? (
                    <form onSubmit={(event) => saveResults(event, batch)}
                      data-testid="admin-registries-frdo-batch-results-form" className="grid gap-3">
                      <label className="grid gap-1 text-xs font-semibold">
                        Источник результатов (обязательно)
                        <input className={INPUT} minLength={3} maxLength={512} required
                          placeholder="Например: протокол обработки в личном кабинете ФРДО"
                          disabled={busy} value={sourceDescription}
                          onChange={(event) => setSourceDescription(event.target.value)}/>
                      </label>
                      <label className="grid gap-1 text-xs">
                        Номер / ссылка на результат (необязательно)
                        <input className={INPUT} maxLength={255} disabled={busy}
                          value={sourceReference} onChange={(event) => setSourceReference(event.target.value)}/>
                      </label>
                      {(detail.items || []).map((item) => {
                        const form = forms[item.obligation_id] || pendingForm(item);
                        const recorded = item.result_status !== null;
                        return (
                          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200" key={item.obligation_id}>
                            <div className="break-all text-xs font-semibold">{item.position + 1}. {item.obligation_id}</div>
                            {recorded ? (
                              <p className="mt-2 text-xs text-emerald-800">
                                Результат зафиксирован: {item.result_status} {item.external_id || ""}
                                {(item.errors_json || []).length ? " · " + item.errors_json.join("; ") : ""}
                              </p>
                            ) : (
                              <>
                                <label className="mt-2 flex items-center gap-2 text-xs">
                                  <input type="checkbox" checked={Boolean(form.selected)} disabled={busy}
                                    onChange={(event) => updateForm(item.obligation_id, "selected", event.target.checked)}/>
                                  Результат получен
                                </label>
                                {form.selected ? (
                                  <div className="mt-2 grid gap-2">
                                    <select className={INPUT} value={form.result_status} disabled={busy}
                                      onChange={(event) => updateForm(item.obligation_id, "result_status", event.target.value)}>
                                      {OUTCOMES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                                    </select>
                                    {form.result_status === "accepted" ?
                                      <input className={INPUT} maxLength={255} placeholder="Внешний ID (при наличии)"
                                        value={form.external_id} disabled={busy}
                                        onChange={(event) => updateForm(item.obligation_id, "external_id", event.target.value)}/> :
                                      <textarea className={INPUT} placeholder="Ошибки обработки, по одной на строку"
                                        value={form.errors} disabled={busy}
                                        onChange={(event) => updateForm(item.obligation_id, "errors", event.target.value)}/>}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        );
                      })}
                      <button type="submit" className={PRIMARY} disabled={busy}>Сохранить выбранные результаты</button>
                    </form>
                  ) : (
                    <div className="grid gap-2">
                      {(detail.items || []).map((item) => (
                        <div key={item.id} className="rounded-lg bg-white p-2 text-xs">
                          <span className="break-all">{item.obligation_id}</span> — {item.result_status || "ожидает результата"}
                          {item.external_id ? " · " + item.external_id : ""}
                          {(item.errors_json || []).length ? " · " + item.errors_json.join("; ") : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
