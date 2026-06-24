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
    emit({
      ...quiz,
      questions: [...quiz.questions, createDefaultQuestion(type)],
    });
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

    emit({
      ...quiz,
      questions: [
        ...quiz.questions,
        normalizeQuizContent({ questions: [copy] }).questions[0],
      ],
    });
  }

  function removeQuestion(questionId) {
    emit({
      ...quiz,
      questions: quiz.questions.filter((question) => question.id !== questionId),
    });
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
      <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              Конструктор теста
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">
              Полноценный блок проверки знаний
            </h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Сейчас это отдельный редактор содержимого quiz-блока. Данные сохраняются в
              content_json существующего LessonBlock.
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

          <button
            type="button"
            data-testid="lesson-studio-quiz-preview-toggle"
            onClick={() => setPreviewMode((current) => !current)}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            {previewMode ? "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0440\u0435\u0434\u0430\u043a\u0442\u043e\u0440\u0443" : "\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440"}
          </button>
        </div>
      </div>

      {previewMode ? (
        <QuizAttemptPreview value={quiz} disabled={disabled} />
      ) : (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

          <div className="space-y-4">
            {quiz.questions.map((question, index) => {
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

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
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

                  {(question.type === "single_choice" ||
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
                          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[auto_minmax(0,1fr)_auto]"
                        >
                          <label className="flex items-center gap-2 text-sm text-slate-700">
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

                          <input
                            value={option.text}
                            onChange={(event) =>
                              updateOption(question.id, option.id, {
                                text: event.target.value,
                              })
                            }
                            placeholder={`Вариант ${optionIndex + 1}`}
                            disabled={disabled}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                          />

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

                  {question.type === "true_false" && (
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

                  {question.type === "short_text" && (
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

                  {question.type === "number" && (
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

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
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

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-950">Добавить вопрос</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Выберите тип вопроса. Его можно будет поменять позже.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUIZ_QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => addQuestion(type.value)}
                    disabled={disabled}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                  >
                    {type.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-bold text-slate-950">Готовность теста</h4>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-900">
                {validation.isValid ? "Тест готов" : "Есть замечания"}
              </div>
              <div className="mt-1 text-slate-500">
                {validation.questionCount} вопрос(ов), {validation.totalPoints} балл(ов)
              </div>
            </div>

            {validation.issues.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-red-700">
                {validation.issues.map((issue) => (
                  <li key={issue} className="rounded-2xl bg-red-50 px-3 py-2">
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl bg-green-50 px-3 py-2 text-sm text-green-700">
                Обязательные параметры заполнены.
              </p>
            )}

            {validation.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-amber-700">
                {validation.warnings.map((warning) => (
                  <li key={warning} className="rounded-2xl bg-amber-50 px-3 py-2">
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-bold text-slate-950">Типы вопросов</h4>
            <div className="mt-4 space-y-3">
              {QUIZ_QUESTION_TYPES.map((type) => (
                <div key={type.value} className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">{type.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{type.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      )}
    </section>
  );
}

export default QuizBlockEditor;

