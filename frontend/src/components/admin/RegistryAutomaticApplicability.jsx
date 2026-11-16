import { useEffect, useRef, useState } from "react";
import { captureAuthSession, confirmRegistryAutomaticApplicability, getRegistryAutomaticApplicability, isCurrentAuthSession } from "../../api/client";

const DECISIONS = { required: "Требуется", not_required: "Не требуется", needs_review: "Требуется рассмотрение" };
const STATES = { missing: "Решение отсутствует", current: "Решение актуально", stale: "Решение отличается от текущего расчёта" };
const BLOCK_REASONS = {
  protected_history: "Есть утверждение или история. Для изменения нужна отдельная штатная процедура.",
  protected_decision: "Ручное или историческое решение защищено от автоматической замены.",
  needs_review: "Проверьте исходные данные. Этот результат требует отдельного рассмотрения.",
  permission_required: "Для подтверждения нужно право соответствующего реестра.",
  already_current: "Текущий расчёт уже подтверждён.",
};

export default function RegistryAutomaticApplicability({ registry, obligationId, busy, onSaved }) {
  const [review, setReview] = useState(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef(null);

  useEffect(() => {
    const clear = () => {
      request.current = null;
      setReview(null);
      setMessage("");
      setPending(false);
    };
    clear();
    window.addEventListener("obrportal-auth-change", clear);
    window.addEventListener("storage", clear);
    return () => {
      request.current = null;
      window.removeEventListener("obrportal-auth-change", clear);
      window.removeEventListener("storage", clear);
    };
  }, [registry, obligationId]);

  async function run(confirm) {
    if (busy || request.current) return;
    const session = captureAuthSession();
    if (confirm && (review?.can_confirm !== true || !isCurrentAuthSession(review.session))) return;
    const active = {};
    request.current = active;
    const isActive = () => request.current === active && isCurrentAuthSession(session);
    setPending(true);
    setMessage("");
    setReview(null);
    try {
      if (confirm) {
        await confirmRegistryAutomaticApplicability(registry, obligationId, {
          expected_version: review.decision_version,
          expected_rule_version: review.rule_version,
          expected_input_fingerprint: review.input_fingerprint,
        });
        if (!isActive()) return;
      }
      const result = await getRegistryAutomaticApplicability(registry, obligationId);
      if (!isActive()) return;
      if (result?.registry !== registry || result?.obligation_id !== obligationId) throw new Error("Неполный ответ сервера");
      setReview({ ...result, session });
      if (confirm) await onSaved?.();
    } catch (error) {
      if (isActive()) {
        setReview(null);
        setMessage(error.status === 409
          ? "Расчёт или состояние записи изменились. Обновите расчёт перед подтверждением."
          : "Состояние решения не подтверждено. Обновите расчёт.");
      }
    } finally {
      if (request.current === active) {
        request.current = null;
        setPending(false);
      }
    }
  }

  const canConfirm = review?.can_confirm === true && ["required", "not_required"].includes(review.calculated_decision)
    && typeof review.rule_version === "string" && /^[a-f0-9]{64}$/.test(review.input_fingerprint)
    && Number.isSafeInteger(review.decision_version) && review.decision_version >= 0;

  return <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 text-xs">
    <button type="button" className="font-semibold text-blue-700 disabled:opacity-50" disabled={pending || busy} onClick={() => run(false)}>
      {review || message ? "Обновить расчёт применимости" : "Показать расчёт применимости"}
    </button>
    {pending && <p role="status">Проверяем состояние решения…</p>}
    {message && <p role="status">{message}</p>}
    {review && <>
      <p>Обязательство <span className="break-all">{obligationId}</span></p>
      <p>{DECISIONS[review.calculated_decision]} · правило {review.rule_code} ({review.rule_version})</p>
      <p>{review.rule_reason}</p>
      <p>{STATES[review.decision_state]}{review.saved_decision ? ` · ${DECISIONS[review.saved_decision]}` : ""}</p>
      {review.decided_at && <p>Последнее решение {new Date(review.decided_at).toLocaleString("ru-RU")}{review.confirmed_by ? ` · ${review.confirmed_by}` : ""}</p>}
      {review.block_reason && <p>{BLOCK_REASONS[review.block_reason] || "Подтверждение недоступно."}</p>}
      {canConfirm && <button type="button" className="rounded border border-blue-300 px-2 py-1 text-blue-800 disabled:opacity-50" disabled={pending || busy} onClick={() => run(true)}>
        Подтвердить автоматический расчёт
      </button>}
    </>}
  </div>;
}
