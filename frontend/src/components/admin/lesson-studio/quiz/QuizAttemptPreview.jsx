import { useMemo, useState } from "react";
import { normalizeQuizContent } from "./quizSchema.js";
import {
  buildInitialQuizAnswers,
  gradeQuizAttempt,
} from "./quizGrading.js";

const LABELS = {
  previewTitle: "\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u043a\u0430\u043a \u0443\u0447\u0435\u043d\u0438\u043a",
  previewHint: "\u041f\u0440\u043e\u0439\u0434\u0438\u0442\u0435 \u0442\u0435\u0441\u0442 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043b\u043e\u0433\u0438\u043a\u0443 \u043e\u0442\u0432\u0435\u0442\u043e\u0432.",
  submit: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b",
  reset: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c",
  result: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  passed: "\u0422\u0435\u0441\u0442 \u043f\u0440\u043e\u0439\u0434\u0435\u043d",
  failed: "\u0422\u0435\u0441\u0442 \u043d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d",
  score: "\u0411\u0430\u043b\u043b\u044b",
  percent: "\u041f\u0440\u043e\u0446\u0435\u043d\u0442",
  passScore: "\u041f\u0440\u043e\u0445\u043e\u0434\u043d\u043e\u0439 \u0431\u0430\u043b\u043b",
  correct: "\u0412\u0435\u0440\u043d\u043e",
  incorrect: "\u041d\u0435\u0432\u0435\u0440\u043d\u043e",
  noQuestions: "\u0412 \u0442\u0435\u0441\u0442\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432.",
  enterAnswer: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442",
  enterNumber: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043b\u043e",
  trueText: "\u0412\u0435\u0440\u043d\u043e",
  falseText: "\u041d\u0435\u0432\u0435\u0440\u043d\u043e",
  correctAnswer: "\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442",
};

function getOptionText(question, optionId) {
  const option = Array.isArray(question?.options)
    ? question.options.find((item) => `${item.id}` === `${optionId}`)
    : null;

  return option?.text || optionId || "";
}

function formatCorrectAnswer(question, result) {
  const type = `${question?.type || ""}`.toLowerCase();

  if (type === "single_choice") {
    return result.correct_answer || "";
  }

  if (type === "multiple_choice") {
    const ids = Array.isArray(result.correct_answer) ? result.correct_answer : [];
    return ids.map((id) => getOptionText(question, id)).filter(Boolean).join(", ");
  }

  if (type === "true_false") {
    return result.correct_answer ? LABELS.trueText : LABELS.falseText;
  }

  if (type === "short_text") {
    return Array.isArray(result.correct_answer)
      ? result.correct_answer.filter(Boolean).join(", ")
      : `${result.correct_answer || ""}`;
  }

  return `${result.correct_answer ?? ""}`;
}

function SingleChoiceAnswer({ question, value, onChange, disabled }) {
  const options = Array.isArray(question.options) ? question.options : [];

  return (
    <div className="mt-3 space-y-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <input
            type="radio"
            name={`preview-${question.id}`}
            checked={`${value || ""}` === `${option.id}`}
            onChange={() => onChange(option.id)}
            disabled={disabled}
            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}

function MultipleChoiceAnswer({ question, value, onChange, disabled }) {
  const options = Array.isArray(question.options) ? question.options : [];
  const selected = Array.isArray(value) ? value : [];

  function toggleOption(optionId, checked) {
    if (checked) {
      onChange([...selected.filter((id) => id !== optionId), optionId]);
      return;
    }

    onChange(selected.filter((id) => id !== optionId));
  }

  return (
    <div className="mt-3 space-y-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={(event) => toggleOption(option.id, event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}

function TrueFalseAnswer({ value, onChange, disabled }) {
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        disabled={disabled}
        className={`rounded-2xl px-4 py-3 text-sm font-bold ring-1 transition ${
          value === true
            ? "bg-blue-50 text-blue-700 ring-blue-200"
            : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
        }`}
      >
        {LABELS.trueText}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        disabled={disabled}
        className={`rounded-2xl px-4 py-3 text-sm font-bold ring-1 transition ${
          value === false
            ? "bg-blue-50 text-blue-700 ring-blue-200"
            : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
        }`}
      >
        {LABELS.falseText}
      </button>
    </div>
  );
}

function TextAnswer({ value, onChange, disabled, type = "text" }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={type === "number" ? LABELS.enterNumber : LABELS.enterAnswer}
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
    />
  );
}

function QuestionAnswerControl({ question, value, onChange, disabled }) {
  const type = `${question?.type || ""}`.toLowerCase();

  if (type === "single_choice") {
    return (
      <SingleChoiceAnswer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (type === "multiple_choice") {
    return (
      <MultipleChoiceAnswer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  if (type === "true_false") {
    return <TrueFalseAnswer value={value} onChange={onChange} disabled={disabled} />;
  }

  if (type === "number") {
    return <TextAnswer type="number" value={value} onChange={onChange} disabled={disabled} />;
  }

  return <TextAnswer value={value} onChange={onChange} disabled={disabled} />;
}

export function QuizAttemptPreview({ value, disabled = false }) {
  const quiz = useMemo(() => normalizeQuizContent(value), [value]);
  const [answers, setAnswers] = useState(() => buildInitialQuizAnswers(quiz));
  const [result, setResult] = useState(null);

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  function updateAnswer(questionId, nextValue) {
    setAnswers((current) => ({
      ...current,
      [questionId]: nextValue,
    }));
    setResult(null);
  }

  function handleSubmit() {
    setResult(gradeQuizAttempt(quiz, answers));
  }

  function handleReset() {
    setAnswers(buildInitialQuizAnswers(quiz));
    setResult(null);
  }

  return (
    <section className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            {LABELS.previewTitle}
          </p>
          <h4 className="mt-2 text-xl font-black text-slate-950">
            {quiz.title}
          </h4>
          {quiz.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">{quiz.description}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">{LABELS.previewHint}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-blue-100">
          <div className="font-black text-slate-900">
            {questions.length} / {questions.length}
          </div>
          <div className="text-slate-500">{LABELS.previewTitle}</div>
        </div>
      </div>

      {questions.length ? (
        <div className="mt-5 space-y-4">
          {questions.map((question, index) => {
            const questionResult = result?.question_results?.find(
              (item) => item.question_id === question.id
            );

            return (
              <article
                key={question.id || index}
                className="rounded-3xl bg-white p-4 ring-1 ring-blue-100"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      {index + 1}
                    </div>
                    <h5 className="mt-1 text-base font-black text-slate-950">
                      {question.title || "\u0412\u043e\u043f\u0440\u043e\u0441"}
                    </h5>
                    {question.description ? (
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {question.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                    {question.points || 0} {"\u0431\u0430\u043b\u043b."}
                  </div>
                </div>

                <QuestionAnswerControl
                  question={question}
                  value={answers[question.id]}
                  onChange={(nextValue) => updateAnswer(question.id, nextValue)}
                  disabled={disabled}
                />

                {questionResult ? (
                  <div
                    className={`mt-3 rounded-2xl px-3 py-3 text-sm ring-1 ${
                      questionResult.correct
                        ? "bg-green-50 text-green-800 ring-green-200"
                        : "bg-red-50 text-red-800 ring-red-200"
                    }`}
                  >
                    <div className="font-black">
                      {questionResult.correct ? LABELS.correct : LABELS.incorrect}
                    </div>
                    {!questionResult.correct ? (
                      <div className="mt-1 text-xs leading-5">
                        {LABELS.correctAnswer}: {formatCorrectAnswer(question, questionResult)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-slate-600 ring-1 ring-blue-100">
          {LABELS.noQuestions}
        </div>
      )}

      {result ? (
        <div
          className={`mt-5 rounded-3xl p-4 ring-1 ${
            result.passed
              ? "bg-green-50 text-green-900 ring-green-200"
              : "bg-amber-50 text-amber-950 ring-amber-200"
          }`}
        >
          <div className="text-sm font-black">
            {LABELS.result}: {result.passed ? LABELS.passed : LABELS.failed}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl bg-white/80 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {LABELS.score}
              </div>
              <div className="mt-1 text-base font-black">
                {result.earned_points} / {result.total_points}
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {LABELS.percent}
              </div>
              <div className="mt-1 text-base font-black">{result.percent}%</div>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {LABELS.passScore}
              </div>
              <div className="mt-1 text-base font-black">
                {result.pass_score_percent ?? "\u2014"}%
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          {LABELS.reset}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !questions.length}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
        >
          {LABELS.submit}
        </button>
      </div>
    </section>
  );
}

export default QuizAttemptPreview;
