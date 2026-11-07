export const MAX_SCAN = 10 * 1024 * 1024;
export function validateScan(file) {
  if (!file || file.size <= 0 || file.size > MAX_SCAN) return "Выберите непустой PDF, JPG или PNG до 10 MiB.";
  const type = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" }[file.name.split(".").pop().toLowerCase()];
  if (!type || (file.type && file.type !== type)) return "Формат файла должен быть PDF, JPG или PNG.";
  return "";
}
export const syncReasons = { protected_history: "Защищённая история", manual_conflict: "Конфликт реквизитов", registry_status_not_pending_data: "Статус записи требует ручной сверки", source_incomplete: "Неполные сведения", invalid_links_or_applicability: "Проверьте связи записи", blocked_reconciliation_verdict: "Необходима сверка" };
export function signaturePayload(protocol, date, uuid) {
  return { expected_updated_at: protocol.updated_at, confirmation_id: uuid, signed_on: date, confirmed_paper_original_signed: true };
}
// A read is mandatory before any retry following an uncertain response.
export async function confirmAndRead(api, id, payload) {
  try { return { protocol: await api.confirm(id, payload), uncertain: false }; }
  catch (error) {
    try { return { protocol: await api.read(id), uncertain: true, conflict: error.status === 409, status: error.status }; }
    catch { return { protocol: null, uncertain: true, readFailed: true, status: error.status }; }
  }
}

// A 413/415/422 response is a definitive rejection before persistence. Other
// failures may leave a committed scan or recovery artifacts: absence in a GET
// alone does not prove that creating another artifact would be safe.
export async function uploadAndRead(api, id, file, isCurrent = () => true, onPhase = () => {}) {
  if (!isCurrent()) return { stale: true };
  let error = null, protocol = null;
  try { await api.upload(id, file); } catch (exc) { error = exc; }
  if (!isCurrent()) return { stale: true };
  onPhase("verifying");
  try { protocol = await api.read(id); } catch { /* A failed read cannot authorize a retry. */ }
  if (!isCurrent()) return { stale: true };
  const rejected = Boolean(error && [413, 415, 422].includes(error.status));
  return { protocol, error, rejected, blocked: Boolean(error && !rejected) || (!error && !protocol?.signed_scan_available) };
}

const scanAttemptKey = id => `obrportal_scan_attempt_v1:${id}`;
export function pendingScanAttempt(id, storage) {
  try { storage ??= globalThis.localStorage; return storage?.getItem(scanAttemptKey(id)) === "pending"; }
  catch { return true; }
}
export function beginScanAttempt(id, storage) {
  try {
    storage ??= globalThis.localStorage;
    if (!storage || pendingScanAttempt(id, storage)) return false;
    storage.setItem(scanAttemptKey(id), "pending");
    return storage.getItem(scanAttemptKey(id)) === "pending";
  } catch { return false; }
}
export function clearScanAttempt(id, storage) {
  try { storage ??= globalThis.localStorage; storage?.removeItem(scanAttemptKey(id)); return !pendingScanAttempt(id, storage); }
  catch { return false; }
}

// localStorage is durable, but check/set is not atomic across tabs. Hold a
// same-origin Web Lock through the POST and readback; never queue a second POST.
// Browsers without this guarantee fail closed instead of using a racy fallback.
export async function withScanAttemptLock(id, action, locks = globalThis.navigator?.locks) {
  if (!locks) return { unavailable: true };
  return locks.request(`obrportal_scan_upload_v1:${id}`, { mode: "exclusive", ifAvailable: true },
    lock => lock ? action() : { occupied: true });
}
export function scanBlockReason({ sessionCurrent = true, write, authorized, signed, available, busy, pending, unread }) {
  if (!sessionCurrent) return "Авторизация изменилась. Повторно войдите и проверьте протокол.";
  if (!write) return "Недостаточно прав для прикрепления скана: требуется mintrud.write.";
  if (!authorized) return "Актуальность прав не подтверждена. Дождитесь проверки авторизации.";
  if (available) return "Скан ранее прикреплён. Повторная загрузка запрещена.";
  if (!signed) return "Сначала подтвердите фактическое подписание оригинала.";
  if (busy) return "Дождитесь завершения текущей операции.";
  if (pending) return "Предыдущая загрузка не подтверждена. Требуется проверка состояния хранилища; повторная загрузка запрещена.";
  if (unread) return "Не удалось прочитать актуальное состояние. Сначала проверьте состояние протокола.";
  return "";
}
