export const QUIZ_SCHEMA_VERSION = 1;

export const QUIZ_QUESTION_TYPES = [
  {
    value: "single_choice",
    label: "Один правильный ответ",
    shortLabel: "Один ответ",
    hint: "Ученик выбирает один вариант из списка.",
  },
  {
    value: "multiple_choice",
    label: "Несколько правильных ответов",
    shortLabel: "Несколько ответов",
    hint: "Ученик может выбрать несколько вариантов.",
  },
  {
    value: "true_false",
    label: "Верно / неверно",
    shortLabel: "Верно / неверно",
    hint: "Быстрый вопрос с ответом Да/Нет.",
  },
  {
    value: "short_text",
    label: "Короткий текстовый ответ",
    shortLabel: "Текст",
    hint: "Ученик вводит короткий ответ, который сравнивается с допустимыми вариантами.",
  },
  {
    value: "number",
    label: "Числовой ответ",
    shortLabel: "Число",
    hint: "Ученик вводит число. Можно задать допустимую погрешность.",
  },
];

export function getQuizQuestionTypeMeta(type) {
  return (
    QUIZ_QUESTION_TYPES.find((item) => item.value === type) ||
    QUIZ_QUESTION_TYPES[0]
  );
}

export function createQuizId(prefix = "id") {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);

  return `${prefix}_${randomPart}`;
}

export function createChoiceOption(text = "", isCorrect = false) {
  return {
    id: createQuizId("o"),
    text,
    is_correct: isCorrect,
    feedback: "",
  };
}

export function createDefaultQuestion(type = "single_choice") {
  const base = {
    id: createQuizId("q"),
    type,
    title: "",
    description: "",
    points: 1,
    required: true,
    shuffle_options: false,
    feedback_correct: "Верно.",
    feedback_incorrect: "Ответ неверный. Повторите материал урока.",
  };

  if (type === "multiple_choice") {
    return {
      ...base,
      options: [
        createChoiceOption("Вариант 1", true),
        createChoiceOption("Вариант 2", false),
      ],
      scoring_mode: "all_or_nothing",
    };
  }

  if (type === "true_false") {
    return {
      ...base,
      correct_value: true,
    };
  }

  if (type === "short_text") {
    return {
      ...base,
      accepted_answers: [""],
      case_sensitive: false,
      trim_spaces: true,
    };
  }

  if (type === "number") {
    return {
      ...base,
      correct_number: "",
      tolerance: 0,
    };
  }

  return {
    ...base,
    type: "single_choice",
    options: [
      createChoiceOption("Вариант 1", true),
      createChoiceOption("Вариант 2", false),
    ],
  };
}

export function createDefaultQuiz() {
  return {
    schema_version: QUIZ_SCHEMA_VERSION,
    title: "Проверочный тест",
    description: "",
    questions: [createDefaultQuestion("single_choice")],
    grading: {
      mode: "points",
      pass_score_percent: 70,
      partial_credit: true,
      negative_points: false,
    },
    behavior: {
      show_result: "after_submit",
      show_correct_answers: "after_submit",
      allow_retry: true,
      max_attempts: 3,
      shuffle_questions: false,
      shuffle_answers: false,
    },
    ui: {
      display_mode: "all_questions",
      show_progress: true,
      show_question_points: true,
    },
  };
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) {
    return [createChoiceOption("Вариант 1", true), createChoiceOption("Вариант 2", false)];
  }

  return options.map((option, index) => ({
    id: option?.id || createQuizId("o"),
    text: `${option?.text ?? option?.label ?? `Вариант ${index + 1}`}`,
    is_correct: normalizeBoolean(option?.is_correct ?? option?.isCorrect, false),
    feedback: `${option?.feedback ?? ""}`,
  }));
}

export function normalizeQuizQuestion(question, fallbackType = "single_choice") {
  const type = question?.type || fallbackType;
  const base = {
    ...createDefaultQuestion(type),
    ...question,
    id: question?.id || createQuizId("q"),
    type,
    title: `${question?.title ?? question?.question ?? ""}`,
    description: `${question?.description ?? ""}`,
    points: Math.max(0, normalizeNumber(question?.points, 1)),
    required: normalizeBoolean(question?.required, true),
    shuffle_options: normalizeBoolean(question?.shuffle_options, false),
    feedback_correct: `${question?.feedback_correct ?? "Верно."}`,
    feedback_incorrect: `${question?.feedback_incorrect ?? "Ответ неверный. Повторите материал урока."}`,
  };

  if (type === "single_choice" || type === "multiple_choice") {
    return {
      ...base,
      options: normalizeOptions(question?.options),
      scoring_mode: question?.scoring_mode || "all_or_nothing",
    };
  }

  if (type === "true_false") {
    return {
      ...base,
      correct_value: normalizeBoolean(question?.correct_value, true),
    };
  }

  if (type === "short_text") {
    return {
      ...base,
      accepted_answers: Array.isArray(question?.accepted_answers)
        ? question.accepted_answers.map((item) => `${item ?? ""}`)
        : [`${question?.answer ?? question?.quiz_answer ?? ""}`],
      case_sensitive: normalizeBoolean(question?.case_sensitive, false),
      trim_spaces: normalizeBoolean(question?.trim_spaces, true),
    };
  }

  if (type === "number") {
    return {
      ...base,
      correct_number: `${question?.correct_number ?? ""}`,
      tolerance: Math.max(0, normalizeNumber(question?.tolerance, 0)),
    };
  }

  return normalizeQuizQuestion({ ...question, type: "single_choice" }, "single_choice");
}

export function normalizeQuizContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return createDefaultQuiz();
  }

  const legacyQuestion = content.question || content.quiz_question;
  const legacyAnswer = content.answer || content.quiz_answer;

  const questions = Array.isArray(content.questions)
    ? content.questions.map((question) => normalizeQuizQuestion(question))
    : legacyQuestion
      ? [
          normalizeQuizQuestion({
            type: "short_text",
            title: legacyQuestion,
            accepted_answers: [legacyAnswer || ""],
          }),
        ]
      : createDefaultQuiz().questions;

  return {
    ...createDefaultQuiz(),
    ...content,
    schema_version: content.schema_version || QUIZ_SCHEMA_VERSION,
    title: `${content.title ?? "Проверочный тест"}`,
    description: `${content.description ?? ""}`,
    questions,
    grading: {
      ...createDefaultQuiz().grading,
      ...(content.grading || {}),
    },
    behavior: {
      ...createDefaultQuiz().behavior,
      ...(content.behavior || {}),
    },
    ui: {
      ...createDefaultQuiz().ui,
      ...(content.ui || {}),
    },
  };
}

export function calculateQuizTotalPoints(content) {
  const quiz = normalizeQuizContent(content);

  return quiz.questions.reduce((sum, question) => {
    const points = Number(question.points);
    return sum + (Number.isFinite(points) ? Math.max(0, points) : 0);
  }, 0);
}
