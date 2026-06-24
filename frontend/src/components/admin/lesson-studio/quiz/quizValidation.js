import {
  QUIZ_QUESTION_TYPES,
  calculateQuizTotalPoints,
  normalizeQuizContent,
} from "./quizSchema.js";

const SUPPORTED_TYPES = new Set(QUIZ_QUESTION_TYPES.map((item) => item.value));

function hasText(value) {
  return `${value ?? ""}`.trim().length > 0;
}

function isFiniteNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }

  return Number.isFinite(Number(value));
}

function validateChoiceQuestion(question, index, issues) {
  const label = `Вопрос ${index + 1}`;

  if (!Array.isArray(question.options) || question.options.length < 2) {
    issues.push(`${label}: добавьте минимум 2 варианта ответа`);
    return;
  }

  const filledOptions = question.options.filter((option) => hasText(option.text));
  const correctOptions = question.options.filter((option) => option.is_correct);

  if (filledOptions.length < 2) {
    issues.push(`${label}: заполните текст минимум у 2 вариантов ответа`);
  }

  if (question.type === "single_choice" && correctOptions.length !== 1) {
    issues.push(`${label}: для вопроса с одним ответом должен быть ровно 1 правильный вариант`);
  }

  if (question.type === "multiple_choice" && correctOptions.length < 1) {
    issues.push(`${label}: отметьте хотя бы 1 правильный вариант`);
  }
}

function validateTrueFalseQuestion(question, index, issues) {
  if (typeof question.correct_value !== "boolean") {
    issues.push(`Вопрос ${index + 1}: выберите правильное значение "Верно" или "Неверно"`);
  }
}

function validateShortTextQuestion(question, index, issues) {
  const answers = Array.isArray(question.accepted_answers)
    ? question.accepted_answers
    : [];

  if (!answers.some((answer) => hasText(answer))) {
    issues.push(`Вопрос ${index + 1}: добавьте хотя бы один допустимый текстовый ответ`);
  }
}

function validateNumberQuestion(question, index, issues) {
  if (!isFiniteNumber(question.correct_number)) {
    issues.push(`Вопрос ${index + 1}: укажите правильный числовой ответ`);
  }

  if (!isFiniteNumber(question.tolerance) || Number(question.tolerance) < 0) {
    issues.push(`Вопрос ${index + 1}: погрешность должна быть числом не меньше 0`);
  }
}

export function validateQuizContent(content) {
  const quiz = normalizeQuizContent(content);
  const issues = [];
  const warnings = [];

  if (!hasText(quiz.title)) {
    issues.push("У теста нет названия");
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    issues.push("Добавьте хотя бы один вопрос");
  }

  const passScore = Number(quiz.grading?.pass_score_percent);
  if (!Number.isFinite(passScore) || passScore < 0 || passScore > 100) {
    issues.push("Проходной балл должен быть от 0 до 100%");
  }

  if (quiz.behavior?.allow_retry) {
    const maxAttempts = Number(quiz.behavior?.max_attempts);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      issues.push("Количество попыток должно быть целым числом от 1");
    }
  }

  quiz.questions.forEach((question, index) => {
    const label = `Вопрос ${index + 1}`;

    if (!SUPPORTED_TYPES.has(question.type)) {
      issues.push(`${label}: неизвестный тип вопроса`);
    }

    if (!hasText(question.title)) {
      issues.push(`${label}: заполните текст вопроса`);
    }

    const points = Number(question.points);
    if (!Number.isFinite(points) || points <= 0) {
      issues.push(`${label}: баллы должны быть числом больше 0`);
    }

    if (question.type === "single_choice" || question.type === "multiple_choice") {
      validateChoiceQuestion(question, index, issues);
    }

    if (question.type === "true_false") {
      validateTrueFalseQuestion(question, index, issues);
    }

    if (question.type === "short_text") {
      validateShortTextQuestion(question, index, issues);
    }

    if (question.type === "number") {
      validateNumberQuestion(question, index, issues);
    }
  });

  const totalPoints = calculateQuizTotalPoints(quiz);
  if (totalPoints <= 0) {
    issues.push("Суммарное количество баллов должно быть больше 0");
  }

  if (quiz.questions.length > 0 && quiz.questions.length < 3) {
    warnings.push("Для полноценной проверки обычно лучше добавить не менее 3 вопросов");
  }

  return {
    quiz,
    isValid: issues.length === 0,
    issues,
    warnings,
    questionCount: quiz.questions.length,
    totalPoints,
  };
}

export function getQuizReadinessLabel(content) {
  const result = validateQuizContent(content);

  if (result.isValid) {
    return `Готово: ${result.questionCount} вопрос(ов), ${result.totalPoints} балл(ов)`;
  }

  return `Нужно исправить: ${result.issues.length} замечание(й)`;
}

