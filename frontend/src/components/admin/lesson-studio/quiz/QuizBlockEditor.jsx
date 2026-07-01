import { useMemo, useState } from "react";
import {
  QUIZ_QUESTION_TYPES,
  calculateQuizTotalPoints,
  createChoiceOption,
  createDefaultQuestion,
  getQuizQuestionTypeMeta,
  normalizeQuizContent,
} from "./quizSchema.js";
import { validateQuizContent } from "./quizValidation.js";
import QuizAttemptPreview from "./QuizAttemptPreview.jsx";

function FieldLabel({ children, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{children}</span>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
    />
  );
}

function TextArea({ value, onChange, placeholder, disabled, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
    />
  );
}

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
  );
}


const QUIZ_EDITOR_TABS = [
  {
    key: "settings",
    label: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0442\u0435\u0441\u0442\u0430",
  },
  {
    key: "question",
    label: "\u0412\u043e\u043f\u0440\u043e\u0441",
  },
  {
    key: "feedback",
    label: "\u041e\u0431\u0440\u0430\u0442\u043d\u0430\u044f \u0441\u0432\u044f\u0437\u044c",
  },

];

const QUESTION_FILTERS = [
  {
    key: "all",
    label: "\u0412\u0441\u0435",
  },
  {
    key: "ready",
    label: "\u0413\u043e\u0442\u043e\u0432\u044b\u0435",
  },
  {
    key: "problems",
    label: "\u0421 \u043e\u0448\u0438\u0431\u043a\u0430\u043c\u0438",
  },
];

function getQuestionDisplayTitle(question, index) {
  const title = `${question?.title || ""}`.trim();

  return title || `\u0412\u043e\u043f\u0440\u043e\u0441 ${index + 1}`;
}

function getQuestionStatus(question) {
  const issues = [];

  if (!`${question?.title || ""}`.trim()) {
    issues.push("\u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0432\u043e\u043f\u0440\u043e\u0441\u0430");
  }

  const type = `${question?.type || ""}`.toLowerCase();

  if (type === "single_choice" || type === "multiple_choice") {
    const options = Array.isArray(question?.options) ? question.options : [];
    const filledOptions = options.filter((option) => `${option?.text || ""}`.trim());
    const correctOptions = options.filter((option) => option?.is_correct);

    if (filledOptions.length < 2) {
      issues.push("\u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043c\u0438\u043d\u0438\u043c\u0443\u043c 2 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u0430");
    }

    if (type === "single_choice" && correctOptions.length !== 1) {
      issues.push("\u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0434\u0438\u043d \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442");
    }

    if (type === "multiple_choice" && correctOptions.length < 1) {
      issues.push("\u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0435 \u043e\u0442\u0432\u0435\u0442\u044b");
    }
  }

  if (type === "short_text") {
    const answers = Array.isArray(question?.accepted_answers)
      ? question.accepted_answers
      : [];

    if (!answers.some((answer) => `${answer || ""}`.trim())) {
      issues.push("\u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0439 \u043e\u0442\u0432\u0435\u0442");
    }
  }

  if (type === "number" && `${question?.correct_number ?? ""}`.trim() === "") {
    issues.push("\u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0435 \u0447\u0438\u0441\u043b\u043e");
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}

function getQuestionStatusLabel(question) {
  const status = getQuestionStatus(question);

  return status.ready ? "\u0413\u043e\u0442\u043e\u0432" : "\u0415\u0441\u0442\u044c \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u044f";
}

function getQuestionBadgeClass(question) {
  const status = getQuestionStatus(question);

  return status.ready
    ? "bg-green-50 text-green-700 ring-green-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
}

function getFilteredQuizQuestions(questions, filter, search) {
  const normalizedSearch = `${search || ""}`.trim().toLowerCase();

  return questions.filter((question, index) => {
    const status = getQuestionStatus(question);

    if (filter === "ready" && !status.ready) {
      return false;
    }

    if (filter === "problems" && status.ready) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const title = getQuestionDisplayTitle(question, index).toLowerCase();
    const typeMeta = getQuizQuestionTypeMeta(question.type);
    const typeLabel = `${typeMeta?.label || typeMeta?.shortLabel || ""}`.toLowerCase();

    return title.includes(normalizedSearch) || typeLabel.includes(normalizedSearch);
  });
}

function getQuizReadinessPercent(validation) {
  const questionCount = Math.max(0, Number(validation?.questionCount) || 0);

  if (questionCount === 0) {
    return 0;
  }

  const issueCount = Array.isArray(validation?.issues) ? validation.issues.length : 0;
  const warningCount = Array.isArray(validation?.warnings) ? validation.warnings.length : 0;
  const penalty = Math.min(100, issueCount * 18 + warningCount * 8);

  return Math.max(0, Math.min(100, 100 - penalty));
}


function QuestionTypeSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
    >
      {QUIZ_QUESTION_TYPES.map((type) => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
  );
}

export function QuizBlockEditor({ value, onChange, disabled = false }) {
  const quiz = useMemo(() => normalizeQuizContent(value), [value]);
  const validation = useMemo(() => validateQuizContent(quiz), [quiz]);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState("question");
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [questionFilter, setQuestionFilter] = useState("all");
  const [questionSearch, setQuestionSearch] = useState("");

  const selectedQuestion =
    quiz.questions.find((question) => question.id === activeQuestionId) ||
    quiz.questions[0] ||
    null;
  const selectedQuestionIndex = selectedQuestion
    ? quiz.questions.findIndex((question) => question.id === selectedQuestion.id)
    : -1;
  const filteredQuestions = getFilteredQuizQuestions(
    quiz.questions,
    questionFilter,
    questionSearch
  );
  const readyQuestionCount = quiz.questions.filter((question) => getQuestionStatus(question).ready).length;
  const problemQuestionCount = Math.max(quiz.questions.length - readyQuestionCount, 0);
  const readinessPercent = getQuizReadinessPercent(validation);

  function emit(nextQuiz) {
    onChange?.(normalizeQuizContent(nextQuiz));
  }

  function updateQuizField(field, nextValue) {
    emit({
      ...quiz,
      [field]: nextValue,
    });
  }

  function updateNested(section, field, nextValue) {
    emit({
      ...quiz,
      [section]: {
        ...quiz[section],
        [field]: nextValue,
      },
    });
  }

  function updateQuestion(questionId, patch) {
    emit({
      ...quiz,
      questions: quiz.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      ),
    });
  }

  function changeQuestionType(questionId, nextType) {
    const current = quiz.questions.find((question) => question.id === questionId);
    const replacement = {
      ...createDefaultQuestion(nextType),
      id: current?.id || undefined,
      title: current?.title || "",
      description: current?.description || "",
      points: current?.points || 1,
      required: current?.required ?? true,
    };

    updateQuestion(questionId, replacement);
  }

  function addQuestion(type = "single_choice") {
    const nextQuestion = createDefaultQuestion(type);

    emit({
      ...quiz,
      questions: [...quiz.questions, nextQuestion],
    });

    setActiveQuestionId(nextQuestion.id);
    setActiveTab("question");
  }

  function duplicateQuestion(questionId) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    const copy = {
      ...question,
      id: undefined,
      title: `${question.title || "Вопрос"} — копия`,
    };

    const nextCopy = normalizeQuizContent({ questions: [copy] }).questions[0];

    emit({
      ...quiz,
      questions: [
        ...quiz.questions,
        nextCopy,
      ],
    });

    setActiveQuestionId(nextCopy.id);
    setActiveTab("question");
  }

  function removeQuestion(questionId) {
    const nextQuestions = quiz.questions.filter((question) => question.id !== questionId);

    emit({
      ...quiz,
      questions: nextQuestions,
    });

    if (selectedQuestion?.id === questionId) {
      setActiveQuestionId(nextQuestions[0]?.id || "");
    }
  }

  function moveQuestion(questionId, direction) {
    const index = quiz.questions.findIndex((question) => question.id === questionId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= quiz.questions.length) {
      return;
    }

    const nextQuestions = [...quiz.questions];
    const [item] = nextQuestions.splice(index, 1);
    nextQuestions.splice(nextIndex, 0, item);

    emit({
      ...quiz,
      questions: nextQuestions,
    });
  }

  function updateOption(questionId, optionId, patch) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      options: question.options.map((option) =>
        option.id === optionId ? { ...option, ...patch } : option
      ),
    });
  }

  function addOption(questionId) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      options: [...question.options, createChoiceOption(`Вариант ${question.options.length + 1}`)],
    });
  }

  function removeOption(questionId, optionId) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      options: question.options.filter((option) => option.id !== optionId),
    });
  }

  function setSingleCorrectOption(questionId, optionId) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      options: question.options.map((option) => ({
        ...option,
        is_correct: option.id === optionId,
      })),
    });
  }

  function updateAcceptedAnswer(questionId, answerIndex, nextValue) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    const nextAnswers = [...question.accepted_answers];
    nextAnswers[answerIndex] = nextValue;
    updateQuestion(questionId, { accepted_answers: nextAnswers });
  }

  function addAcceptedAnswer(questionId) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      accepted_answers: [...question.accepted_answers, ""],
    });
  }

  function removeAcceptedAnswer(questionId, answerIndex) {
    const question = quiz.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      accepted_answers: question.accepted_answers.filter((_, index) => index !== answerIndex),
    });
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
              Конструктор теста
            </p>


          </div>

          <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-amber-100">
            <div className="font-semibold text-slate-900">
              {quiz.questions.length} вопрос(ов)
            </div>
            <div className="text-slate-500">
              {calculateQuizTotalPoints(quiz)} балл(ов)
            </div>
          </div>


        </div>
      </div>

      <div
        data-testid="quiz-readiness-top-strip"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-[260px] items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-black text-blue-700 ring-8 ring-blue-100">
              {readinessPercent}%
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {"\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u0442\u0435\u0441\u0442\u0430"}
              </div>
              <div className="mt-1 text-base font-black text-slate-950">
                {validation.isValid
                  ? "\u0422\u0435\u0441\u0442 \u0433\u043e\u0442\u043e\u0432"
                  : "\u0415\u0441\u0442\u044c \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u044f"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {validation.questionCount} {"\u0432\u043e\u043f\u0440\u043e\u0441(\u043e\u0432)"}, {validation.totalPoints} {"\u0431\u0430\u043b\u043b(\u043e\u0432)"}
              </div>
            </div>
          </div>

          <div className="grid flex-1 gap-2 md:grid-cols-3">
            <div className="rounded-2xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              {"\u2713 \u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e"}
            </div>

            <div className="rounded-2xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              {"\u2713 \u041f\u0440\u043e\u0445\u043e\u0434\u043d\u044b\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b"}
            </div>

            <div
              className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                problemQuestionCount === 0
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {problemQuestionCount === 0
                ? "\u2713 \u0412\u0441\u0435 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u0433\u043e\u0442\u043e\u0432\u044b"
                : `\u26a0 \u0412\u043e\u043f\u0440\u043e\u0441\u043e\u0432 \u0441 \u043e\u0448\u0438\u0431\u043a\u0430\u043c\u0438: ${problemQuestionCount}`}
            </div>
          </div>

          {validation.warnings.length > 0 ? (
            <div className="max-w-[300px] rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold leading-5 text-amber-700">
              {validation.warnings[0]}
            </div>
          ) : null}
        </div>
      </div>

      {previewMode ? (
        <QuizAttemptPreview value={quiz} disabled={disabled} />
      ) : (
      <div className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-black text-slate-950">
              {"\u0412\u043e\u043f\u0440\u043e\u0441\u044b \u0442\u0435\u0441\u0442\u0430"}
            </h4>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {quiz.questions.length}
            </span>
          </div>

          <input
            value={questionSearch}
            onChange={(event) => setQuestionSearch(event.target.value)}
            placeholder={"\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u0430\u043c"}
            disabled={disabled}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {QUESTION_FILTERS.map((filter) => {
              const count =
                filter.key === "ready"
                  ? readyQuestionCount
                  : filter.key === "problems"
                    ? problemQuestionCount
                    : quiz.questions.length;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQuestionFilter(filter.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
                    questionFilter === filter.key
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {filter.label} {count}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            {"\u041f\u043e\u0440\u044f\u0434\u043e\u043a: \u043f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e"}
          </div>

          <div className="mt-4 space-y-3">
            {filteredQuestions.length ? (
              filteredQuestions.map((question) => {
                const originalIndex = quiz.questions.findIndex((item) => item.id === question.id);
                const typeMeta = getQuizQuestionTypeMeta(question.type);
                const isActive = selectedQuestion?.id === question.id;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setActiveQuestionId(question.id);
                      setActiveTab("question");
                    }}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-black leading-5 text-slate-950">
                      {originalIndex + 1}. {getQuestionDisplayTitle(question, originalIndex)}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        {typeMeta.shortLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {question.points || 0} {"\u0431\u0430\u043b\u043b."}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${getQuestionBadgeClass(question)}`}
                      >
                        {getQuestionStatusLabel(question)}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                {"\u0412\u043e\u043f\u0440\u043e\u0441\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b."}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => addQuestion("single_choice")}
            disabled={disabled}
            className="mt-4 w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
          >
            + {"\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441"}
          </button>
        </aside>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {QUIZ_EDITOR_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);

                  }}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={activeTab === "settings" ? "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" : "hidden"}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel hint="Название будет видно в уроке и в превью блока.">
                  Название теста
                </FieldLabel>
                <TextInput
                  value={quiz.title}
                  onChange={(nextValue) => updateQuizField("title", nextValue)}
                  placeholder="Например: Проверочный тест по теме"
                  disabled={disabled}
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel hint="Краткая инструкция для ученика перед началом теста.">
                  Описание
                </FieldLabel>
                <TextArea
                  value={quiz.description}
                  onChange={(nextValue) => updateQuizField("description", nextValue)}
                  placeholder="Ответьте на вопросы после изучения материала."
                  disabled={disabled}
                />
              </div>

              <div>
                <FieldLabel>Проходной балл, %</FieldLabel>
                <TextInput
                  type="number"
                  value={quiz.grading.pass_score_percent}
                  onChange={(nextValue) =>
                    updateNested("grading", "pass_score_percent", Number(nextValue))
                  }
                  disabled={disabled}
                />
              </div>

              <div>
                <FieldLabel>Количество попыток</FieldLabel>
                <TextInput
                  type="number"
                  value={quiz.behavior.max_attempts}
                  onChange={(nextValue) =>
                    updateNested("behavior", "max_attempts", Number(nextValue))
                  }
                  disabled={disabled || !quiz.behavior.allow_retry}
                />
              </div>

              <Toggle
                checked={quiz.behavior.allow_retry}
                onChange={(nextValue) => updateNested("behavior", "allow_retry", nextValue)}
                disabled={disabled}
                label="Разрешить повторные попытки"
              />

              <Toggle
                checked={quiz.behavior.shuffle_questions}
                onChange={(nextValue) =>
                  updateNested("behavior", "shuffle_questions", nextValue)
                }
                disabled={disabled}
                label="Перемешивать вопросы"
              />

              <Toggle
                checked={quiz.behavior.shuffle_answers}
                onChange={(nextValue) => updateNested("behavior", "shuffle_answers", nextValue)}
                disabled={disabled}
                label="Перемешивать варианты ответов"
              />

              <Toggle
                checked={quiz.ui.show_question_points}
                onChange={(nextValue) => updateNested("ui", "show_question_points", nextValue)}
                disabled={disabled}
                label="Показывать баллы за вопрос"
              />
            </div>
          </div>

          <div className={activeTab === "settings" ? "hidden" : "space-y-4"}>
            {(selectedQuestion ? [selectedQuestion] : []).map((question) => {
              const index = selectedQuestionIndex;
              const typeMeta = getQuizQuestionTypeMeta(question.type);

              return (
                <article
                  key={question.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        Вопрос {index + 1}
                      </div>
                      <h4 className="mt-1 text-lg font-bold text-slate-950">
                        {question.title || "Новый вопрос"}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">{typeMeta.hint}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveQuestion(question.id, -1)}
                        disabled={disabled || index === 0}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(question.id, 1)}
                        disabled={disabled || index === quiz.questions.length - 1}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateQuestion(question.id)}
                        disabled={disabled}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                      >
                        Дублировать
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        disabled={disabled}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>

                  <div className={activeTab === "question" ? "mt-5 grid gap-4 md:grid-cols-2" : "hidden"}>
                    <div className="md:col-span-2">
                      <FieldLabel>Текст вопроса</FieldLabel>
                      <TextArea
                        value={question.title}
                        onChange={(nextValue) =>
                          updateQuestion(question.id, { title: nextValue })
                        }
                        placeholder="Введите вопрос"
                        disabled={disabled}
                        rows={2}
                      />
                    </div>

                    <div>
                      <FieldLabel>Тип вопроса</FieldLabel>
                      <QuestionTypeSelect
                        value={question.type}
                        onChange={(nextType) => changeQuestionType(question.id, nextType)}
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <FieldLabel>Баллы</FieldLabel>
                      <TextInput
                        type="number"
                        value={question.points}
                        onChange={(nextValue) =>
                          updateQuestion(question.id, { points: Number(nextValue) })
                        }
                        disabled={disabled}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FieldLabel>Пояснение к вопросу</FieldLabel>
                      <TextArea
                        value={question.description}
                        onChange={(nextValue) =>
                          updateQuestion(question.id, { description: nextValue })
                        }
                        placeholder="Необязательное пояснение или контекст"
                        disabled={disabled}
                        rows={2}
                      />
                    </div>
                  </div>

                  {activeTab === "question" &&
                    (question.type === "single_choice" ||
                      question.type === "multiple_choice") && (
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel>Варианты ответа</FieldLabel>
                        <button
                          type="button"
                          onClick={() => addOption(question.id)}
                          disabled={disabled}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
                        >
                          Добавить вариант
                        </button>
                      </div>

                      {question.options.map((option, optionIndex) => (
                        <div
                          key={option.id}
                          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start"
                        >
                          <label className="flex items-center gap-2 pt-3 text-sm text-slate-700">
                            <input
                              type={question.type === "single_choice" ? "radio" : "checkbox"}
                              checked={option.is_correct}
                              onChange={(event) => {
                                if (question.type === "single_choice") {
                                  setSingleCorrectOption(question.id, option.id);
                                } else {
                                  updateOption(question.id, option.id, {
                                    is_correct: event.target.checked,
                                  });
                                }
                              }}
                              disabled={disabled}
                              name={`correct-${question.id}`}
                              className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-semibold text-slate-500">
                              верный
                            </span>
                          </label>

                          <textarea
                            value={option.text}
                            onChange={(event) =>
                              updateOption(question.id, option.id, {
                                text: event.target.value,
                              })
                            }
                            placeholder={`Вариант ${optionIndex + 1}`}
                            disabled={disabled}
                            rows={3}
                            className="min-h-[88px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          ></textarea>

                          <button
                            type="button"
                            onClick={() => removeOption(question.id, option.id)}
                            disabled={disabled || question.options.length <= 2}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "question" && question.type === "true_false" && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(question.id, { correct_value: true })}
                        disabled={disabled}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          question.correct_value
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Верно
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQuestion(question.id, { correct_value: false })}
                        disabled={disabled}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          !question.correct_value
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Неверно
                      </button>
                    </div>
                  )}

                  {activeTab === "question" && question.type === "short_text" && (
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel>Допустимые ответы</FieldLabel>
                        <button
                          type="button"
                          onClick={() => addAcceptedAnswer(question.id)}
                          disabled={disabled}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
                        >
                          Добавить ответ
                        </button>
                      </div>

                      {question.accepted_answers.map((answer, answerIndex) => (
                        <div key={answerIndex} className="flex gap-3">
                          <input
                            value={answer}
                            onChange={(event) =>
                              updateAcceptedAnswer(question.id, answerIndex, event.target.value)
                            }
                            placeholder={`Ответ ${answerIndex + 1}`}
                            disabled={disabled}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => removeAcceptedAnswer(question.id, answerIndex)}
                            disabled={disabled || question.accepted_answers.length <= 1}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            Удалить
                          </button>
                        </div>
                      ))}

                      <div className="grid gap-3 md:grid-cols-2">
                        <Toggle
                          checked={question.trim_spaces}
                          onChange={(nextValue) =>
                            updateQuestion(question.id, { trim_spaces: nextValue })
                          }
                          disabled={disabled}
                          label="Игнорировать пробелы по краям"
                        />
                        <Toggle
                          checked={question.case_sensitive}
                          onChange={(nextValue) =>
                            updateQuestion(question.id, { case_sensitive: nextValue })
                          }
                          disabled={disabled}
                          label="Учитывать регистр"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === "question" && question.type === "number" && (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Правильное число</FieldLabel>
                        <TextInput
                          type="number"
                          value={question.correct_number}
                          onChange={(nextValue) =>
                            updateQuestion(question.id, { correct_number: nextValue })
                          }
                          disabled={disabled}
                        />
                      </div>
                      <div>
                        <FieldLabel hint="Например, 0.5 разрешит ответ в пределах ±0.5.">
                          Погрешность
                        </FieldLabel>
                        <TextInput
                          type="number"
                          value={question.tolerance}
                          onChange={(nextValue) =>
                            updateQuestion(question.id, { tolerance: Number(nextValue) })
                          }
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  )}

                  <div className={activeTab === "feedback" ? "mt-5 grid gap-4 md:grid-cols-2" : "hidden"}>
                    <div>
                      <FieldLabel>Комментарий при верном ответе</FieldLabel>
                      <TextArea
                        value={question.feedback_correct}
                        onChange={(nextValue) =>
                          updateQuestion(question.id, { feedback_correct: nextValue })
                        }
                        disabled={disabled}
                        rows={2}
                      />
                    </div>
                    <div>
                      <FieldLabel>Комментарий при неверном ответе</FieldLabel>
                      <TextArea
                        value={question.feedback_incorrect}
                        onChange={(nextValue) =>
                          updateQuestion(question.id, { feedback_incorrect: nextValue })
                        }
                        disabled={disabled}
                        rows={2}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {selectedQuestion && activeTab === "question" ? (
            <div
              data-testid="quiz-inline-preview-strip"
              className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm font-black text-blue-800">
                    {"\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u043a\u0430\u043a \u0443\u0447\u0435\u043d\u0438\u043a"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-blue-600">
                    {"\u0412\u043e\u043f\u0440\u043e\u0441"} {selectedQuestionIndex + 1} {"\u0438\u0437"} {quiz.questions.length}
                  </div>
                </div>

                <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-blue-100">
                  {selectedQuestion.points || 0} {"\u0431\u0430\u043b\u043b."}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-4">
                  <div className="text-base font-black text-slate-950">
                    {selectedQuestion.title || "\u041d\u043e\u0432\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441"}
                  </div>

                  {(selectedQuestion.type === "single_choice" ||
                    selectedQuestion.type === "multiple_choice") ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {selectedQuestion.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        >
                          <input
                            type={selectedQuestion.type === "single_choice" ? "radio" : "checkbox"}
                            checked={Boolean(option.is_correct)}
                            readOnly
                            disabled
                            name={`preview-${selectedQuestion.id}`}
                            className="h-4 w-4 border-slate-300 text-blue-600"
                          />
                          <span>{option.text || "\u0412\u0430\u0440\u0438\u0430\u043d\u0442"}</span>
                        </label>
                      ))}
                    </div>
                  ) : selectedQuestion.type === "true_false" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          selectedQuestion.correct_value
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {"\u0412\u0435\u0440\u043d\u043e"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          !selectedQuestion.correct_value
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {"\u041d\u0435\u0432\u0435\u0440\u043d\u043e"}
                      </span>
                    </div>
                  ) : selectedQuestion.type === "short_text" ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {"\u041e\u0442\u0432\u0435\u0442: "}
                      {(selectedQuestion.accepted_answers || []).filter(Boolean).slice(0, 3).join(", ") ||
                        "\u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0439 \u0442\u0435\u043a\u0441\u0442"}
                    </div>
                  ) : selectedQuestion.type === "number" ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {"\u0427\u0438\u0441\u043b\u043e: "}
                      {selectedQuestion.correct_number || "\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e"}
                      {Number(selectedQuestion.tolerance) > 0
                        ? `, \u043f\u043e\u0433\u0440\u0435\u0448\u043d\u043e\u0441\u0442\u044c \u00b1${selectedQuestion.tolerance}`
                        : ""}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:min-w-[190px]"
                  >
                    {"\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:min-w-[190px]"
                  >
                    {"\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}


        </div>


      </div>
      )}
    </section>
  );
}

export default QuizBlockEditor;

