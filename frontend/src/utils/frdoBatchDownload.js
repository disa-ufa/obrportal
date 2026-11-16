import { validBatchId } from "./registryBatchNavigation.js";
const pending = new Set();
const listeners = new Set();
export const subscribeDownloads = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const isBatchDownloading = id => pending.has(id);
const notify = () => { for (const listener of listeners) listener(); };
export const canDownloadFrdoBatch = batch => batch?.registry === "frdo" && validBatchId(batch.id) && batch.has_artifact === true;
export async function runBatchDownload(batch, download) {
  if (!canDownloadFrdoBatch(batch) || pending.has(batch.id)) return false;
  pending.add(batch.id); notify();
  try { await download(batch.id); return true; }
  finally { pending.delete(batch.id); notify(); }
}
export function frdoDownloadError(error) {
  return ({403:"Недостаточно прав frdo.export для скачивания XLSX.",404:"Файл или партия не найдены. Доступность файла не подтверждена.",409:"Файл недоступен или не прошёл проверку целостности. Доступность файла не подтверждена."})[error?.status] || "Не удалось скачать XLSX. Проверьте соединение и повторите скачивание вручную.";
}
