import { useEffect, useMemo, useState } from "react";

import {
  completeAccountCourseLessonAssignment,
  getAccountCourseLessonAssignmentSubmission,
  submitAccountCourseLessonAssignmentAnswer,
} from "../../api/client";
import { formatApiError } from "../../utils/apiErrors";


const REVIEW_MODES = new Set([
  "self_check",
  "submit_only",
  "manual_review",
]);


function normalizeReviewMode(value) {
  const normalized = `${value || ""}`.trim();

  return REVIEW_MODES.has(normalized)
    ? normalized
    : "self_check";
}


function getStatusLabel(status) {
  switch (`${status || ""}`.trim()) {
    case "submitted":
      return "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e";
    case "completed":
      return "\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e";
    case "approved":
      return "\u041f\u0440\u0438\u043d\u044f\u0442\u043e";
    case "rejected":
      return "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e";
    case "returned":
      return "\u0412\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d\u043e";
    case "in_progress":
      return "\u0412 \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0435";
    default:
      return "\u041d\u0435 \u043d\u0430\u0447\u0430\u0442\u043e";
  }
}


function getStatusTone(status, completed) {
  if (completed) {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }

  switch (`${status || ""}`.trim()) {
    case "submitted":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "rejected":
      return "bg-red-50 text-red-800 ring-red-200";
    case "returned":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}


function getReviewPanelTone(status) {
  switch (`${status || ""}`.trim()) {
    case "approved":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-900 ring-red-200";
    case "returned":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    default:
      return "bg-blue-50 text-blue-900 ring-blue-200";
  }
}


function getReviewMessage(status, reviewMode) {
  const normalizedStatus = `${status || ""}`.trim();

  if (normalizedStatus === "approved") {
    return "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043f\u0440\u0438\u043d\u044f\u0442\u043e.";
  }

  if (normalizedStatus === "rejected") {
    return "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e. \u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u044e\u0449\u0435\u0433\u043e.";
  }

  if (normalizedStatus === "returned") {
    return "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d\u043e \u043d\u0430 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0443.";
  }

  if (
    normalizedStatus === "submitted"
    && reviewMode === "manual_review"
  ) {
    return "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443. \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0431\u0443\u0434\u0435\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e \u043f\u043e\u0441\u043b\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.";
  }

  if (
    normalizedStatus === "submitted"
    && reviewMode === "submit_only"
  ) {
    return "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d.";
  }

  return "";
}


function submissionCompletesAssignment(reviewMode, submission) {
  if (!submission) {
    return false;
  }

  const status = `${submission.status || ""}`.trim();

  if (reviewMode === "manual_review") {
    return status === "approved";
  }

  if (reviewMode === "submit_only") {
    return ["submitted", "approved", "completed"].includes(status);
  }

  return ["completed", "submitted", "approved"].includes(status);
}


function formatDateTime(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return `${value}`;
  }
}


function getSafeExternalHref(value) {
  const raw = `${value || ""}`.trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);

    if (
      parsed.protocol !== "http:"
      && parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}


function getScoreText(submission) {
  if (
    submission?.score === null
    || submission?.score === undefined
  ) {
    return "";
  }

  if (
    submission?.max_score === null
    || submission?.max_score === undefined
  ) {
    return `${submission.score}`;
  }

  return `${submission.score} / ${submission.max_score}`;
}


export function LearnerAssignmentBlock({
  block,
  enrollmentId,
  lessonId,
  disabled = false,
}) {
  const content = block?.content_json || {};
  const blockId = `${block?.id || ""}`.trim();

  const reviewMode = normalizeReviewMode(
    content.review_mode
  );

  const description = `${
    content.description
    || content.text
    || content.body
    || ""
  }`.trim();

  const due = `${
    content.due
    || content.deadline
    || ""
  }`.trim();

  const expectedResult = `${
    content.expected_result
    || content.expectedResult
    || content.result
    || ""
  }`.trim();

  const submissionFormat = `${
    content.submission_format
    || content.submissionFormat
    || content.format
    || ""
  }`.trim();

  const criteria = `${
    content.criteria
    || content.checklist
    || content.evaluation_criteria
    || ""
  }`.trim();

  const estimatedMinutes = Number(
    content.estimated_minutes
    || content.estimatedMinutes
    || 0
  );

  const estimatedTimeText = (
    Number.isFinite(estimatedMinutes)
    && estimatedMinutes > 0
  )
    ? `${Math.round(estimatedMinutes)} \u043c\u0438\u043d.`
    : "";

  const materialHref = getSafeExternalHref(
    content.url
    || content.file_url
    || content.material_url
    || ""
  );

  const detailItems = useMemo(
    () => [
      due
        ? ["\u0421\u0440\u043e\u043a", due]
        : null,
      expectedResult
        ? ["\u041e\u0436\u0438\u0434\u0430\u0435\u043c\u044b\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442", expectedResult]
        : null,
      submissionFormat
        ? ["\u0424\u043e\u0440\u043c\u0430\u0442 \u043e\u0442\u0432\u0435\u0442\u0430", submissionFormat]
        : null,
      criteria
        ? ["\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0438", criteria]
        : null,
      estimatedTimeText
        ? ["\u041e\u0440\u0438\u0435\u043d\u0442\u0438\u0440\u043e\u0432\u043e\u0447\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f", estimatedTimeText]
        : null,
    ].filter(Boolean),
    [
      criteria,
      due,
      estimatedTimeText,
      expectedResult,
      submissionFormat,
    ]
  );

  const [submission, setSubmission] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const completed = submissionCompletesAssignment(
    reviewMode,
    submission
  );

  const status = `${submission?.status || "not_started"}`.trim();
  const statusLabel = getStatusLabel(status);
  const statusTone = getStatusTone(status, completed);
  const scoreText = getScoreText(submission);
  const reviewComment = `${submission?.review_comment || ""}`.trim();
  const reviewedAtText = formatDateTime(
    submission?.reviewed_at
  );
  const reviewMessage = getReviewMessage(
    status,
    reviewMode
  );

  const showReviewFeedback = Boolean(submission) && Boolean(
    reviewMessage
    || reviewComment
    || scoreText
    || reviewedAtText
    || [
      "submitted",
      "approved",
      "rejected",
      "returned",
    ].includes(status)
  );

  useEffect(() => {
    let ignore = false;

    async function loadSubmission() {
      if (
        !enrollmentId
        || !lessonId
        || !blockId
      ) {
        if (!ignore) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const nextSubmission =
          await getAccountCourseLessonAssignmentSubmission(
            enrollmentId,
            lessonId,
            blockId
          );

        if (ignore) {
          return;
        }

        setSubmission(nextSubmission);
        setAnswerText(
          nextSubmission?.answer_text || ""
        );
      } catch (err) {
        if (!ignore) {
          setError(
            formatApiError(
              err,
              "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u043d\u0438\u044f"
            )
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSubmission();

    return () => {
      ignore = true;
    };
  }, [
    blockId,
    enrollmentId,
    lessonId,
  ]);

  async function handleSubmitAnswer() {
    if (
      disabled
      || submitting
      || !enrollmentId
      || !lessonId
      || !blockId
    ) {
      return;
    }

    const normalizedAnswer = `${answerText || ""}`.trim();

    if (!normalizedAnswer) {
      setError(
        "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442 \u043d\u0430 \u0437\u0430\u0434\u0430\u043d\u0438\u0435."
      );
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const nextSubmission =
        await submitAccountCourseLessonAssignmentAnswer(
          enrollmentId,
          lessonId,
          blockId,
          normalizedAnswer
        );

      setSubmission(nextSubmission);
      setAnswerText(
        nextSubmission?.answer_text
        || normalizedAnswer
      );

      if (reviewMode === "manual_review") {
        setSuccess(
          "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443."
        );
      } else if (reviewMode === "submit_only") {
        setSuccess(
          "\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d."
        );
      } else {
        setSuccess(
          "\u041e\u0442\u0432\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d."
        );
      }
    } catch (err) {
      setError(
        formatApiError(
          err,
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442"
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteAssignment() {
    if (
      disabled
      || completing
      || completed
      || reviewMode === "manual_review"
      || !enrollmentId
      || !lessonId
      || !blockId
    ) {
      return;
    }

    try {
      setCompleting(true);
      setError("");
      setSuccess("");

      const nextSubmission =
        await completeAccountCourseLessonAssignment(
          enrollmentId,
          lessonId,
          blockId
        );

      setSubmission(nextSubmission);
      setSuccess(
        "\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d."
      );
    } catch (err) {
      setError(
        formatApiError(
          err,
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u043c"
        )
      );
    } finally {
      setCompleting(false);
    }
  }

  return (
    <section
      data-testid="learner-assignment-block"
      className="rounded-2xl bg-red-50/70 p-5 ring-1 ring-red-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-red-950">
            {block?.title || "\u041f\u0440\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u0435"}
          </div>

          <div className="mt-1 text-xs font-semibold text-red-700">
            \u0421\u0442\u0430\u0442\u0443\u0441: {loading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..." : statusLabel}
          </div>
        </div>

        <span
          data-testid="learner-assignment-completion-status"
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone}`}
        >
          {loading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..." : statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
          \u0418\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044f
        </div>

        <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7">
          {description || "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e."}
        </div>
      </div>

      {detailItems.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {detailItems.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100"
            >
              <div className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
                {label}
              </div>

              <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6">
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {materialHref ? (
        <a
          data-testid="learner-assignment-material-link"
          href={materialHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
        >
          \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b
        </a>
      ) : null}

      {disabled ? (
        <div
          data-testid="learner-assignment-read-only"
          className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-200"
        >
          \u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0432 \u0440\u0435\u0436\u0438\u043c\u0435 \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430. \u0414\u043b\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u043e\u0442\u0432\u0435\u0442\u0430 \u043a\u0443\u0440\u0441 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 \u00ab\u0412 \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0435\u00bb.
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
          \u0412\u0430\u0448 \u043e\u0442\u0432\u0435\u0442
        </label>

        <textarea
          data-testid="learner-assignment-answer-textarea"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          rows={5}
          maxLength={10000}
          disabled={disabled || submitting || loading}
          className="mt-3 min-h-[120px] w-full resize-y rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          placeholder="\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442 \u043d\u0430 \u0437\u0430\u0434\u0430\u043d\u0438\u0435"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500">
            {answerText.trim().length} / 10000
          </div>

          <button
            type="button"
            data-testid="learner-assignment-submit-answer-button"
            onClick={handleSubmitAnswer}
            disabled={
              disabled
              || submitting
              || loading
              || !answerText.trim()
            }
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430..."
              : "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442"}
          </button>
        </div>
      </div>

      {reviewMode === "manual_review" && !completed ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
          \u0414\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430. \u041f\u043e\u0441\u043b\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u043e\u0442\u0432\u0435\u0442\u0430 \u0434\u043e\u0436\u0434\u0438\u0442\u0435\u0441\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438.
        </div>
      ) : null}

      {showReviewFeedback ? (
        <div
          data-testid="learner-assignment-review-result"
          className={`mt-4 rounded-2xl p-4 text-sm font-semibold ring-1 ${getReviewPanelTone(status)}`}
        >
          <div className="text-xs font-black uppercase tracking-[0.12em]">
            \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438
          </div>

          {reviewMessage ? (
            <p className="mt-2 leading-6">
              {reviewMessage}
            </p>
          ) : null}

          {(scoreText || reviewedAtText) ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {scoreText ? (
                <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/70">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
                    \u041e\u0446\u0435\u043d\u043a\u0430
                  </div>
                  <div className="mt-1 text-base font-black">
                    {scoreText}
                  </div>
                </div>
              ) : null}

              {reviewedAtText ? (
                <div className="rounded-xl bg-white/70 p-3 ring-1 ring-white/70">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
                    \u0414\u0430\u0442\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438
                  </div>
                  <div className="mt-1 text-base font-black">
                    {reviewedAtText}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {reviewComment ? (
            <div
              data-testid="learner-assignment-review-comment"
              className="mt-3 rounded-xl bg-white/70 p-3 ring-1 ring-white/70"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">
                \u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439
              </div>

              <div className="mt-2 whitespace-pre-wrap break-words leading-6">
                {reviewComment}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          data-testid="learner-assignment-error"
          className="mt-4 rounded-2xl bg-red-100 p-4 text-sm font-semibold text-red-800 ring-1 ring-red-200"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          data-testid="learner-assignment-success"
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200"
        >
          {success}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="learner-assignment-complete-button"
          onClick={handleCompleteAssignment}
          disabled={
            disabled
            || loading
            || completing
            || completed
            || reviewMode === "manual_review"
          }
          className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {completing
            ? "\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435..."
            : completed
              ? "\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e"
              : reviewMode === "manual_review"
                ? "\u041d\u0443\u0436\u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"
                : "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u043c"}
        </button>
      </div>
    </section>
  );
}
