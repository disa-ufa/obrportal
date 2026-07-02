import { normalizeQuizContent } from "./quizSchema.js";

function toComparableText(value, question) {
  let text = `${value ?? ""}`;

  if (question?.trim_spaces !== false) {
    text = text.trim();
  }

  if (!question?.case_sensitive) {
    text = text.toLowerCase();
  }

  return text;
}

function normalizeNumberValue(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(String(value).replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function arraysEqualAsSets(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }

  const leftSet = new Set(left.map((item) => `${item}`));
  const rightSet = new Set(right.map((item) => `${item}`));

  if (leftSet.size !== rightSet.size) {
    return false;
  }

  for (const item of leftSet) {
    if (!rightSet.has(item)) {
      return false;
    }
  }

  return true;
}

export function getDefaultQuizAnswer(question) {
  const type = `${question?.type || ""}`.toLowerCase();

  if (type === "multiple_choice") {
    return [];
  }

  if (type === "true_false") {
    return null;
  }

  return "";
}

export function buildInitialQuizAnswers(content) {
  const quiz = normalizeQuizContent(content);

  return quiz.questions.reduce((answers, question) => {
    answers[question.id] = getDefaultQuizAnswer(question);
    return answers;
  }, {});
}

export function gradeQuizQuestion(question, answer) {
  const type = `${question?.type || ""}`.toLowerCase();
  const points = Math.max(0, Number(question?.points) || 0);

  if (type === "single_choice") {
    const correctOption = Array.isArray(question.options)
      ? question.options.find((option) => option.is_correct)
      : null;

    const correct = Boolean(correctOption && `${answer}` === `${correctOption.id}`);

    return {
      question_id: question.id,
      type,
      points,
      earned_points: correct ? points : 0,
      correct,
      correct_answer: correctOption?.text || "",
      user_answer: answer,
    };
  }

  if (type === "multiple_choice") {
    const correctOptionIds = Array.isArray(question.options)
      ? question.options.filter((option) => option.is_correct).map((option) => option.id)
      : [];

    const selectedIds = Array.isArray(answer) ? answer : [];
    const correct = arraysEqualAsSets(selectedIds, correctOptionIds);

    let earnedPoints = 0;

    if (correct) {
      earnedPoints = points;
    } else if (question.scoring_mode !== "all_or_nothing" && correctOptionIds.length > 0) {
      const correctSelected = selectedIds.filter((id) => correctOptionIds.includes(id)).length;
      const wrongSelected = selectedIds.filter((id) => !correctOptionIds.includes(id)).length;
      const rawScore = Math.max(0, correctSelected - wrongSelected) / correctOptionIds.length;
      earnedPoints = Math.round(points * rawScore * 100) / 100;
    }

    return {
      question_id: question.id,
      type,
      points,
      earned_points: earnedPoints,
      correct,
      correct_answer: correctOptionIds,
      user_answer: selectedIds,
    };
  }

  if (type === "true_false") {
    const correct = typeof answer === "boolean" && answer === Boolean(question.correct_value);

    return {
      question_id: question.id,
      type,
      points,
      earned_points: correct ? points : 0,
      correct,
      correct_answer: Boolean(question.correct_value),
      user_answer: answer,
    };
  }

  if (type === "short_text") {
    const acceptedAnswers = Array.isArray(question.accepted_answers)
      ? question.accepted_answers
      : [];

    const userText = toComparableText(answer, question);
    const correct = acceptedAnswers.some(
      (acceptedAnswer) => toComparableText(acceptedAnswer, question) === userText
    );

    return {
      question_id: question.id,
      type,
      points,
      earned_points: correct ? points : 0,
      correct,
      correct_answer: acceptedAnswers,
      user_answer: answer,
    };
  }

  if (type === "number") {
    const correctNumber = normalizeNumberValue(question.correct_number);
    const userNumber = normalizeNumberValue(answer);
    const tolerance = Math.max(0, Number(question.tolerance) || 0);
    const correct =
      correctNumber !== null &&
      userNumber !== null &&
      Math.abs(userNumber - correctNumber) <= tolerance;

    return {
      question_id: question.id,
      type,
      points,
      earned_points: correct ? points : 0,
      correct,
      correct_answer: question.correct_number,
      user_answer: answer,
    };
  }

  return {
    question_id: question?.id || "",
    type,
    points,
    earned_points: 0,
    correct: false,
    correct_answer: null,
    user_answer: answer,
  };
}

export function gradeQuizAttempt(content, answers) {
  const quiz = normalizeQuizContent(content);
  const questionResults = quiz.questions.map((question) =>
    gradeQuizQuestion(question, answers?.[question.id])
  );

  const totalPoints = questionResults.reduce((sum, result) => sum + result.points, 0);
  const earnedPoints = questionResults.reduce((sum, result) => sum + result.earned_points, 0);
  const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passScorePercent = Number(quiz.grading?.pass_score_percent);
  const passed = Number.isFinite(passScorePercent) ? percent >= passScorePercent : false;

  return {
    quiz,
    question_results: questionResults,
    total_points: totalPoints,
    earned_points: earnedPoints,
    percent,
    pass_score_percent: Number.isFinite(passScorePercent) ? passScorePercent : null,
    passed,
    correct_count: questionResults.filter((result) => result.correct).length,
    question_count: questionResults.length,
  };
}
