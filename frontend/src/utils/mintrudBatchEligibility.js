import { validMintrudApprovalEventId } from "./mintrudBatchCreateJournal.js";

// Read-only presentation of the server's decision. This is NOT an export grant.
// The batch POST must still recheck the approval event, current data, history,
// applicability and transaction-scoped replay protection.
export function mintrudBatchEligibilityResult({
  obligationId,
  review,
  error,
  messages = {},
  issueLabels = {},
}) {
  const blocked = (reason, reasonCode) => ({
    approvalEventId: null,
    reason,
    reasonCode,
  });
  if (error) {
    if (error.status === 401) return blocked(
      "Сеанс завершён. Войдите повторно и нажмите «Проверить готовность».",
      "auth.unauthorized",
    );
    if (error.status === 403) return blocked(
      "Нет права на проверку и экспорт Минтруда. Проверьте роль администратора.",
      "auth.forbidden",
    );
    return blocked(
      "Проверка готовности не выполнена. Обновите список; не создавайте XML без подтверждения сервера.",
      "registry.readiness_unavailable",
    );
  }
  if (
    !review || review.obligation_id !== obligationId
    || review.read_only !== true
    || review.not_authorization_for_export !== true
  ) return blocked(
    "Ответ сервера не подтверждён. Обновите список и повторите проверку.",
    "registry.readiness_unverified",
  );

  if (review.batch_eligible === true) {
    return validMintrudApprovalEventId(review.approval_event_id)
      ? { approvalEventId: review.approval_event_id, reason: "", reasonCode: null }
      : blocked(
        "Событие утверждения не подтверждено. Требуется сверка утверждения.",
        "approval.event_unverified",
      );
  }

  const code = review.block_reason || "registry.readiness_unverified";
  if (code === "registry.applicability_missing") return blocked(
    "Нет сохранённого решения о применимости. Для ранее утверждённой записи требуется отдельная контролируемая сверка; повторное утверждение проблему не устранит.",
    code,
  );
  if (code === "registry.approval_already_exported") return blocked(
    "Это утверждение уже включено в XML-партию. Повторная выгрузка запрещена; проверьте историю партии.",
    code,
  );
  if (code === "registry.approval_history_unverified") return blocked(
    "История выгрузки не подтверждена. Сначала сверка истории; повторное создание XML запрещено.",
    code,
  );
  if (code === "registry.current_rule_not_required") return blocked(
    review.calculated_decision === "needs_review"
      ? "Текущее правило требует отдельной проверки применимости."
      : "По текущему правилу передача сведений в Минтруд не требуется.",
    code,
  );
  if (code === "mintrud.data_not_ready") {
    const issues = Array.isArray(review.issue_codes) ? review.issue_codes : [];
    return blocked(
      issues.map(issue => issueLabels[issue]).find(Boolean)
        || "Для XML отсутствуют обязательные данные. Проверьте карточку Минтруда и программу курса.",
      code,
    );
  }
  return blocked(
    messages[code] || "Допуск к XML не подтверждён сервером. Требуется проверка готовности.",
    code,
  );
}
