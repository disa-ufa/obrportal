import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { captureAuthSession, isCurrentAuthSession, downloadAdminFrdoSubmissionBatch } from "../../../api/client";
import { canDownloadFrdoBatch, runBatchDownload, subscribeDownloads, isBatchDownloading, frdoDownloadError } from "../../../utils/frdoBatchDownload";
export default function FrdoBatchDownload({ batch }) {
  const busy = useSyncExternalStore(subscribeDownloads, () => isBatchDownloading(batch.id), () => false);
  const [error, setError] = useState("");
  const owner = useRef(captureAuthSession());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function download() {
    if (!alive.current || !isCurrentAuthSession(owner.current)) return;
    if (!canDownloadFrdoBatch(batch) || isBatchDownloading(batch.id)) return;
    setError("");
    try { await runBatchDownload(batch, downloadAdminFrdoSubmissionBatch); }
    catch (err) { if (alive.current) setError(frdoDownloadError(err)); }
  }
  return <section aria-label="Скачивание XLSX" className="my-3 rounded-xl border p-3">
    {canDownloadFrdoBatch(batch) ? <button type="button" className="rounded-xl border px-3 py-2 font-semibold disabled:opacity-50" disabled={busy} onClick={download}>{busy ? "Скачивание XLSX…" : "Скачать XLSX"}</button> : <p>Сохранённый файл XLSX не указан. Скачивание недоступно.</p>}
    <p className="text-xs">Наличие файла и целостность проверяет сервер. Право frdo.export здесь не подтверждено.</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
