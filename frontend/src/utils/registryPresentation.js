export const PROTOCOL_SOURCE_KEYS = ["protocol_number", "knowledge_check_date", "knowledge_check_result"];

export function buildMintrudContextPayload(form, sourceFieldsLocked) {
  const payload = Object.fromEntries(Object.entries(form)
    .filter(([key]) => !sourceFieldsLocked || !PROTOCOL_SOURCE_KEYS.includes(key))
    .map(([key, value]) => [key, value.trim() || null]));
  if (payload.reporting_scenario === "employer_self_training") {
    payload.employer_name = null;
    payload.employer_inn = null;
  }
  return payload;
}

export function protocolDisplayStatus(protocol) {
  if (protocol.is_signed) return "Подписание бумажного оригинала подтверждено";
  if (protocol.sync_provenance?.applied) return "Реквизиты синхронизированы с реестром";
  if (protocol.status === "recorded") return "Результаты комиссии зафиксированы";
  if (protocol.status === "draft") return "Черновик";
  return "Статус протокола не подтверждён";
}

export function draftTransferMessage(context, protocols) {
  if (PROTOCOL_SOURCE_KEYS.every(key => String(context?.[key] ?? "").trim())) return "";
  const drafts = protocols.filter(protocol => protocol.status === "draft");
  if (!drafts.length) return "";
  const numbers = drafts.map(protocol => protocol.protocol_number || "без номера").join(", ");
  return `Сведения имеются в черновике протокола № ${numbers}, но ещё не перенесены в реестр Минтруда. Для завершения необходимо зафиксировать результаты комиссии и выполнить разрешённую синхронизацию`;
}
