import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { completeAccountCourse, getAccountCompletionReadiness } from "../../api/client";
import { canFinalizeCourse, describeCompletionIssues } from "../../utils/courseCompletion";
import { AccountLearnerProfileCard } from "../account/AccountLearnerProfileCard";
import { LearnerCourseEmployment } from "./LearnerCourseEmployment";

const primaryButton = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto";
const linkStyle = "inline-flex min-h-11 items-center text-sm font-bold text-blue-700 underline underline-offset-4";

export function LearnerCourseCompletionPanel({ enrollmentId, accountUser, initialReadiness, onCompleted }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("completion");
  const section = view === "profile" || view === "employment" ? view : null;
  const heading = useRef(null);
  const submitting = useRef(false);
  const [readiness, setReadiness] = useState(initialReadiness ?? null);
  const [checking, setChecking] = useState(true);
  const [readinessError, setReadinessError] = useState(false);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [completionConflict, setCompletionConflict] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [formDirty, setFormDirty] = useState(false);

  function refreshReadiness() {
    setChecking(true);
    setReadiness(null);
    setReadinessError(false);
    setVersion((current) => current + 1);
  }

  function handleDetailsSaved(kind) {
    // Save has already been confirmed by the existing profile/employment API.
    setFormDirty(false);
    setSaveNotice(kind === "profile"
      ? "Сведения профиля сохранены."
      : "Сведения о работодателе сохранены.");
    refreshReadiness();
    // Keep other query parameters; close only the completion editor.
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("completion");
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    setFormDirty(false);
    heading.current?.focus();
  }, [section]);

  useEffect(() => {
    if (!formDirty) return undefined;
    const confirmBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", confirmBeforeUnload);
    return () => window.removeEventListener("beforeunload", confirmBeforeUnload);
  }, [formDirty]);

  useEffect(() => {
    let active = true;
    getAccountCompletionReadiness(enrollmentId).then((result) => {
      if (typeof result?.is_ready !== "boolean" || !Array.isArray(result.missing_fields)
        || !Array.isArray(result.invalid_fields)) throw new Error("Invalid readiness response");
      if (!active) return;
      setReadiness(result);
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setReadinessError(true);
      setChecking(false);
    });
    return () => { active = false; };
  }, [enrollmentId, version]);

  const ready = canFinalizeCourse(readiness);
  const alreadyCompleted = readiness?.status === "already_completed";
  const canSubmit = ready && !checking && !readinessError && !completionError;
  const issues = describeCompletionIssues(readiness);
  const learnerIssues = issues.filter(({ section: target }) =>
    target === "profile" || target === "employment"
  );
  const administratorReviewNeeded = Boolean(
    readiness?.requires_administrator_action
    || readiness?.policy_unresolved
    || issues.some(({ section: target }) => !target)
  );

  async function finalize() {
    if (!canSubmit || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setCompletionConflict(false);
    try {
      const result = await completeAccountCourse(enrollmentId);
      if (result?.status !== "completed") throw new Error("Unexpected completion status");
      onCompleted(result);
    } catch (error) {
      const detail = error.payload?.detail;
      if (error.status === 409 && detail?.code === "completion.profile_incomplete") {
        setReadiness(detail);
        setCompletionConflict(true);
        refreshReadiness();
      } else {
        setCompletionError("Не удалось подтвердить завершение. Обновите страницу и проверьте статус курса.");
      }
      heading.current?.focus();
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="learner-course-finalization-title" data-testid="learner-course-finalization"
      className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3 sm:gap-4">
        <span aria-hidden="true" className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} id="learner-course-finalization-title"
            className="scroll-mt-24 text-xl font-black text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 sm:text-2xl">
            {section === "profile" ? "Профиль слушателя" : section === "employment" ? "Сведения о работодателе" : "Завершение обучения"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Все обязательные занятия пройдены. Осталось завершить оформление.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {checking && <p role="status" className="text-sm text-slate-600">Проверяем сведения для оформления…</p>}
        {readinessError && (
          <div className="rounded-xl bg-amber-50 px-4 py-2 text-amber-950">
            <p role="alert" className="text-sm">Не удалось проверить готовность данных.</p>
            <button type="button" onClick={refreshReadiness} className={linkStyle}>Повторить проверку</button>
          </div>
        )}
        {alreadyCompleted && (
          <p role="status" className="text-sm text-slate-700">Курс уже завершён. Обновите страницу, чтобы увидеть итоговый документ.</p>
        )}
        {completionError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{completionError}</p>}
        {completionConflict && !ready && (
          <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            Данные для завершения изменились. Проверьте обновлённый список.
          </p>
        )}
        {saveNotice && !section && (
          <div role="status" aria-live="polite" data-testid="learner-completion-save-success"
            className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Данные успешно сохранены</p>
              <p className="mt-1">{saveNotice} {checking
                ? "Проверяем оставшиеся требования…"
                : readinessError
                  ? "Повторите проверку готовности ниже."
                  : "Список требований обновлён."}</p>
            </div>
          </div>
        )}
        {readiness?.is_ready === false && !alreadyCompleted && !section && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {learnerIssues.length > 0
                ? "Обучение пройдено. Для оформления заполните оставшиеся сведения."
                : "Учебная часть пройдена. Осталось завершить оформление курса."}
            </p>
            {learnerIssues.length > 0 && (
              <ul data-testid="learner-completion-issues" aria-label="Сведения для завершения обучения"
                className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
                {learnerIssues.map(({ field, label, instruction, section: target, invalid }) => (
                  <li key={`${field}:${invalid}`} className="flex flex-wrap items-center justify-between gap-x-4 px-4 py-3">
                    <div className="min-w-0 space-y-1 text-sm">
                      <div className="font-bold text-slate-950">{label}</div>
                      <div className="text-slate-700">{instruction}</div>
                      <div className="text-slate-600">Можно исправить самостоятельно</div>
                    </div>
                    <Link to={`?completion=${target}`} onClick={() => setSaveNotice("")} className={linkStyle}>
                      {target === "profile" ? "Открыть профиль" : "Открыть сведения о работодателе"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {administratorReviewNeeded && (
              <p role="status" data-testid="learner-completion-admin-action"
                className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Дальнейшее оформление требует проверки администратором. Действий с вашей стороны по этим пунктам пока не требуется.
              </p>
            )}
          </div>
        )}
        {section && !alreadyCompleted && (
          <>
            {section === "profile"
              ? <AccountLearnerProfileCard accountUser={accountUser}
                  onSaved={() => handleDetailsSaved("profile")} onDirtyChange={setFormDirty} />
              : <LearnerCourseEmployment enrollmentId={enrollmentId}
                  onSaved={() => handleDetailsSaved("employment")} onDirtyChange={setFormDirty} />}
            <Link to={{ search: "" }} className={linkStyle} data-testid="learner-completion-return"
              onClick={(event) => {
                if (formDirty && !window.confirm("Есть несохранённые изменения. Вернуться без сохранения?")) {
                  event.preventDefault();
                }
              }}>
              Отмена — вернуться к завершению обучения
            </Link>
          </>
        )}
        {!section && (canSubmit || pending) && (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">Обязательные сведения заполнены.</p>
            <button type="button" disabled={pending} className={primaryButton}
              data-testid="learner-course-finalize-button" onClick={finalize}>
              {pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />}
              {pending ? "Завершаем обучение…" : "Завершить обучение"}
            </button>
            {pending && <span role="status" className="sr-only">Завершаем обучение.</span>}
          </div>
        )}
      </div>
    </section>
  );
}
