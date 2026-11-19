import { validBatchId } from "../utils/registryBatchNavigation.js";
import { useEffect, useRef, useState } from "react";
import { captureAuthSession, isCurrentAuthSession, getAdminFrdoSubmissionBatch, markAdminFrdoSubmissionBatchSubmitted } from "../api/client";
import { createFrdoSubmissionFence, canConfirmFrdoSubmission } from "../utils/frdoSubmissionFence";
export function useFrdoSubmissionFence(onConfirmed) {
  const owner = useRef(captureAuthSession());
  const currentOwner = () => isCurrentAuthSession(owner.current);
  const journal = useRef(null);
  if (!journal.current) journal.current = createFrdoSubmissionFence();
  const [pending, setPending] = useState(() => journal.current.snapshot());
  const [states, setStates] = useState({});
  const [errors, setErrors] = useState({});
  const alive = useRef(true), callback = useRef(onConfirmed), generations = useRef({});
  callback.current = onConfirmed;
  function state(id, value, error = "") { if (alive.current && currentOwner()) { setStates(s => ({...s,[id]:value})); setErrors(s => ({...s,[id]:error})); setPending(journal.current.snapshot()); } }
  async function check(id) {
    if (!currentOwner() || !alive.current) return;
    if (!validBatchId(id)) { state(id, "unknown", "Некорректный UUID в журнале. Проверка требует разбора; POST запрещён."); return; }
    const generation = (generations.current[id] || 0) + 1; generations.current[id] = generation;
    state(id, "checking");
    try {
      const detail = await getAdminFrdoSubmissionBatch(id);
      if (!alive.current || !currentOwner() || generations.current[id] !== generation) return;
      if (journal.current.readback(id, detail)) { state(id, "confirmed"); callback.current(detail); }
      else state(id, "unknown", "GET не подтвердил отправку однозначно. Неизменённое состояние не доказывает откат POST. Требуется проверка.");
    } catch { if (generations.current[id] === generation) state(id, "unknown", "Не удалось проверить состояние партии. Повторное подтверждение заблокировано."); }
  }
  async function confirm(batch, reference) {
    if (!currentOwner() || !alive.current) return;
    if (!canConfirmFrdoSubmission(batch) || !journal.current.begin(batch)) { state(batch.id, "unknown", "POST не отправлен: pending или хранилище браузера не позволяют сохранить безопасный журнал."); return; }
    state(batch.id, "checking");
    try { await markAdminFrdoSubmissionBatchSubmitted(batch.id, { external_reference: reference.trim() || null }); }
    catch (error) { state(batch.id, "checking", error?.status === 403 ? "Недостаточно прав frdo.export. Проверяем фактическое состояние." : "Ответ POST не подтверждён. Проверяем фактическое состояние."); }
    if (currentOwner() && alive.current) await check(batch.id);
  }
  useEffect(() => {
    alive.current = true;
    function restore() { if (alive.current && currentOwner()) setPending(journal.current.snapshot()); for (const id of Object.keys(journal.current.snapshot())) check(id); }
    restore(); window.addEventListener("storage", restore);
    return () => { alive.current = false; window.removeEventListener("storage", restore); };
  }, []);
  return { pending, states, errors, confirm, check };
}
