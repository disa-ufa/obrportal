import { useEffect, useRef, useState } from "react";
import { createFrdoResultFence } from "../../../utils/frdoResultFence";
import { captureAuthSession, isCurrentAuthSession, getAdminFrdoSubmissionBatch, recordAdminFrdoSubmissionBatchResults } from "../../../api/client";
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

export default function FrdoBatchResults({ detail, onDetail, readOnly = true }) {
  const owner = useRef(captureAuthSession());
  const currentOwner = () => isCurrentAuthSession(owner.current);
  const batch = detail;
  const fence = useRef(null);
  if (!fence.current) fence.current = createFrdoResultFence();
  const [pendingResults, setPendingResults] = useState(() => fence.current.snapshot());
  const [forms, setForms] = useState({});
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const detailTarget = useRef(detail.id);
  const detailGeneration = useRef(0);
  const alive = useRef(true);
  const resultPending = Boolean(pendingResults[detail.id]);
  const reload = async () => {};
  const onRefresh = null;
  function setDetail(next) {
    if (alive.current && currentOwner() && next?.id === detail.id && next.registry === "frdo") onDetail(next);
  }
  async function perform(callback) {
    if (!alive.current || !currentOwner()) return;
    setBusy(true); setError("");
    try { await callback(); } catch (err) { if (alive.current) setError(errorText(err)); }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => { setForms(Object.fromEntries(detail.items.map(item => [item.obligation_id, pendingForm(item)]))); }, [detail]);
  useEffect(() => {
    alive.current = true;
    async function restore() {
      if (!alive.current || !currentOwner()) return;
      setPendingResults(fence.current.snapshot());
      if (fence.current.has(detail.id)) await checkPendingResults(detail);
    }
    restore(); window.addEventListener("storage", restore);
    return () => { alive.current = false; ++detailGeneration.current; window.removeEventListener("storage", restore); };
  }, []);
  function updateForm(obligationId, key, value) {
    if (readOnly || !currentOwner() || !alive.current) return;
    const item = (detail?.items || []).find(
      (row) => row.obligation_id === obligationId
    );
    const defaults = pendingForm(item || {});
    setForms((previous) => ({
      ...previous,
      [obligationId]: {
        ...defaults,
        ...(previous[obligationId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveResults(event, batch) {
    event.preventDefault();
    if (readOnly || !currentOwner() || !alive.current) return;
    if (fence.current.has(batch.id)) { setError("Повторная запись запрещена: требуется проверка pending или доступности хранилища."); return; }
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
    if (!await fence.current.begin(batch.id, items)) { setError("Не удалось надёжно сохранить журнал операции. POST не отправлен. Проверьте хранилище браузера."); setPendingResults(fence.current.snapshot()); return; }
    if (!currentOwner() || !alive.current) return;
    setPendingResults(fence.current.snapshot());
    const generation = detailGeneration.current;
    await perform(async () => {
      let next;
      try {
        next = await recordAdminFrdoSubmissionBatchResults(batch.id, {
          source_description: sourceDescription.trim(),
          source_reference: sourceReference.trim() || null,
          items,
        });
      } catch (err) {
        // All POST failures are treated as unknown, including HTTP errors.
        setError(errorText(err));
        return;
      }
      if (!currentOwner() || !alive.current) return;
      await fence.current.readback(batch.id, next);
      setPendingResults(fence.current.snapshot());
      if (detailTarget.current === batch.id && generation === detailGeneration.current
          && next?.id === batch.id && Array.isArray(next.items)) {
        setDetail(next);
        setForms(Object.fromEntries(next.items.map(item => [item.obligation_id, pendingForm(item)])));
      }
      await reload();
      if (onRefresh) await onRefresh();
    });
  }

  async function checkPendingResults(batch) {
    const generation = detailGeneration.current;
    await perform(async () => {
      const next = await getAdminFrdoSubmissionBatch(batch.id);
      if (!currentOwner() || !alive.current) return;
      const confirmed = await fence.current.readback(batch.id, next);
      setPendingResults(fence.current.snapshot());
      if (!confirmed) {
        setError("Чтение не подтвердило все отправленные результаты. Отсутствие результатов не доказывает откат. Повторная отправка заблокирована; требуется проверка исхода операции.");
        return;
      }
      if (detailTarget.current === batch.id && generation === detailGeneration.current) {
        setDetail(next);
        setForms(Object.fromEntries(next.items.map(item => [item.obligation_id, pendingForm(item)])));
      }
      setError("Подтверждены сохранённые результаты выбранных записей. Совпадение источника аудита и всего запроса этим чтением не подтверждается.");
      await reload();
      if (onRefresh) await onRefresh();
    });
  }


  const canRecord = !readOnly && detail.registry === "frdo" && detail.status === "submitted" && !detail.reconciled_at
    && detail.has_artifact && detail.items.some(item => item.result_status == null)
    && detail.items.every(item => item.approval_fingerprint && item.approval_snapshot_json);
  return <section aria-label="Сверка результатов ФРДО" className="mt-4 rounded-xl border p-4">
    <h3 className="font-bold">Частичная сверка результатов ФРДО</h3>
    <p className="text-xs">Право frdo.export здесь не подтверждено. Сервер проверяет полномочия и допустимость каждой операции.</p>
    {error && <p role="alert">{error}</p>}
    {resultPending && <div role="status">Исход фиксации результатов не подтверждён. Повторная отправка заблокирована.
      <button type="button" disabled={busy} onClick={() => checkPendingResults(batch)}>Проверить сохранённые результаты</button></div>}
    {canRecord ?                     <form onSubmit={(event) => saveResults(event, batch)}
                      data-testid="admin-registries-frdo-batch-results-form" className="grid gap-3">
                      <fieldset disabled={busy || resultPending} className="grid gap-3">
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
                      </fieldset>
                    </form> : <p>Доступен только просмотр: стадия, файл, сохранённые реквизиты или режим не подтверждают возможность записи.</p>}
  </section>;
}
