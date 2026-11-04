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
