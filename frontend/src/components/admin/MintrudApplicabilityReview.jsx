import React, { useEffect, useState } from "react";
const LABELS = { required: "Требуется по текущему правилу", not_required: "Не требуется по текущему правилу", needs_review: "Требуется отдельное рассмотрение" };
export default function MintrudApplicabilityReview({ obligationId, api, reload, busy, onBusy, onSaved }) {
  const [review, setReview] = useState(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { setReview(null); setMessage(""); }, [obligationId]);
  async function inspect() {
    setPending(true); setMessage(""); setReview(null);
    try { setReview(await api.getAdminMintrudLocalReview(obligationId)); }
    catch { setMessage("Проверка недоступна. Сохранение решения заблокировано."); }
    finally { setPending(false); }
  }
  async function save() {
    if (!review?.can_save || pending || busy) return;
    if (!window.confirm(`Сохранить результат текущего правила: «${LABELS[review.calculated_decision]}»? Это изменит решение о применимости и создаст запись аудита. Утверждение и XML не создаются.`)) return;
    setPending(true); onBusy(true);
    try {
      await api.confirmAdminMintrudLocalReview(obligationId, { expected_version: review.decision_version, expected_input_fingerprint: review.input_fingerprint, confirmed: true });
      setReview(null); onSaved("Решение сохранено. Повторите проверку готовности."); await reload();
    } catch (e) { setReview(null); setMessage(e?.payload?.detail?.message || "Решение не сохранено. Повторите проверку; защищённая история требует отдельной сверки."); }
    finally { setPending(false); onBusy(false); }
  }
  return <div className="mt-3 rounded-xl border border-slate-200 p-3 text-xs" data-testid="mintrud-applicability-review">
    <button type="button" className="font-semibold text-blue-700 disabled:opacity-50" disabled={pending || busy} onClick={inspect}>Проверить применимость и готовность</button>
    {message && <p role="status" className="mt-2">{message}</p>}
    {review && <div className="mt-2 space-y-2">
      <p>{review.message}</p><p>{LABELS[review.calculated_decision]}: {review.rule_reason}</p>
      <p>Утверждение: {review.approval_current ? "актуально" : "не подтверждено"}. {review.historical_export ? "Есть история выгрузки — повторное включение запрещено." : ""}</p>
      {review.issues.length > 0 && <><p>Исправьте сведения в профиле слушателя, данных Минтруда или программе курса:</p><ul className="list-disc pl-4">{review.issues.map((issue,i)=><li key={`${issue.code}-${i}`}>{issue.message}</li>)}</ul></>}
      {review.protected_history && review.decision_state === "missing" && !review.historical_export && (
        <p role="status" data-testid="mintrud-historical-reconciliation-required" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-950">
          Утверждение уже защищено, а сохранённого решения о применимости нет. Обычное сохранение запрещено.
          Требуется отдельная административная сверка истории и действующего правила. Не нажимайте «Повторно утвердить» и не создавайте XML для обхода блокировки.
        </p>
      )}
      {review.historical_export && (
        <p role="status" data-testid="mintrud-existing-export-history" className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          Запись имеет историю выгрузки. Проверьте существующую XML-партию и её результаты; новая выгрузка того же утверждения запрещена.
        </p>
      )}
      <p>Сохранение расчёта не заменяет решение комиссии и не разрешает экспорт.</p>
      {review.can_save && <button type="button" className="rounded border border-blue-300 px-2 py-1 text-blue-800 disabled:opacity-50" onClick={save} disabled={pending || busy}>Подтвердить и сохранить расчёт</button>}
    </div>}
  </div>;
}
