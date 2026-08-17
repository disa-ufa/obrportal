import { useEffect, useMemo, useState } from "react";

import {
  getAccountCourseLessonQuizAttempts,
  submitAccountCourseLessonQuizAttempt,
} from "../../api/client";
import { formatApiError } from "../../utils/apiErrors";


const HIDDEN_RESULT_MODES = new Set([
  "never",
  "none",
  "hidden",
  "false",
  "off",
  "disabled",
]);


function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}


function asArray(value) {
  return Array.isArray(value) ? value : [];
}


function stableHash(value) {
  const source = `${value || ""}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}


function stableShuffle(items, seed, getId) {
  return [...items].sort((left, right) => {
    const leftId = getId(left);
    const rightId = getId(right);

    const leftRank = stableHash(
      `${seed}:${leftId}`
    );

    const rightRank = stableHash(
      `${seed}:${rightId}`
    );

    if (leftRank === rightRank) {
      return `${leftId}`.localeCompare(`${rightId}`);
    }

    return leftRank - rightRank;
  });
}


function getQuestionId(question, index) {
  return `${
    question?.id ||
    `q_${index + 1}`
  }`;
}


function hasAnswer(question, answer) {
  const type = `${question?.type || ""}`.trim();

  if (type === "multiple_choice") {
    return (
      Array.isArray(answer) &&
      answer.length > 0
    );
  }

  if (type === "true_false") {
    return typeof answer === "boolean";
  }

  if (answer === null || answer === undefined) {
    return false;
  }

  return `${answer}`.trim() !== "";
}


function getCorrectAnswerText(question, value) {
  if (value === null || value === undefined) {
    return "";
  }

  const type = `${question?.type || ""}`.trim();

  if (type === "true_false") {
    return value
      ? "\u0412\u0435\u0440\u043d\u043e"
      : "\u041d\u0435\u0432\u0435\u0440\u043d\u043e";
  }

  if (
    type === "multiple_choice" &&
    Array.isArray(value)
  ) {
    const options = asArray(question?.options);

    return value
      .map((optionId) => {
        const option = options.find(
          (item) =>
            `${item?.id || ""}` === `${optionId || ""}`
        );

        return (
          option?.text ||
          `${optionId || ""}`
        );
      })
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => `${item ?? ""}`)
      .filter(Boolean)
      .join(", ");
  }

  return `${value}`;
}


function getAttemptQuestionResult(attempt, questionId) {
  return (
    asArray(attempt?.question_results)
      .find(
        (item) =>
          `${item?.question_id || ""}` ===
          `${questionId || ""}`
      ) ||
    null
  );
}


function getAttemptStatusLabel(attempt) {
  if (!attempt) {
    return "";
  }

  return attempt.passed
    ? "\u0422\u0435\u0441\u0442 \u043f\u0440\u043e\u0439\u0434\u0435\u043d"
    : "\u0422\u0435\u0441\u0442 \u043d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d";
}


function QuestionInput({
  question,
  questionId,
  value,
  disabled,
  seed,
  onChange,
}) {
  const type = `${question?.type || ""}`.trim();

  const rawOptions = asArray(
    question?.options
  );

  const shouldShuffleOptions = Boolean(
    question?.shuffle_options
  );

  const options = shouldShuffleOptions
    ? stableShuffle(
        rawOptions,
        `${seed}:${questionId}`,
        (option) => option?.id || ""
      )
    : rawOptions;

  if (type === "single_choice") {
    return (
      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const optionId = `${option?.id || ""}`;

          return (
            <label
              key={optionId}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <input
                type="radio"
                name={`quiz-${questionId}`}
                checked={`${value ?? ""}` === optionId}
                disabled={disabled}
                onChange={() => onChange(optionId)}
                className="mt-1"
              />

              <span className="text-sm font-semibold leading-6 text-slate-800">
                {option?.text || "\u0412\u0430\u0440\u0438\u0430\u043d\u0442"}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "multiple_choice") {
    const selected = Array.isArray(value)
      ? value
      : [];

    return (
      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const optionId = `${option?.id || ""}`;
          const checked = selected.includes(optionId);

          return (
            <label
              key={optionId}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const nextValue = checked
                    ? selected.filter(
                        (item) => item !== optionId
                      )
                    : [
                        ...selected,
                        optionId,
                      ];

                  onChange(nextValue);
                }}
                className="mt-1"
              />

              <span className="text-sm font-semibold leading-6 text-slate-800">
                {option?.text || "\u0412\u0430\u0440\u0438\u0430\u043d\u0442"}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "true_false") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[true, false].map((optionValue) => (
          <label
            key={`${optionValue}`}
            className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition hover:ring-blue-300"
          >
            <input
              type="radio"
              name={`quiz-${questionId}`}
              checked={value === optionValue}
              disabled={disabled}
              onChange={() => onChange(optionValue)}
            />

            <span className="text-sm font-semibold text-slate-800">
              {optionValue
                ? "\u0412\u0435\u0440\u043d\u043e"
                : "\u041d\u0435\u0432\u0435\u0440\u043d\u043e"}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043b\u043e"
      />
    );
  }

  if (type === "short_text") {
    return (
      <textarea
        value={value ?? ""}
        disabled={disabled}
        rows={3}
        maxLength={10000}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-4 min-h-[96px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442"
      />
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
      {"\u0422\u0438\u043f \u0432\u043e\u043f\u0440\u043e\u0441\u0430 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f."}
    </div>
  );
}


export function LearnerQuizBlock({
  block,
  enrollmentId = "",
  lessonId = "",
  disabled = false,
}) {
  const blockId = `${block?.id || ""}`.trim();

  const quiz = useMemo(
    () => asObject(block?.content_json),
    [block?.content_json]
  );

  const behavior = asObject(
    quiz?.behavior
  );

  const ui = asObject(
    quiz?.ui
  );

  const rawQuestions = asArray(
    quiz?.questions
  );

  const seed = `${
    enrollmentId
  }:${
    lessonId
  }:${
    blockId
  }`;

  const questions = useMemo(
    () =>
      behavior.shuffle_questions
        ? stableShuffle(
            rawQuestions,
            seed,
            (question) => question?.id || ""
          )
        : rawQuestions,
    [
      behavior.shuffle_questions,
      rawQuestions,
      seed,
    ]
  );

  const [answers, setAnswers] = useState({});
  const [attempts, setAttempts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setAnswers({});
    setAttempts([]);
    setHistoryError("");
    setSubmitError("");

    if (!enrollmentId || !lessonId || !blockId) {
      return () => {
        cancelled = true;
      };
    }

    async function loadHistory() {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const response =
          await getAccountCourseLessonQuizAttempts(
            enrollmentId,
            lessonId,
            blockId
          );

        if (cancelled) {
          return;
        }

        const nextAttempts = asArray(response);
        const latestAttempt =
          nextAttempts[nextAttempts.length - 1] || null;

        setAttempts(nextAttempts);

        if (
          latestAttempt?.answers_json &&
          typeof latestAttempt.answers_json === "object" &&
          !Array.isArray(latestAttempt.answers_json)
        ) {
          setAnswers({
            ...latestAttempt.answers_json,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            formatApiError(
              error,
              "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043f\u043e\u043f\u044b\u0442\u043e\u043a."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [
    enrollmentId,
    lessonId,
    blockId,
  ]);

  const latestAttempt =
    attempts[attempts.length - 1] || null;

  const remainingAttempts =
    latestAttempt?.remaining_attempts === null ||
    latestAttempt?.remaining_attempts === undefined
      ? null
      : Number(latestAttempt.remaining_attempts);

  const passed = Boolean(
    latestAttempt?.passed
  );

  const attemptsExhausted = Boolean(
    latestAttempt &&
    !passed &&
    remainingAttempts !== null &&
    Number.isFinite(remainingAttempts) &&
    remainingAttempts <= 0
  );

  const interactionLocked = Boolean(
    disabled ||
    historyLoading ||
    submitting ||
    passed ||
    attemptsExhausted
  );

  const showDetailedResult = !HIDDEN_RESULT_MODES.has(
    `${
      behavior.show_result ||
      "after_submit"
    }`.trim().toLowerCase()
  );

  function updateAnswer(questionId, value) {
    if (interactionLocked) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));

    setSubmitError("");
  }

  async function handleSubmit() {
    if (
      interactionLocked ||
      !enrollmentId ||
      !lessonId ||
      !blockId
    ) {
      return;
    }

    const missingRequired = questions.some(
      (question, index) => {
        if (question?.required === false) {
          return false;
        }

        const questionId = getQuestionId(
          question,
          index
        );

        return !hasAnswer(
          question,
          answers[questionId]
        );
      }
    );

    if (missingRequired) {
      setSubmitError(
        "\u041e\u0442\u0432\u0435\u0442\u044c\u0442\u0435 \u043d\u0430 \u0432\u0441\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0432\u043e\u043f\u0440\u043e\u0441\u044b."
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");

      const attempt =
        await submitAccountCourseLessonQuizAttempt(
          enrollmentId,
          lessonId,
          blockId,
          answers
        );

      setAttempts((current) => {
        const filtered = current.filter(
          (item) =>
            `${item?.id || ""}` !==
            `${attempt?.id || ""}`
        );

        return [
          ...filtered,
          attempt,
        ].sort(
          (left, right) =>
            Number(left?.attempt_number || 0) -
            Number(right?.attempt_number || 0)
        );
      });

      if (
        attempt?.answers_json &&
        typeof attempt.answers_json === "object" &&
        !Array.isArray(attempt.answers_json)
      ) {
        setAnswers({
          ...attempt.answers_json,
        });
      }
    } catch (error) {
      setSubmitError(
        formatApiError(
          error,
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b \u0442\u0435\u0441\u0442\u0430."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleClearAnswers() {
    if (interactionLocked) {
      return;
    }

    setAnswers({});
    setSubmitError("");
  }

  return (
    <section
      data-testid="learner-quiz-block"
      className="rounded-3xl bg-blue-50/70 p-5 ring-1 ring-blue-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            {"\u0418\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0442\u0435\u0441\u0442"}
          </div>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {quiz?.title || block?.title || "\u0422\u0435\u0441\u0442"}
          </h3>

          {quiz?.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {quiz.description}
            </p>
          ) : null}
        </div>

        {block?.is_required ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
            {"\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e"}
          </span>
        ) : null}
      </div>

      {disabled ? (
        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
          {"\u0422\u0435\u0441\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0439 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435."}
        </div>
      ) : null}

      {historyLoading ? (
        <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
          {"\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043f\u043e\u043f\u044b\u0442\u043e\u043a..."}
        </div>
      ) : null}

      {historyError ? (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {historyError}
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {questions.map((question, index) => {
          const questionId = getQuestionId(
            question,
            index
          );

          const result = getAttemptQuestionResult(
            latestAttempt,
            questionId
          );

          const correctAnswer = getCorrectAnswerText(
            question,
            result?.correct_answer
          );

          return (
            <article
              key={questionId}
              data-testid="learner-quiz-question"
              data-question-type={question?.type || ""}
              className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    {"\u0412\u043e\u043f\u0440\u043e\u0441"} {index + 1}
                  </div>

                  <div className="mt-1 text-base font-black leading-6 text-slate-950">
                    {question?.title || "\u0411\u0435\u0437 \u0442\u0435\u043a\u0441\u0442\u0430 \u0432\u043e\u043f\u0440\u043e\u0441\u0430"}
                  </div>

                  {question?.description ? (
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {question.description}
                    </div>
                  ) : null}
                </div>

                {ui.show_question_points !== false ? (
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {Number(question?.points || 0)} {"\u0431\u0430\u043b\u043b."}
                  </span>
                ) : null}
              </div>

              <QuestionInput
                question={question}
                questionId={questionId}
                value={answers[questionId]}
                disabled={interactionLocked}
                seed={seed}
                onChange={(value) =>
                  updateAnswer(
                    questionId,
                    value
                  )
                }
              />

              {latestAttempt &&
              showDetailedResult &&
              result ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
                    result.correct
                      ? "bg-green-50 text-green-800 ring-green-200"
                      : "bg-amber-50 text-amber-900 ring-amber-200"
                  }`}
                >
                  <div>
                    {result.correct
                      ? "\u041e\u0442\u0432\u0435\u0442 \u0437\u0430\u0441\u0447\u0438\u0442\u0430\u043d."
                      : "\u041e\u0442\u0432\u0435\u0442 \u043d\u0435 \u0437\u0430\u0441\u0447\u0438\u0442\u0430\u043d."}
                  </div>

                  {correctAnswer ? (
                    <div
                      data-testid="learner-quiz-correct-answer"
                      className="mt-2 font-bold"
                    >
                      {"\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442: "}
                      {correctAnswer}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {!questions.length ? (
        <div className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
          {"\u0412 \u0442\u0435\u0441\u0442\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432."}
        </div>
      ) : null}

      {submitError ? (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {submitError}
        </div>
      ) : null}

      {latestAttempt ? (
        <div
          data-testid="learner-quiz-result"
          className={`mt-5 rounded-2xl p-4 ring-1 ${
            latestAttempt.passed
              ? "bg-green-50 text-green-900 ring-green-200"
              : "bg-white text-slate-800 ring-slate-200"
          }`}
        >
          <div className="font-black">
            {getAttemptStatusLabel(latestAttempt)}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <span>
              {"\u041f\u043e\u043f\u044b\u0442\u043a\u0430: "}
              {latestAttempt.attempt_number}
            </span>

            <span>
              {"\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442: "}
              {latestAttempt.percent}%
            </span>

            <span>
              {"\u0411\u0430\u043b\u043b\u044b: "}
              {latestAttempt.earned_points}
              {" / "}
              {latestAttempt.total_points}
            </span>

            <span>
              {"\u041f\u043e\u0440\u043e\u0433: "}
              {latestAttempt.pass_score_percent}%
            </span>

            <span>
              {"\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043f\u044b\u0442\u043e\u043a: "}
              {remainingAttempts === null
                ? "\u0431\u0435\u0437 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f"
                : remainingAttempts}
            </span>
          </div>
        </div>
      ) : null}

      {attempts.length ? (
        <div
          data-testid="learner-quiz-history"
          className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        >
          <div className="text-sm font-black text-slate-950">
            {"\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u043f\u044b\u0442\u043e\u043a"}
          </div>

          <div className="mt-3 space-y-2">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                <span>
                  {"\u041f\u043e\u043f\u044b\u0442\u043a\u0430 "}
                  {attempt.attempt_number}
                </span>

                <span>
                  {attempt.percent}%
                </span>

                <span
                  className={
                    attempt.passed
                      ? "font-bold text-green-700"
                      : "font-bold text-amber-700"
                  }
                >
                  {attempt.passed
                    ? "\u041f\u0440\u043e\u0439\u0434\u0435\u043d"
                    : "\u041d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="learner-quiz-submit"
          disabled={
            interactionLocked ||
            !questions.length ||
            !blockId ||
            !lessonId ||
            !enrollmentId
          }
          onClick={handleSubmit}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c..."
            : "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b"}
        </button>

        <button
          type="button"
          disabled={interactionLocked}
          onClick={handleClearAnswers}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {"\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b"}
        </button>

        {passed ? (
          <span className="text-sm font-bold text-green-700">
            {"\u0422\u0435\u0441\u0442 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043f\u0440\u043e\u0439\u0434\u0435\u043d."}
          </span>
        ) : null}

        {attemptsExhausted ? (
          <span className="text-sm font-bold text-amber-700">
            {"\u041f\u043e\u043f\u044b\u0442\u043a\u0438 \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b\u0438\u0441\u044c."}
          </span>
        ) : null}
      </div>
    </section>
  );
}
