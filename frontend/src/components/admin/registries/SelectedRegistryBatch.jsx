import FrdoBatchSubmission from "./FrdoBatchSubmission";
import FrdoBatchDownload from "./FrdoBatchDownload";
import FrdoBatchResults from "./FrdoBatchResults";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAdminFrdoSubmissionBatch, getAdminMintrudSubmissionBatch } from "../../../api/client";
import { createBatchDetailReader } from "../../../utils/registryBatchPresentation";
import { validBatchId } from "../../../utils/registryBatchNavigation";
import RegistryBatchCard from "./RegistryBatchCard";
export default function SelectedRegistryBatch({ id, registry, onClose, pending = false, readOnly = true, submission, confirmedSubmission }) {
  const reader = useMemo(() => createBatchDetailReader(), [id, registry]);
  const [state, setState] = useState({});
  const valid = validBatchId(id) && ["frdo", "mintrud"].includes(registry);
  function load() {
    if (!valid) return;
    const get = registry === "frdo" ? getAdminFrdoSubmissionBatch : getAdminMintrudSubmissionBatch;
    reader.read(id, async value => {
      const detail = await get(value);
      if (detail?.registry !== registry) throw new Error("Registry mismatch");
      return detail;
    }, setState);
  }
  useEffect(() => { load(); return () => reader.cancel(); }, [reader]);
  const lastSubmission = useRef(confirmedSubmission);
  useEffect(() => {
    if (lastSubmission.current === confirmedSubmission) return;
    lastSubmission.current = confirmedSubmission;
    if (registry !== "frdo" || confirmedSubmission?.id !== id || confirmedSubmission.registry !== registry || !Array.isArray(confirmedSubmission.items)) return;
    // A proof for another UUID must never replace the selected card.
    reader.cancel();
    setState({ id, detail: confirmedSubmission, loading: false, error: false });
  }, [confirmedSubmission, id, registry, reader]);
  const current = state.id === id ? state : {};
  return <section data-testid="selected-registry-batch" aria-label="Выбранная партия" className="rounded-2xl border border-blue-300 p-4">
    <h2 className="font-bold">Выбранная партия</h2>
    <button type="button" onClick={onClose}>Закрыть выбранную партию</button>
    {!valid ? <p role="alert">Некорректная ссылка на партию. Проверьте UUID и реестр.</p> : current.loading || !current.id ? <p role="status">Загрузка выбранной партии…</p> : current.error ? <div role="alert">Партия недоступна или ответ не соответствует ссылке. <button type="button" onClick={load}>Повторить чтение партии</button></div> : <><RegistryBatchCard batch={current.detail} knownDetail={current.detail} expanded={true} onToggle={onClose} pending={pending} />{registry === "frdo" && <FrdoBatchDownload key={id} batch={current.detail} />}{registry === "frdo" && submission && <FrdoBatchSubmission key={id} batch={current.detail} readOnly={readOnly} submission={submission} />}{registry === "frdo" && <FrdoBatchResults detail={current.detail} readOnly={readOnly} onDetail={next => setState({ id, detail: next, loading: false, error: false })} />}</>}
  </section>;
}
