import { useEffect, useMemo, useState } from "react";
import { getAdminFrdoSubmissionBatch, getAdminMintrudSubmissionBatch } from "../../../api/client";
import { createBatchDetailReader, registryBatchPresentation } from "../../../utils/registryBatchPresentation";
import RegistryBatchDetail from "./RegistryBatchDetail";
export default function RegistryBatchCard({ batch, readOnly = true, pending = false, knownDetail = null, expanded, onToggle }) {
  const [localOpen, setOpen] = useState(false);
  const open = expanded ?? localOpen;
  const [state, setState] = useState({});
  const reader = useMemo(() => createBatchDetailReader(), [batch.id, batch.registry]);
  useEffect(() => () => reader.cancel(), [reader]);
  const current = state.id === batch.id ? state : {};
  const detail = current.detail || (knownDetail?.id === batch.id ? knownDetail : null);
  const view = registryBatchPresentation(batch, detail);
  function load() {
    const get = batch.registry === "frdo" ? getAdminFrdoSubmissionBatch : getAdminMintrudSubmissionBatch;
    return reader.read(batch.id, async id => {
      const next = await get(id);
      if (next?.registry !== batch.registry) throw new Error("Registry mismatch");
      return next;
    }, setState);
  }
  function toggle() {
    if (onToggle) { onToggle(); return; }
    if (open) reader.cancel();
    else if (!detail) load();
    setOpen(!open);
  }
  return <section aria-label={view.title} className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
    <h3 className="font-bold">{view.title}</h3>
    <p>Создано: {batch.generated_at || batch.created_at || "—"}</p>
    <p>Записей: {batch.record_count ?? "—"} · Обязательств: {batch.obligation_count ?? "—"}</p>
    <p>Стадия: {view.stage}</p>
    <p>{batch.has_artifact ? "Сохранённый файл указан в истории. Доступность проверяется при скачивании." : "Сохранённый файл не указан."}</p>
    {batch.imported_at && <p>Импорт подтверждён: {batch.imported_at}</p>}
    {batch.submitted_at && <p>Отправка подтверждена: {batch.submitted_at}</p>}
    {batch.reconciled_at && <p>Сверка: {batch.reconciled_at}</p>}
    <p>{view.results}</p><p>{view.next}</p>
    <p className="text-xs">{readOnly ? "Режим просмотра. " : ""}Подсказка не предоставляет право экспорта. Доступность операций проверяется отдельно.</p>
    {pending && <p role="status">Результат предыдущего запроса неизвестен. Повторная фиксация заблокирована в существующей форме; обновите состояние партии.</p>}
    <details className="break-all text-xs"><summary>Технические сведения</summary><p>UUID: {batch.id}</p><p>SHA-256: {batch.artifact_sha256 || "—"}</p><p>{batch.artifact_kind} · {batch.transport} · {batch.schema_version}</p></details>
    <button type="button" aria-expanded={open} onClick={toggle}>{open ? "Скрыть состав" : "Просмотреть состав и результаты"}</button>
    {open && <RegistryBatchDetail state={{ ...current, detail }} onRetry={load} />}
  </section>;
}
