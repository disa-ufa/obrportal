export const registryKeys = ["protocol_number", "knowledge_check_date", "knowledge_check_result"];
export function participantCard(protocol, enrollmentId, report) {
  if (report?.protocol_id !== protocol.id || !protocol.participants?.some(p => p.enrollment_id === enrollmentId)) throw new Error("Участник не связан с протоколом");
  const member = report.members?.find(m => m.enrollment_id === enrollmentId);
  if (!member) throw new Error("Участник отсутствует в сверке");
  // existing comes from the persisted registry context, never from the commission source.
  const fields = Object.fromEntries(registryKeys.map(k => [k, member.fields?.[k]?.existing ?? null]));
  const incomplete = registryKeys.some(k => fields[k] === null || String(fields[k]).trim() === "");
  const protectedHistory = Boolean(member.history_reasons?.length) || member.verdict === "protected_history";
  const conflict = member.verdict === "manual_conflict" || Boolean(member.conflict_fields?.length);
  const status = protectedHistory ? "Защищённая история — автоматическое изменение запрещено" : conflict ? "Конфликт — показаны сохранённые значения реестра" : incomplete ? "Неполные сведения — требуется проверка" : member.verdict === "matches" ? "Сохранённые реквизиты совпадают с протоколом" : "Состояние переноса требует проверки";
  return { enrollmentId, name: member.learner_name || enrollmentId, courseId: protocol.course_id,
    obligationId: member.obligation_id, obligationStatus: member.registry_status, fields, status,
    historyReasons: member.history_reasons || [], structuralIssues: member.structural_issues || [] };
}
export const participantHash = (protocolId, enrollmentId) => `#participant=${encodeURIComponent(protocolId)}:${encodeURIComponent(enrollmentId)}`;
export function selectedParticipant(protocolId, hash) {
  const prefix = `#participant=${encodeURIComponent(protocolId)}:`;
  if (!hash.startsWith(prefix)) return "";
  try { return decodeURIComponent(hash.slice(prefix.length)); } catch { return ""; }
}
