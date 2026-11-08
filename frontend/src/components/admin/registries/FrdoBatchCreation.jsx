import { useEffect, useRef, useState } from "react";
import { captureAuthSession, isCurrentAuthSession, prepareAdminFrdoSubmissionBatch, downloadAdminFrdoSubmissionBatch } from "../../../api/client";
import { validBatchId } from "../../../utils/registryBatchNavigation";

const BUTTON = "rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
export const creationCandidates = (rows = []) => rows.filter(item =>
  item.registry === "frdo" && item.applicability_decision === "required"
  && item.status === "approved" && item.regulatory_program_type === "vocational_training"
);
const errorText = error => {
  const detail = error?.payload?.detail;
  return typeof detail === "string" ? detail : detail != null ? JSON.stringify(detail) : error?.message || "Не удалось выполнить операцию";
};

// Kept mounted by the page: changing a card, view or registry cannot start a second request.
export default function FrdoBatchCreation({ obligations, visible = true, readOnly = false, onCreated, onRefresh, onSelectBatch }) {
  const [selected, setSelected] = useState([]);
  const [reserved, setReserved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const owner = useRef(captureAuthSession());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const currentOwner = () => alive.current && isCurrentAuthSession(owner.current);
  const inFlight = useRef(false);
  const current = useRef(null);
  current.current = { visible, readOnly, onCreated, onRefresh };
  const approved = creationCandidates(obligations).filter(item => !reserved.includes(item.id));
  const selectedVisible = approved.filter(item => selected.includes(item.id));
  useEffect(() => {
    const ids = new Set(creationCandidates(obligations).map(item => item.id));
    setSelected(value => readOnly || !visible ? [] : value.filter(id => ids.has(id)));
  }, [obligations, readOnly, visible]);

  async function createBatch() {
    if (!currentOwner()) return;
    if (inFlight.current || readOnly || !visible) return;
    const ids = [...new Set(selectedVisible.map(item => item.id))];
    if (!ids.length || ids.length > 1001) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setReserved(value => [...new Set([...value, ...ids])]);
    try {
      let batch;
      try {
        batch = await prepareAdminFrdoSubmissionBatch(ids);
      } catch (err) {
        // Only a definitive rejection releases this UI reservation. No automatic retry.
        if ([400, 403, 409, 422].includes(err?.status)) {
          setReserved(value => value.filter(id => !ids.includes(id)));
          setError(errorText(err));
        } else {
          setError("Результат создания неизвестен. Проверьте историю партий. Повтор для выбранных записей в этой сессии заблокирован. " + errorText(err));
        }
        return;
      }
      if (!currentOwner()) return;
      if (batch?.registry !== "frdo" || !validBatchId(batch.id) || batch.status !== "exported"
        || batch.has_artifact !== true || !/^[a-f0-9]{64}$/i.test(batch.artifact_sha256 || "")) {
        setError("Ответ создания не подтверждает корректную партию XLSX. Проверьте историю; повтор для выбранных записей заблокирован.");
        return;
      }
      setCreated(batch);
      setSelected([]);
      current.current.onCreated?.();
      try {
        await downloadAdminFrdoSubmissionBatch(batch.id);
      } catch (err) {
        setError("Партия создана, но XLSX не скачан. Откройте созданную партию и повторите скачивание. " + errorText(err));
      }
      if (current.current.visible && !current.current.readOnly) {
        try { await current.current.onRefresh?.(); }
        catch (err) { setError("Партия создана. Не удалось обновить список записей. " + errorText(err)); }
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section hidden={!visible} aria-label="Создание партии ФРДО" data-testid="frdo-batch-creation" className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
    <h2 className="text-base font-bold">Новая партия ФРДО · XLSX</h2>
    <p className="mt-2 text-sm text-slate-600">Выберите утверждённые записи профессионального обучения из текущей выборки. Применимость и актуальность утверждения повторно проверяются при создании файла. XLSX нужно загрузить во ФРДО вручную; портал не передаёт сведения автоматически.</p>
    {error && <p role="alert" className="mt-3 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {created && <div role="status" className="mt-3 text-sm"><p>Партия создана. Отправка и принятие ещё не подтверждены.</p><button type="button" className={BUTTON} onClick={() => onSelectBatch?.(created.id)}>Открыть созданную партию</button></div>}
    {readOnly ? <p className="mt-3 text-sm">Создание недоступно в режиме просмотра или во время загрузки записей.</p> : <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm">Выбрано: {selectedVisible.length} / 1001</span>
        <button type="button" className={BUTTON} disabled={busy || !approved.length} onClick={() => setSelected(approved.slice(0, 1001).map(item => item.id))}>Выбрать утверждённые на странице</button>
        <button type="button" className={BUTTON} disabled={busy || !selected.length} onClick={() => setSelected([])}>Очистить выбор</button>
        <button type="button" className={BUTTON + " bg-slate-900 text-white"} data-testid="admin-registries-frdo-batch-create" disabled={busy || !selectedVisible.length || selectedVisible.length > 1001} onClick={createBatch}>{busy ? "Формирование XLSX…" : "Сформировать и скачать XLSX"}</button>
      </div>
      {approved.length ? <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-slate-200 p-2">{approved.map(item => <label key={item.id} className="flex items-center gap-2 p-2 text-sm">
        <input type="checkbox" checked={selected.includes(item.id)} disabled={busy} onChange={event => setSelected(value => event.target.checked ? [...new Set([...value, item.id])] : value.filter(id => id !== item.id))}/>
        <span className="min-w-0 break-words">{item.user_full_name || item.id}{item.course_title ? ` · ${item.course_title}` : ""}</span>
      </label>)}</div> : <p className="mt-3 text-sm text-slate-500">В текущей выборке нет доступных утверждённых записей ПО для новой партии.</p>}
    </>}
  </section>;
}
