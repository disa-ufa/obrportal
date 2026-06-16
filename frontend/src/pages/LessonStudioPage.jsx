import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminLessonBlock,
  deleteAdminLessonBlock,
  getAdminCourseLessonDetail,
  getAdminLessonBlocks,
  reorderAdminLessonBlocks,
  updateAdminLessonBlock,
} from "../api/client";
import { LessonBlocksEditor } from "../components/admin/LessonBlocksEditor";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

function formatLessonStudioError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);

  return [status, message || fallback].filter(Boolean).join(" ");
}

const STUDIO_QUICK_BLOCK_TEMPLATES = [
  {
    key: "rich_text",
    label: "Текст",
    hint: "Короткий учебный материал",
    tone: "blue",
    values: {
      block_type: "rich_text",
      title: "Текстовый блок",
      content_json: { text: "Добавьте текст урока." },
      is_required: true,
      is_active: true,
    },
  },
  {
    key: "video",
    label: "Видео",
    hint: "Ссылка на видеоурок",
    tone: "green",
    values: {
      block_type: "video",
      title: "Видео",
      content_json: { url: "" },
      is_required: true,
      is_active: true,
    },
  },
  {
    key: "file_link",
    label: "Файл/ссылка",
    hint: "Материал, PDF или презентация",
    tone: "blue",
    values: {
      block_type: "file_link",
      title: "Файл или ссылка",
      content_json: { url: "" },
      is_required: false,
      is_active: true,
    },
  },
  {
    key: "quiz",
    label: "Тест",
    hint: "Вопрос с вариантами",
    tone: "amber",
    values: {
      block_type: "quiz",
      title: "Тест",
      content_json: { question: "Введите вопрос." },
      is_required: true,
      is_active: true,
    },
  },
  {
    key: "assignment",
    label: "Задание",
    hint: "Практическая работа",
    tone: "red",
    values: {
      block_type: "assignment",
      title: "Задание",
      content_json: { description: "Опишите задание для слушателя." },
      is_required: true,
      is_active: true,
    },
  },
  {
    key: "callout",
    label: "Врезка",
    hint: "Важное примечание",
    tone: "violet",
    values: {
      block_type: "callout",
      title: "Важно",
      content_json: { text: "Добавьте важное примечание." },
      is_required: false,
      is_active: true,
    },
  },
];

function getNextStudioBlockPosition(blocks) {
  const positions = blocks
    .map((block) => Number(block.position))
    .filter((position) => Number.isFinite(position));

  return positions.length ? Math.max(...positions) + 1 : blocks.length + 1;
}

function buildStudioQuickBlockPayload(template, position) {
  return {
    block_type: template.values.block_type || "rich_text",
    title: template.values.title || null,
    content_json: template.values.content_json || {},
    position,
    is_required: Boolean(template.values.is_required),
    is_active: template.values.is_active !== false,
  };
}

function buildDuplicateStudioBlockPayload(block, position) {
  const title = `${block?.title || getLessonBlockTypeLabel(block?.block_type) || "Блок"}`.trim();

  return {
    block_type: block?.block_type || "rich_text",
    title: `${title} — копия`,
    content_json: safeParseJson(block?.content_json),
    position,
    is_required: Boolean(block?.is_required),
    is_active: block?.is_active !== false,
  };
}



function safeParseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getLessonContentTypeLabel(type) {
  const value = `${type || "text"}`.toLowerCase();

  const labels = {
    text: "Текст",
    video: "Видео",
    file: "Файл",
    link: "Ссылка",
    quiz: "Тест",
    assignment: "Задание",
  };

  return labels[value] || value;
}

function getLessonBlockTypeLabel(type) {
  const value = `${type || "rich_text"}`.toLowerCase();

  const labels = {
    rich_text: "Текст",
    text: "Текст",
    video: "Видео",
    file_link: "Файл/ссылка",
    file: "Файл",
    link: "Ссылка",
    quiz: "Тест",
    assignment: "Задание",
    callout: "Врезка",
  };

  return labels[value] || value;
}

function getLessonBlockTone(type) {
  const value = `${type || "rich_text"}`.toLowerCase();

  if (value === "video") return "green";
  if (value === "file_link" || value === "file" || value === "link") return "blue";
  if (value === "quiz") return "amber";
  if (value === "assignment") return "red";
  if (value === "callout") return "violet";

  return "slate";
}

function getBadgeClass(tone) {
  const classes = {
    green: "bg-green-50 text-green-700 ring-green-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };

  return classes[tone] || classes.slate;
}

function LessonStudioBadge({ tone = "slate", children }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getBadgeClass(tone)}`}>
      {children}
    </span>
  );
}

function getBlockDisplayTitle(block, index = 0) {
  const content = safeParseJson(block?.content_json);
  const title = `${block?.title || content.title || ""}`.trim();

  if (title) {
    return title;
  }

  return `${getLessonBlockTypeLabel(block?.block_type)} ${index + 1}`;
}

function getBlockTextPreview(block) {
  const content = safeParseJson(block?.content_json);
  const settings = safeParseJson(block?.settings_json);

  const candidates = [
    content.text,
    content.content_text,
    content.body,
    content.description,
    content.url,
    content.content_url,
    content.question,
    content.quiz_question,
    content.assignment_text,
    settings.description,
  ];

  const value = candidates
    .map((item) => `${item || ""}`.trim())
    .find(Boolean);

  return value || "Контент блока пока не заполнен.";
}

function getBlockPreviewMeta(block) {
  const type = `${block?.block_type || "rich_text"}`.toLowerCase();

  const metaByType = {
    rich_text: {
      icon: "TXT",
      kicker: "Учебный текст",
      description: "Основной материал урока для чтения.",
      surfaceClass: "bg-slate-50 text-slate-700 ring-slate-200",
    },
    text: {
      icon: "TXT",
      kicker: "Учебный текст",
      description: "Основной материал урока для чтения.",
      surfaceClass: "bg-slate-50 text-slate-700 ring-slate-200",
    },
    video: {
      icon: "▶",
      kicker: "Предпросмотр видео",
      description: "Видео-блок должен содержать ссылку на ролик или запись урока.",
      surfaceClass: "bg-green-50 text-green-900 ring-green-200",
    },
    file_link: {
      icon: "↗",
      kicker: "Материал для перехода",
      description: "Ссылка на файл, презентацию, документ или внешний ресурс.",
      surfaceClass: "bg-blue-50 text-blue-900 ring-blue-200",
    },
    file: {
      icon: "↗",
      kicker: "Материал для перехода",
      description: "Ссылка на файл, презентацию, документ или внешний ресурс.",
      surfaceClass: "bg-blue-50 text-blue-900 ring-blue-200",
    },
    link: {
      icon: "↗",
      kicker: "Материал для перехода",
      description: "Ссылка на файл, презентацию, документ или внешний ресурс.",
      surfaceClass: "bg-blue-50 text-blue-900 ring-blue-200",
    },
    quiz: {
      icon: "?",
      kicker: "Вопрос для самопроверки",
      description: "Тестовый блок помогает проверить понимание материала.",
      surfaceClass: "bg-amber-50 text-amber-900 ring-amber-200",
    },
    assignment: {
      icon: "✓",
      kicker: "Практическое задание",
      description: "Задание фиксирует, что должен выполнить слушатель.",
      surfaceClass: "bg-red-50 text-red-900 ring-red-200",
    },
    callout: {
      icon: "!",
      kicker: "Важное примечание",
      description: "Врезка выделяет ключевую мысль, предупреждение или подсказку.",
      surfaceClass: "bg-violet-50 text-violet-900 ring-violet-200",
    },
  };

  return metaByType[type] || metaByType.rich_text;
}

function LessonCanvasTypePreview({ block, preview }) {
  const type = `${block?.block_type || "rich_text"}`.toLowerCase();
  const meta = getBlockPreviewMeta(block);
  const isEmpty = preview === "Контент блока пока не заполнен.";

  const previewValue = isEmpty ? "Заполните содержимое справа в инспекторе." : preview;

  return (
    <div
      data-testid="lesson-studio-canvas-type-preview"
      className={`mt-4 rounded-2xl p-4 text-sm leading-6 ring-1 ${meta.surfaceClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-xs font-black shadow-sm ring-1 ring-black/5">
          {meta.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide opacity-75">
            {meta.kicker}
          </div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            {meta.description}
          </div>
        </div>
      </div>

      {type === "video" ? (
        <div
          data-testid="lesson-studio-video-preview"
          className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-slate-900 text-white">
              ▶
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Видео для просмотра</div>
              <div className="mt-1 break-words text-xs opacity-80">{previewValue}</div>
            </div>
          </div>
        </div>
      ) : type === "file_link" || type === "file" || type === "link" ? (
        <div
          data-testid="lesson-studio-link-preview"
          className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Открыть материал</div>
          <div className="mt-1 break-words text-xs opacity-80">{previewValue}</div>
        </div>
      ) : type === "quiz" ? (
        <div
          data-testid="lesson-studio-quiz-preview"
          className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Вопрос</div>
          <div className="mt-1 text-sm">{previewValue}</div>
          <div className="mt-3 rounded-xl bg-amber-100/70 px-3 py-2 text-xs font-semibold">
            Варианты ответов добавим следующим этапом.
          </div>
        </div>
      ) : type === "assignment" ? (
        <div
          data-testid="lesson-studio-assignment-preview"
          className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Что нужно сделать</div>
          <div className="mt-1 text-sm">{previewValue}</div>
        </div>
      ) : type === "callout" ? (
        <div
          data-testid="lesson-studio-callout-preview"
          className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Важно</div>
          <div className="mt-1 text-sm">{previewValue}</div>
        </div>
      ) : (
        <div
          data-testid="lesson-studio-text-preview"
          className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-black/5"
        >
          {previewValue}
        </div>
      )}
    </div>
  );
}


function getBlockValidationIssues(block) {
  const type = `${block?.block_type || "rich_text"}`.toLowerCase();
  const content = safeParseJson(block?.content_json);
  const issues = [];

  if (!`${block?.title || content.title || ""}`.trim()) {
    issues.push("нет заголовка");
  }

  if ((type === "rich_text" || type === "text" || type === "callout") && !`${content.text || content.content_text || ""}`.trim()) {
    issues.push("нет текста");
  }

  if ((type === "video" || type === "file_link" || type === "file" || type === "link") && !`${content.url || content.content_url || ""}`.trim()) {
    issues.push("нет ссылки");
  }

  if (type === "quiz") {
    if (!`${content.question || content.quiz_question || ""}`.trim()) {
      issues.push("нет вопроса");
    }
    if (!`${content.answer || content.quiz_answer || ""}`.trim()) {
      issues.push("нет правильного ответа");
    }
  }

  if (type === "assignment" && !`${content.text || content.content_text || content.assignment_text || ""}`.trim()) {
    issues.push("нет задания");
  }

  return issues;
}


function getLessonReadinessReport(lesson, blocks) {
  const allBlocks = Array.isArray(blocks) ? blocks : [];
  const activeBlocks = allBlocks.filter((block) => block.is_active !== false);
  const inactiveBlocks = allBlocks.filter((block) => block.is_active === false);
  const requiredBlocks = activeBlocks.filter((block) => block.is_required);

  const problemBlocks = activeBlocks
    .map((block, index) => {
      const originalIndex = allBlocks.findIndex((item) => item.id === block.id);
      const normalizedIndex = originalIndex >= 0 ? originalIndex : index;
      const issues = getBlockValidationIssues(block);

      return {
        block,
        index: normalizedIndex,
        title: getBlockDisplayTitle(block, normalizedIndex),
        issues,
      };
    })
    .filter((item) => item.issues.length > 0);

  const requiredProblemBlocks = problemBlocks.filter((item) => item.block.is_required);

  const checklistItems = [
    {
      key: "has-blocks",
      label: "В урок добавлены блоки",
      detail: allBlocks.length
        ? `Всего блоков: ${allBlocks.length}.`
        : "Добавьте хотя бы один блок урока.",
      ok: allBlocks.length > 0,
      blocking: true,
    },
    {
      key: "has-active-blocks",
      label: "Есть активные блоки для обучающегося",
      detail: activeBlocks.length
        ? `Активных блоков: ${activeBlocks.length}.`
        : "Все блоки скрыты или урок пока пустой.",
      ok: activeBlocks.length > 0,
      blocking: true,
    },
    {
      key: "active-content",
      label: "Активные блоки заполнены",
      detail: problemBlocks.length
        ? `Требуют заполнения: ${problemBlocks.length}.`
        : "Все активные блоки имеют необходимые данные.",
      ok: problemBlocks.length === 0,
      blocking: true,
    },
    {
      key: "required-content",
      label: "Обязательные блоки готовы",
      detail: requiredProblemBlocks.length
        ? `Обязательные с проблемами: ${requiredProblemBlocks.length}.`
        : requiredBlocks.length
          ? `Готовых обязательных блоков: ${requiredBlocks.length}.`
          : "Обязательных активных блоков нет.",
      ok: requiredProblemBlocks.length === 0,
      blocking: true,
    },
    {
      key: "inactive-reviewed",
      label: "Скрытые блоки учтены",
      detail: inactiveBlocks.length
        ? `Скрытых блоков: ${inactiveBlocks.length}. Они не попадут в предпросмотр.`
        : "Скрытых блоков нет.",
      ok: true,
      blocking: false,
      warning: inactiveBlocks.length > 0,
    },
  ];

  const blockingIssues = checklistItems.filter((item) => item.blocking && !item.ok);
  const ready = blockingIssues.length === 0;

  return {
    ready,
    tone: ready ? "green" : activeBlocks.length ? "amber" : "red",
    title: ready ? "Готов к публикации" : "Требует доработки",
    description: ready
      ? "Урок можно показывать обучающимся: активные блоки заполнены."
      : "Перед публикацией исправьте пункты чеклиста и проблемные блоки.",
    totalBlocks: allBlocks.length,
    activeBlocks: activeBlocks.length,
    inactiveBlocks: inactiveBlocks.length,
    requiredBlocks: requiredBlocks.length,
    problemBlocks,
    requiredProblemBlocks,
    checklistItems,
    blockingIssues,
  };
}

function LessonStudioReadinessChecklist({ report, onSelectBlock, onModeChange }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!report) {
    return null;
  }

  const statusClass = report.ready
    ? "bg-green-50 text-green-900 ring-green-200"
    : report.tone === "red"
      ? "bg-red-50 text-red-900 ring-red-200"
      : "bg-amber-50 text-amber-950 ring-amber-200";

  const problemLabel = report.problemBlocks.length
    ? `${report.problemBlocks.length} проблем`
    : "без проблем";

  return (
    <section
      data-testid="lesson-studio-readiness-checklist"
      className={`rounded-[1.5rem] p-3 shadow-sm ring-1 ${statusClass}`}
    >
      <div
        data-testid="lesson-studio-readiness-summary"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide opacity-80">
            Готовность урока
          </div>
          <div
            data-testid="lesson-studio-readiness-status"
            className="mt-1 flex flex-wrap items-center gap-2"
          >
            <span className="text-base font-black text-slate-950">
              {report.title}
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold ring-1 ring-black/5">
              {problemLabel}
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold ring-1 ring-black/5">
              Активных: {report.activeBlocks}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="lesson-studio-readiness-toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="rounded-full bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
        >
          {isOpen ? "Скрыть детали" : "Показать детали"}
        </button>
      </div>

      {isOpen ? (
        <div
          data-testid="lesson-studio-readiness-panel"
          className="mt-4 border-t border-black/10 pt-4"
        >
          <p className="text-sm leading-6">{report.description}</p>

          <div
            data-testid="lesson-studio-readiness-items"
            className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5"
          >
            {report.checklistItems.map((item) => {
              const itemClass = item.ok
                ? item.warning
                  ? "bg-slate-50 text-slate-800 ring-slate-200"
                  : "bg-white/80 text-green-900 ring-green-100"
                : item.blocking
                  ? "bg-white text-red-900 ring-red-200"
                  : "bg-white text-amber-900 ring-amber-200";

              return (
                <div
                  key={item.key}
                  data-testid="lesson-studio-readiness-item"
                  className={`rounded-2xl p-3 text-sm ring-1 ${itemClass}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black ring-1 ring-black/5">
                      {item.ok ? "✓" : "!"}
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-slate-950">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 opacity-80">{item.detail}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {report.problemBlocks.length ? (
            <div
              data-testid="lesson-studio-readiness-problems"
              className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
            >
              <div className="text-sm font-black text-slate-950">
                Проблемные блоки
              </div>
              <div className="mt-2 space-y-2">
                {report.problemBlocks.map((item) => (
                  <div
                    key={item.block.id}
                    data-testid="lesson-studio-readiness-problem"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-100"
                  >
                    <div className="min-w-0">
                      <div className="font-bold">
                        #{item.block.position || item.index + 1} · {item.title}
                      </div>
                      <div className="mt-1 text-xs">
                        Нужно заполнить: {item.issues.join(", ")}.
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="lesson-studio-readiness-problem-jump"
                      onClick={() => {
                        if (typeof onModeChange === "function") {
                          onModeChange("editor");
                        }

                        if (typeof onSelectBlock === "function") {
                          onSelectBlock(item.block.id);
                        }
                      }}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                    >
                      Перейти к блоку
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              data-testid="lesson-studio-readiness-ready"
              className="mt-4 rounded-2xl bg-white/80 p-3 text-sm font-bold text-green-900 ring-1 ring-green-100"
            >
              Активные блоки готовы. Можно проверить урок в режиме предпросмотра.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function LessonStudioTopbar({ lesson, blocks, loading, blocksLoading, error, mode = "editor", onModeChange, onReload }) {
  const requiredBlocks = blocks.filter((block) => block.is_required).length;
  const activeBlocks = blocks.filter((block) => block.is_active !== false).length;
  const inactiveBlocks = Math.max(blocks.length - activeBlocks, 0);
  const statusLabel = loading || blocksLoading ? "Обновление" : "Черновик";
  const courseId =
    lesson?.course_id ||
    lesson?.courseId ||
    lesson?.course?.id ||
    lesson?.course?.course_id ||
    "";

  const courseHref = courseId ? `/admin/courses#course-${courseId}` : "/admin/courses";
  const previewMode = mode === "preview";

  return (
    <section
      data-testid="lesson-studio-topbar"
      className="sticky top-4 z-20 rounded-[2rem] bg-white/95 p-5 shadow-sm ring-1 ring-slate-200 backdrop-blur"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <a
              href="/admin/courses"
              data-testid="lesson-studio-back-to-courses"
              className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 transition hover:bg-white hover:text-blue-700"
            >
              ← К программам
            </a>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 ring-1 ring-blue-100">
              Lesson Studio
            </span>
          </div>

          <h1
            data-testid="lesson-studio-title"
            className="mt-3 truncate text-2xl font-black text-slate-950"
          >
            {lesson?.title || "Студия урока"}
          </h1>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div
            data-testid="lesson-studio-quick-actions"
            className="flex flex-wrap justify-start gap-2 sm:justify-end"
          >
            <div
              data-testid="lesson-studio-mode-switcher"
              className="flex rounded-full bg-slate-100 p-1 ring-1 ring-slate-200"
            >
              <button
                type="button"
                data-testid="lesson-studio-editor-mode-button"
                onClick={() => onModeChange("editor")}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  !previewMode
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-blue-700"
                }`}
              >
                Редактор
              </button>

              <button
                type="button"
                data-testid="lesson-studio-preview-mode-button"
                onClick={() => onModeChange("preview")}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  previewMode
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-blue-700"
                }`}
              >
                Предпросмотр
              </button>
            </div>

            <button
              type="button"
              data-testid="lesson-studio-reload-button"
              onClick={onReload}
              disabled={loading || blocksLoading}
              className="rounded-full bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || blocksLoading ? "Обновляем..." : "Обновить"}
            </button>

            <a
              href={courseHref}
              data-testid="lesson-studio-open-course-button"
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-blue-700 hover:ring-blue-200"
            >
              К курсу
            </a>
          </div>

          <div
            data-testid="lesson-studio-status-strip"
            className="flex flex-wrap justify-start gap-2 sm:justify-end"
          >
            <LessonStudioBadge tone={previewMode ? "blue" : "slate"}>
              {previewMode ? "Предпросмотр" : "Редактор"}
            </LessonStudioBadge>
            <LessonStudioBadge tone={loading || blocksLoading ? "amber" : "slate"}>
              {statusLabel}
            </LessonStudioBadge>
            <LessonStudioBadge tone="blue">
              {lesson ? getLessonContentTypeLabel(lesson.content_type) : "Урок"}
            </LessonStudioBadge>
            <LessonStudioBadge tone={lesson?.is_required ? "green" : "slate"}>
              {lesson?.is_required ? "Обязательный" : "Дополнительный"}
            </LessonStudioBadge>
            <LessonStudioBadge tone={lesson?.is_active === false ? "slate" : "green"}>
              {lesson?.is_active === false ? "Скрыт" : "Активен"}
            </LessonStudioBadge>
            <LessonStudioBadge tone="violet">
              Блоков: {blocks.length}
            </LessonStudioBadge>
            <LessonStudioBadge tone="green">
              Активных: {activeBlocks}
            </LessonStudioBadge>
            <LessonStudioBadge tone="amber">
              Обязательных: {requiredBlocks}
            </LessonStudioBadge>
            {inactiveBlocks ? (
              <LessonStudioBadge tone="slate">
                Скрытых: {inactiveBlocks}
              </LessonStudioBadge>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div
          data-testid="lesson-studio-topbar-error"
          className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200"
        >
          <div className="font-semibold">Не удалось загрузить данные студии.</div>
          <div className="mt-1">{error}</div>
          <button
            type="button"
            onClick={onReload}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Повторить загрузку
          </button>
        </div>
      ) : null}
    </section>
  );
}

function LessonStudioStructurePanel({
  lesson,
  blocks,
  selectedBlockId,
  onSelectBlock,
  mode = "editor",
  quickAddTemplates = [],
  onCreateBlock,
  creatingTemplateKey,
  quickAddDisabled = false,
}) {
  const previewMode = mode === "preview";
  const requiredBlocks = blocks.filter((block) => block.is_required).length;
  const activeBlocks = blocks.filter((block) => block.is_active !== false).length;
  const problemBlocks = blocks.filter((block) => getBlockValidationIssues(block).length > 0);
  const readyBlocks = Math.max(blocks.length - problemBlocks.length, 0);

  return (
    <aside
      data-testid="lesson-studio-structure"
      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Структура
          </div>
          <h2 className="mt-1 text-sm font-bold text-slate-900">
            Навигация урока
          </h2>
        </div>

        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
          {blocks.length}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Компактная карта урока. Нажмите на блок — студия выделит его,
        плавно перейдёт к карточке на полотне и покажет свойства справа.
      </p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs font-semibold text-slate-500">Текущий урок</div>
        <div className="mt-1 text-sm font-bold text-slate-900">
          {lesson?.title || "Урок загружается"}
        </div>
      </div>

      {!previewMode ? (
        <LessonStudioSidebarQuickAdd
          templates={quickAddTemplates}
          onCreateBlock={onCreateBlock}
          creatingTemplateKey={creatingTemplateKey}
          disabled={quickAddDisabled}
        />
      ) : null}

      <div
        data-testid="lesson-studio-structure-stats"
        className="mt-4 grid grid-cols-2 gap-2"
      >
        <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-blue-600">
            Всего
          </div>
          <div className="mt-1 text-lg font-black text-blue-950">{blocks.length}</div>
        </div>

        <div className="rounded-2xl bg-green-50 p-3 ring-1 ring-green-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-green-700">
            Готово
          </div>
          <div className="mt-1 text-lg font-black text-green-950">{readyBlocks}</div>
        </div>

        <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
            Обязательные
          </div>
          <div className="mt-1 text-lg font-black text-amber-950">{requiredBlocks}</div>
        </div>

        <div className="rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-red-700">
            Незаполненных
          </div>
          <div className="mt-1 text-lg font-black text-red-950">{problemBlocks.length}</div>
        </div>
      </div>

      {activeBlocks !== blocks.length ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
          Активных блоков: <span className="font-bold text-slate-900">{activeBlocks}</span>
          {" "}из <span className="font-bold text-slate-900">{blocks.length}</span>.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {blocks.length ? (
          blocks.map((block, index) => {
            const selected = block.id === selectedBlockId;
            const issues = getBlockValidationIssues(block);
            const hasIssues = issues.length > 0;

            return (
              <button
                key={block.id}
                type="button"
                data-testid="lesson-studio-structure-block"
                onClick={() => onSelectBlock(block.id)}
                className={`w-full rounded-2xl p-3 text-left ring-1 transition ${
                  selected
                    ? "bg-blue-50 ring-blue-300"
                    : hasIssues
                      ? "bg-amber-50/70 ring-amber-200 hover:bg-amber-50"
                      : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #{block.position || index + 1} · {getLessonBlockTypeLabel(block.block_type)}
                  </span>

                  {hasIssues ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-200">
                      !
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-black text-green-700 ring-1 ring-green-200">
                      ✓
                    </span>
                  )}
                </div>

                <div className="mt-1 truncate text-sm font-bold text-slate-900">
                  {getBlockDisplayTitle(block, index)}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {block.is_required ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-100">
                      обязательный
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      доп.
                    </span>
                  )}

                  {block.is_active === false ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      скрыт
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                      активен
                    </span>
                  )}
                </div>

                {hasIssues ? (
                  <div
                    data-testid="lesson-studio-structure-block-issues"
                    className="mt-2 rounded-xl bg-white/80 px-2.5 py-2 text-xs leading-5 text-amber-900 ring-1 ring-amber-100"
                  >
                    Нужно: {issues.join(", ")}
                  </div>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
            Блоки урока пока не добавлены.
          </div>
        )}
      </div>
    </aside>
  );
}

function LessonCanvasBlock({
  block,
  index,
  previewMode = false,
  selected,
  canMoveUp,
  canMoveDown,
  moving,
  duplicating,
  deleting,
  disabled,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}) {
  const issues = getBlockValidationIssues(block);
  const typeTone = getLessonBlockTone(block.block_type);
  const title = getBlockDisplayTitle(block, index);
  const preview = getBlockTextPreview(block);
  const busy = disabled || moving || duplicating || deleting;

  const handleMoveClick = (event, direction) => {
    event.stopPropagation();

    if (busy) {
      return;
    }

    onMove(block, direction);
  };

  const handleDuplicateClick = (event) => {
    event.stopPropagation();

    if (busy) {
      return;
    }

    onDuplicate(block);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();

    if (busy) {
      return;
    }

    onDelete(block);
  };

  return (
    <article
      id={`studio-block-${block.id}`}
      data-testid="lesson-studio-canvas-block"
      className={`rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 transition ${
        !previewMode && selected ? "ring-blue-300" : "ring-slate-200 hover:ring-blue-200"
      }`}
      onClick={() => {
        if (!previewMode) {
          onSelect(block.id);
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            #{block.position || index + 1} · {getLessonBlockTypeLabel(block.block_type)}
          </div>
          <h3 className="mt-1 text-lg font-black text-slate-900">{title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LessonStudioBadge tone={typeTone}>
            {getLessonBlockTypeLabel(block.block_type)}
          </LessonStudioBadge>
          <LessonStudioBadge tone={block.is_required ? "green" : "slate"}>
            {block.is_required ? "Обязательный" : "Дополнительный"}
          </LessonStudioBadge>
          <LessonStudioBadge tone={block.is_active === false ? "slate" : "green"}>
            {block.is_active === false ? "Скрыт" : "Активен"}
          </LessonStudioBadge>
        </div>
      </div>

      <div
        data-testid="lesson-studio-block-order-controls"
        className={previewMode ? "hidden" : "mt-4 flex flex-wrap items-center gap-2"}
      >
        <button
          type="button"
          data-testid="lesson-studio-move-up-button"
          onClick={(event) => handleMoveClick(event, "up")}
          disabled={!canMoveUp || busy}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↑ Выше
        </button>

        <button
          type="button"
          data-testid="lesson-studio-move-down-button"
          onClick={(event) => handleMoveClick(event, "down")}
          disabled={!canMoveDown || busy}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↓ Ниже
        </button>

        <button
          type="button"
          data-testid="lesson-studio-duplicate-button"
          onClick={handleDuplicateClick}
          disabled={busy}
          className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Дублировать
        </button>

        <button
          type="button"
          data-testid="lesson-studio-delete-button"
          onClick={handleDeleteClick}
          disabled={busy}
          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Удалить
        </button>

        {moving ? (
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
            Меняем порядок...
          </span>
        ) : null}

        {duplicating ? (
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
            Дублируем...
          </span>
        ) : null}

        {deleting ? (
          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
            Удаляем...
          </span>
        ) : null}
      </div>

      {!previewMode && issues.length ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Нужно заполнить: {issues.join(", ")}.
        </div>
      ) : null}

      <LessonCanvasTypePreview block={block} preview={preview} />
    </article>
  );
}

function LessonStudioSidebarQuickAdd({
  templates,
  onCreateBlock,
  creatingTemplateKey,
  disabled,
}) {
  return (
    <details
      data-testid="lesson-studio-sidebar-quick-add"
      className="mt-4 rounded-2xl bg-blue-50/60 p-3 ring-1 ring-blue-100"
      open
    >
      <summary className="cursor-pointer text-sm font-black text-slate-950">
        + Добавить блок
      </summary>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Выберите тип блока — он появится на полотне и откроется для настройки.
      </p>

      <div className="mt-3 grid gap-2">
        {templates.map((template) => {
          const creating = creatingTemplateKey === template.key;

          return (
            <button
              key={template.key}
              type="button"
              data-testid="lesson-studio-sidebar-quick-add-button"
              onClick={() => onCreateBlock(template)}
              disabled={disabled || creating}
              className="rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:bg-blue-50 hover:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-950">
                  {creating ? "Добавляем..." : `+ ${template.label}`}
                </span>

                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {getLessonBlockTypeLabel(template.values?.block_type)}
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {template.hint}
              </p>
            </button>
          );
        })}
      </div>
    </details>
  );
}

function LessonStudioQuickAddPanel({ templates, onCreateBlock, creatingTemplateKey, disabled }) {
  return (
    <section
      data-testid="lesson-studio-quick-add"
      className="rounded-[1.5rem] bg-white p-4 ring-1 ring-blue-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 83.2.5 · Quick add
          </div>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Добавить блок
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Создайте типовой блок прямо на полотне. После добавления он сразу
            откроется в инспекторе справа.
          </p>
        </div>

        <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
          Быстрое наполнение
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const creating = creatingTemplateKey === template.key;

          return (
            <button
              key={template.key}
              type="button"
              data-testid="lesson-studio-quick-add-button"
              onClick={() => onCreateBlock(template)}
              disabled={disabled || creating}
              className="rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:bg-white hover:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-900">
                  + {template.label}
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {getLessonBlockTypeLabel(template.values.block_type)}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {template.hint}
              </p>

              {creating ? (
                <div className="mt-3 text-xs font-semibold text-blue-600">
                  Создаём блок...
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LessonStudioCanvas({
  blocks,
  mode = "editor",
  selectedBlockId,
  onSelectBlock,
  onRefreshBlocks,
  onCreateBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  creatingTemplateKey,
  movingBlockId,
  duplicatingBlockId,
  deletingBlockId,
  blocksLoading,
}) {
  const previewMode = mode === "preview";
  const visibleBlocks = previewMode
    ? blocks.filter((block) => block.is_active !== false)
    : blocks;

  return (
    <section data-testid="lesson-studio-visual-canvas" className="space-y-3">

      {previewMode ? (
        <section
          data-testid="lesson-studio-preview-banner"
          className="rounded-[1.5rem] bg-green-50 p-4 text-sm leading-6 text-green-900 ring-1 ring-green-200"
        >
          <div className="text-xs font-bold uppercase tracking-wide text-green-700">
            Предпросмотр глазами обучающегося
          </div>
          <div className="mt-1">
            Административные действия скрыты. На полотне показаны только активные
            блоки урока.
          </div>
        </section>
      ) : null}

      {visibleBlocks.length ? (
        <div className="space-y-3">
          {visibleBlocks.map((block, index) => (
            <LessonCanvasBlock
              key={block.id}
              block={block}
              index={index}
              previewMode={previewMode}
              selected={block.id === selectedBlockId}
              canMoveUp={index > 0}
              canMoveDown={index < visibleBlocks.length - 1}
              moving={movingBlockId === block.id}
              duplicating={duplicatingBlockId === block.id}
              deleting={deletingBlockId === block.id}
              disabled={
                blocksLoading ||
                Boolean(movingBlockId) ||
                Boolean(duplicatingBlockId) ||
                Boolean(deletingBlockId)
              }
              onSelect={onSelectBlock}
              onMove={onMoveBlock}
              onDuplicate={onDuplicateBlock}
              onDelete={onDeleteBlock}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-dashed ring-slate-300">
{previewMode ? "В предпросмотре нет активных блоков." : "Урок пока пустой. Добавьте первый блок через левую панель."}
        </div>
      )}
    </section>
  );
}

function getInspectorContentText(block) {
  const content =
    block?.content_json && typeof block.content_json === "object"
      ? block.content_json
      : {};

  return `${content.text ?? content.body ?? content.description ?? content.question ?? content.url ?? ""}`;
}

function getInspectorContentFieldMeta(block) {
  const type = `${block?.block_type || "rich_text"}`.toLowerCase();

  const defaults = {
    label: "Текст блока",
    placeholder: "Добавьте основной текст учебного блока",
    help: "Этот текст увидит слушатель в карточке урока.",
    rows: 7,
    inputType: "textarea",
  };

  const metaByType = {
    rich_text: defaults,
    text: defaults,
    callout: {
      label: "Текст примечания",
      placeholder: "Добавьте важное примечание или подсказку",
      help: "Короткая врезка помогает выделить важную мысль внутри урока.",
      rows: 5,
      inputType: "textarea",
    },
    video: {
      label: "Ссылка на видео",
      placeholder: "https://...",
      help: "Укажите ссылку на видеоурок. После сохранения ссылка попадёт в содержимое блока.",
      rows: 1,
      inputType: "url",
    },
    file_link: {
      label: "Ссылка на материал",
      placeholder: "https://... или ссылка на PDF/презентацию",
      help: "Добавьте ссылку на файл, презентацию, облачный документ или внешний материал.",
      rows: 1,
      inputType: "url",
    },
    file: {
      label: "Ссылка на файл",
      placeholder: "https://... или ссылка на файл",
      help: "Добавьте прямую ссылку на учебный файл.",
      rows: 1,
      inputType: "url",
    },
    link: {
      label: "Ссылка",
      placeholder: "https://...",
      help: "Добавьте внешнюю ссылку для слушателя.",
      rows: 1,
      inputType: "url",
    },
    quiz: {
      label: "Вопрос",
      placeholder: "Введите вопрос для самопроверки",
      help: "Пока редактируем основной вопрос. Варианты ответов добавим на следующем этапе.",
      rows: 4,
      inputType: "textarea",
    },
    assignment: {
      label: "Описание задания",
      placeholder: "Опишите, что должен выполнить слушатель",
      help: "Сформулируйте задание простыми шагами: что сделать, куда отправить, какой результат нужен.",
      rows: 6,
      inputType: "textarea",
    },
  };

  return metaByType[type] || defaults;
}


function buildInspectorBlockForm(block) {
  return {
    title: `${block?.title || ""}`,
    content_text: getInspectorContentText(block),
    is_required: Boolean(block?.is_required),
    is_active: block?.is_active !== false,
  };
}

function buildInspectorBlockPayload(block, values) {
  const contentJson =
    block?.content_json && typeof block.content_json === "object"
      ? { ...block.content_json }
      : {};

  const contentText = `${values.content_text || ""}`.trim();

  if (block?.block_type === "video" || block?.block_type === "file_link") {
    contentJson.url = contentText;
  } else if (block?.block_type === "quiz") {
    contentJson.question = contentText;
  } else if (block?.block_type === "assignment") {
    contentJson.description = contentText;
  } else {
    contentJson.text = contentText;
  }

  return {
    block_type: block?.block_type || "rich_text",
    title: `${values.title || ""}`.trim() || null,
    content_json: contentJson,
    position: block?.position || 1,
    is_required: Boolean(values.is_required),
    is_active: Boolean(values.is_active),
  };
}

function LessonStudioInspector({ lesson, selectedBlock, onSaveBlock, savingBlockId }) {
  const [form, setForm] = useState(() => buildInspectorBlockForm(selectedBlock));
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    setForm(buildInspectorBlockForm(selectedBlock));
    setFormError("");
    setFormSuccess("");
  }, [selectedBlock?.id]);

  const contentFieldMeta = getInspectorContentFieldMeta(selectedBlock);
  const saving = Boolean(selectedBlock?.id && savingBlockId === selectedBlock.id);
  const draftPayload = selectedBlock ? buildInspectorBlockPayload(selectedBlock, form) : null;
  const draftBlock = selectedBlock && draftPayload ? { ...selectedBlock, ...draftPayload } : null;
  const blockIssues = draftBlock ? getBlockValidationIssues(draftBlock) : [];
  const blockReady = Boolean(selectedBlock && blockIssues.length === 0);

  const lessonFacts = [
    ["ID урока", lesson?.id || "—"],
    ["Тип", getLessonContentTypeLabel(lesson?.content_type)],
    ["Позиция", lesson?.position || "—"],
    ["Активен", lesson?.is_active === false ? "Нет" : "Да"],
    ["Обязательный", lesson?.is_required ? "Да" : "Нет"],
  ];

  const blockFacts = selectedBlock
    ? [
        ["ID блока", selectedBlock.id || "—"],
        ["Тип блока", getLessonBlockTypeLabel(selectedBlock.block_type)],
        ["Позиция", selectedBlock.position || "—"],
      ]
    : [];

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
    setFormSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedBlock) {
      return;
    }

    try {
      setFormError("");
      setFormSuccess("");
      await onSaveBlock(selectedBlock, form);
      setFormSuccess("Блок сохранён. Полотно обновлено.");
    } catch (err) {
      setFormError(err?.message || "Не удалось сохранить блок.");
    }
  };

  return (
    <aside
      data-testid="lesson-studio-inspector"
      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Инспектор
      </div>
      <h2 className="mt-1 text-sm font-bold text-slate-900">
        {selectedBlock ? "Редактирование блока" : "Настройки урока"}
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Выберите блок на полотне или в структуре. Основные поля можно менять
        здесь, без прокрутки к техническому редактору.
      </p>

      {selectedBlock ? (
        <>
          <div
            data-testid="lesson-studio-inspector-readiness"
            className={`mt-4 rounded-2xl p-3 ring-1 ${
              blockReady
                ? "bg-green-50 text-green-900 ring-green-200"
                : "bg-amber-50 text-amber-950 ring-amber-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {blockReady ? "Блок готов" : "Нужно заполнить"}
                </div>
                <div className="mt-1 text-sm font-black text-slate-900">
                  {getBlockDisplayTitle(selectedBlock)}
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
                  blockReady
                    ? "bg-white text-green-700 ring-green-200"
                    : "bg-white text-amber-800 ring-amber-200"
                }`}
              >
                {blockReady ? "✓" : "!"}
              </span>
            </div>

            {blockIssues.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {blockIssues.map((issue) => (
                  <span
                    key={issue}
                    data-testid="lesson-studio-inspector-issue-chip"
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs leading-5 text-green-800">
                Все обязательные поля блока заполнены.
              </div>
            )}
          </div>

          <form
            data-testid="lesson-studio-inspector-form"
            onSubmit={handleSubmit}
            className="mt-4 space-y-4"
          >
            <section
              data-testid="lesson-studio-inspector-section-main"
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Основное
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Заголовок
                </span>
                <input
                  value={form.title}
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                  placeholder="Название блока"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </section>

            <section
              data-testid="lesson-studio-inspector-section-content"
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Контент
              </div>

              <label className="mt-3 block" data-testid="lesson-studio-inspector-content-field">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {contentFieldMeta.label}
                </span>

                {contentFieldMeta.inputType === "url" ? (
                  <input
                    type="url"
                    value={form.content_text}
                    onChange={(event) => handleFieldChange("content_text", event.target.value)}
                    placeholder={contentFieldMeta.placeholder}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                ) : (
                  <textarea
                    value={form.content_text}
                    onChange={(event) => handleFieldChange("content_text", event.target.value)}
                    placeholder={contentFieldMeta.placeholder}
                    rows={contentFieldMeta.rows}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                )}

                {contentFieldMeta.help ? (
                  <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {contentFieldMeta.help}
                  </span>
                ) : null}
              </label>
            </section>

            <section
              data-testid="lesson-studio-inspector-section-publication"
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Публикация
              </div>

              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_required}
                    onChange={(event) => handleFieldChange("is_required", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Обязательный блок
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => handleFieldChange("is_active", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Активен
                </label>
              </div>
            </section>

            {blockIssues.length ? (
              <div
                data-testid="lesson-studio-inspector-issues"
                className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"
              >
                <div className="font-bold">Перед сохранением проверьте поля:</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {blockIssues.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {formError ? (
              <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="rounded-2xl bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-200">
                {formSuccess}
              </div>
            ) : null}

            <div
              data-testid="lesson-studio-inspector-save-bar"
              className="sticky bottom-0 -mx-1 rounded-[1.25rem] bg-white/95 p-2 shadow-sm ring-1 ring-slate-200 backdrop-blur"
            >
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Сохраняем..." : "Сохранить блок"}
              </button>
            </div>
          </form>

          <details
            data-testid="lesson-studio-inspector-service-info"
            className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
          >
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-500">
              Служебная информация
            </summary>

            <div className="mt-3 space-y-2">
              {blockFacts.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </div>
                  <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        <div className="mt-4 space-y-2">
          {lessonFacts.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </div>
              <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}


function LessonStudioPreviewPanel({ lesson, blocks }) {
  const activeBlocks = blocks.filter((block) => block.is_active !== false);
  const requiredBlocks = activeBlocks.filter((block) => block.is_required);
  const hiddenBlocks = Math.max(blocks.length - activeBlocks.length, 0);
  const problemBlocks = activeBlocks.filter((block) => getBlockValidationIssues(block).length > 0);

  const facts = [
    ["Активных блоков", activeBlocks.length],
    ["Обязательных", requiredBlocks.length],
    ["Скрыто из предпросмотра", hiddenBlocks],
    ["Требуют заполнения", problemBlocks.length],
  ];

  return (
    <aside
      data-testid="lesson-studio-preview-panel"
      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Предпросмотр
      </div>
      <h2 className="mt-1 text-sm font-bold text-slate-900">
        Вид для обучающегося
      </h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        В этом режиме скрыты админские кнопки, неактивные блоки и технические
        настройки. Так урок будет выглядеть для слушателя.
      </p>

      <div className="mt-4 rounded-2xl bg-green-50 p-3 text-green-900 ring-1 ring-green-200">
        <div className="text-xs font-bold uppercase tracking-wide text-green-700">
          Урок
        </div>
        <div className="mt-1 text-sm font-black text-slate-900">
          {lesson?.title || "Без названия"}
        </div>
      </div>

      <div
        data-testid="lesson-studio-preview-summary"
        className="mt-4 grid grid-cols-2 gap-2"
      >
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {label}
            </div>
            <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
          </div>
        ))}
      </div>

      {problemBlocks.length ? (
        <div
          data-testid="lesson-studio-preview-issues"
          className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-200"
        >
          <div className="font-bold">В активных блоках есть незаполненные поля.</div>
          <div className="mt-2">
            Проверьте их в режиме редактора перед публикацией урока.
          </div>
        </div>
      ) : (
        <div
          data-testid="lesson-studio-preview-ready"
          className="mt-4 rounded-2xl bg-green-50 p-3 text-xs leading-5 text-green-900 ring-1 ring-green-200"
        >
          Активные блоки готовы к просмотру.
        </div>
      )}
    </aside>
  );
}

export function LessonStudioPage({ lessonId }) {
  const [lesson, setLesson] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [viewMode, setViewMode] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blockActionId, setBlockActionId] = useState("");
  const [duplicatingBlockId, setDuplicatingBlockId] = useState("");
  const [deletingBlockId, setDeletingBlockId] = useState("");
  const [creatingTemplateKey, setCreatingTemplateKey] = useState("");
  const [error, setError] = useState("");

  const loadLesson = useCallback(async () => {
    if (!lessonId) {
      setLesson(null);
      setError("Не передан идентификатор урока.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getAdminCourseLessonDetail(lessonId);
      setLesson(data || null);
    } catch (err) {
      setError(formatLessonStudioError(err, "Ошибка загрузки урока"));
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  const loadBlocks = useCallback(async () => {
    if (!lessonId) {
      setBlocks([]);
      return;
    }

    setBlocksLoading(true);

    try {
      const data = await getAdminLessonBlocks(lessonId);
      const nextBlocks = Array.isArray(data) ? data : [];
      setBlocks(nextBlocks);

      setSelectedBlockId((current) => {
        if (current && nextBlocks.some((block) => block.id === current)) {
          return current;
        }

        return nextBlocks[0]?.id || "";
      });
    } catch (err) {
      setError(formatLessonStudioError(err, "Ошибка загрузки блоков урока"));
      setBlocks([]);
    } finally {
      setBlocksLoading(false);
    }
  }, [lessonId]);

  const reloadStudio = useCallback(async () => {
    await Promise.all([loadLesson(), loadBlocks()]);
  }, [loadLesson, loadBlocks]);

  useEffect(() => {
    reloadStudio();
  }, [reloadStudio]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  const visiblePreviewBlocks = useMemo(
    () => blocks.filter((block) => block.is_active !== false),
    [blocks]
  );
  const studioStructureBlocks = viewMode === "preview" ? visiblePreviewBlocks : blocks;

  const lessonReadiness = useMemo(
    () => getLessonReadinessReport(lesson, blocks),
    [lesson, blocks]
  );

  const handleEditorBlocksChanged = useCallback((nextBlocks) => {
    const normalizedBlocks = Array.isArray(nextBlocks) ? nextBlocks : [];

    setBlocks(normalizedBlocks);
    setSelectedBlockId((current) => {
      if (current && normalizedBlocks.some((block) => block.id === current)) {
        return current;
      }

      return normalizedBlocks[0]?.id || "";
    });
  }, []);



  const handleSelectBlock = useCallback((blockId) => {
    setSelectedBlockId(blockId);

    if (typeof document === "undefined" || !blockId) {
      return;
    }

    window.setTimeout(() => {
      const target = document.getElementById(`studio-block-${blockId}`);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  }, []);

  const handleQuickCreateBlock = useCallback(
    async (template) => {
      if (!lessonId || !template?.values) {
        setError("Не удалось определить урок или тип блока.");
        return;
      }

      setCreatingTemplateKey(template.key);
      setError("");

      try {
        const position = getNextStudioBlockPosition(blocks);
        const createdBlock = await createAdminLessonBlock(
          lessonId,
          buildStudioQuickBlockPayload(template, position)
        );

        await loadBlocks();

        if (createdBlock?.id) {
          setSelectedBlockId(createdBlock.id);
        }
      } catch (err) {
        setError(formatLessonStudioError(err, "Не удалось добавить блок"));
      } finally {
        setCreatingTemplateKey("");
      }
    },
    [blocks, lessonId, loadBlocks]
  );

  const handleMoveBlock = useCallback(
    async (block, direction) => {
      if (!lessonId || !block?.id) {
        setError("Не удалось определить урок или блок для перемещения.");
        return;
      }

      const orderedBlocks = blocks
        .slice()
        .sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0));

      const index = orderedBlocks.findIndex((item) => item.id === block.id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= orderedBlocks.length) {
        return;
      }

      const reorderedBlocks = orderedBlocks.slice();
      const [movedBlock] = reorderedBlocks.splice(index, 1);
      reorderedBlocks.splice(targetIndex, 0, movedBlock);

      const payload = reorderedBlocks.map((item, itemIndex) => ({
        id: item.id,
        position: itemIndex + 1,
      }));

      setBlockActionId(block.id);
      setError("");

      try {
        await reorderAdminLessonBlocks(lessonId, payload);
        await loadBlocks();
        setSelectedBlockId(block.id);
      } catch (err) {
        setError(formatLessonStudioError(err, "Не удалось изменить порядок блоков"));
      } finally {
        setBlockActionId("");
      }
    },
    [blocks, lessonId, loadBlocks]
  );


  const handleDuplicateBlock = useCallback(
    async (block) => {
      if (!lessonId || !block?.id) {
        setError("Не удалось определить урок или блок для дублирования.");
        return;
      }

      setDuplicatingBlockId(block.id);
      setError("");

      try {
        const position = getNextStudioBlockPosition(blocks);
        const createdBlock = await createAdminLessonBlock(
          lessonId,
          buildDuplicateStudioBlockPayload(block, position)
        );

        await loadBlocks();

        if (createdBlock?.id) {
          setSelectedBlockId(createdBlock.id);
        }
      } catch (err) {
        setError(formatLessonStudioError(err, "Не удалось дублировать блок"));
      } finally {
        setDuplicatingBlockId("");
      }
    },
    [blocks, lessonId, loadBlocks]
  );

  const handleDeleteBlock = useCallback(
    async (block) => {
      if (!block?.id) {
        setError("Не выбран блок для удаления.");
        return;
      }

      const title = block.title || getLessonBlockTypeLabel(block.block_type);
      const confirmed = window.confirm(`Удалить блок "${title}"?`);

      if (!confirmed) {
        return;
      }

      const orderedBlocks = blocks
        .slice()
        .sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0));

      const currentIndex = orderedBlocks.findIndex((item) => item.id === block.id);
      const remainingBlocks = orderedBlocks.filter((item) => item.id !== block.id);
      const nextSelectedBlock =
        remainingBlocks[Math.min(Math.max(currentIndex, 0), remainingBlocks.length - 1)] ||
        remainingBlocks[remainingBlocks.length - 1] ||
        null;

      setDeletingBlockId(block.id);
      setError("");

      try {
        await deleteAdminLessonBlock(block.id);
        await loadBlocks();
        setSelectedBlockId(nextSelectedBlock?.id || "");
      } catch (err) {
        setError(formatLessonStudioError(err, "Не удалось удалить блок"));
      } finally {
        setDeletingBlockId("");
      }
    },
    [blocks, loadBlocks]
  );

  const handleInspectorSaveBlock = useCallback(
    async (block, values) => {
      if (!block?.id) {
        throw new Error("Не выбран блок для сохранения.");
      }

      setBlockActionId(block.id);
      setError("");

      try {
        await updateAdminLessonBlock(block.id, buildInspectorBlockPayload(block, values));
        await loadBlocks();
        setSelectedBlockId(block.id);
      } catch (err) {
        throw new Error(formatLessonStudioError(err, "Не удалось сохранить блок"));
      } finally {
        setBlockActionId("");
      }
    },
    [loadBlocks]
  );

  return (
    <main data-testid="lesson-studio-page" className="space-y-5">
      <LessonStudioTopbar
        lesson={lesson}
        blocks={blocks}
        loading={loading}
        blocksLoading={blocksLoading}
        error={error}
        mode={viewMode}
        onModeChange={setViewMode}
        onReload={reloadStudio}
      />

      <LessonStudioReadinessChecklist
        report={lessonReadiness}
        onSelectBlock={handleSelectBlock}
        onModeChange={setViewMode}
      />


      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <LessonStudioStructurePanel
          lesson={lesson}
          blocks={studioStructureBlocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={handleSelectBlock}
          mode={viewMode}
          quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}
          onCreateBlock={handleQuickCreateBlock}
          creatingTemplateKey={creatingTemplateKey}
          quickAddDisabled={blocksLoading}
        />

        <section
          data-testid="lesson-studio-canvas"
          className="min-w-0 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <LessonStudioCanvas
            blocks={blocks}
            mode={viewMode}
            selectedBlockId={selectedBlockId}
            onSelectBlock={handleSelectBlock}
            onRefreshBlocks={loadBlocks}
            onCreateBlock={handleQuickCreateBlock}
            onMoveBlock={handleMoveBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlock}
            creatingTemplateKey={creatingTemplateKey}
            movingBlockId={blockActionId}
            duplicatingBlockId={duplicatingBlockId}
            deletingBlockId={deletingBlockId}
            blocksLoading={blocksLoading}
          />

          {viewMode === "editor" ? (
          <details
            data-testid="lesson-studio-technical-editor"
            className="mt-5 rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <summary
              data-testid="lesson-studio-advanced-technical-summary"
              className="cursor-pointer rounded-2xl px-1 py-1 text-sm font-bold text-slate-900 transition hover:text-blue-700"
            >
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>Расширенные технические настройки</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  Резервный редактор
                </span>
              </span>
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Используйте только для ручной диагностики и резервного редактирования.
              Основное наполнение урока теперь выполняется на визуальном полотне и в инспекторе справа.
            </p>

            <div data-testid="lesson-studio-advanced-technical-body" className="mt-4">
              <LessonBlocksEditor
                lessonId={lessonId}
                onBlocksChanged={handleEditorBlocksChanged}
              />
            </div>
          </details>
          ) : null}
        </section>

        {viewMode === "preview" ? (
          <LessonStudioPreviewPanel lesson={lesson} blocks={blocks} />
        ) : (
        <LessonStudioInspector
          lesson={lesson}
          selectedBlock={selectedBlock}
          onSaveBlock={handleInspectorSaveBlock}
          savingBlockId={blockActionId}
        />
        )}
      </div>
    </main>
  );
}

export default LessonStudioPage;
