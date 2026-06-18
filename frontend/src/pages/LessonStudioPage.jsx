import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminLessonBlock,
  deleteAdminLessonBlock,
  getAdminCourseLessonDetail,
  getAdminLessonBlocks,
  reorderAdminLessonBlocks,
  updateAdminLessonBlock,
} from "../api/client";
import LessonRichTextEditor from "../components/admin/lesson-studio/LessonRichTextEditor";
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

function getCanvasInsertTemplateKey(insertIndex, templateKey) {
  return `canvas:${insertIndex}:${templateKey}`;
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

function isLessonRichTextDocumentEmpty(documentValue) {
  const nodes = Array.isArray(documentValue?.content) ? documentValue.content : [];

  if (!nodes.length) {
    return true;
  }

  return !nodes.some((node) => getLessonRichTextPlainText(node).trim());
}

function getLessonRichTextPlainText(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  if (node.type === "text") {
    return `${node.text || ""}`;
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (!Array.isArray(node.content)) {
    return "";
  }

  return node.content.map((child) => getLessonRichTextPlainText(child)).join("");
}

function getSafeLessonRichTextHref(href) {
  const value = `${href || ""}`.trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("/") || value.startsWith("#")) {
    return value;
  }

  try {
    const url = new URL(value);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

    return allowedProtocols.includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

function renderLessonRichTextMarks(children, marks = [], keyPrefix = "mark") {
  return marks.reduce((currentChildren, mark, index) => {
    const markKey = `${keyPrefix}-${mark.type || "mark"}-${index}`;

    if (mark.type === "bold") {
      return (
        <strong key={markKey} className="font-black text-slate-950">
          {currentChildren}
        </strong>
      );
    }

    if (mark.type === "italic") {
      return (
        <em key={markKey} className="italic">
          {currentChildren}
        </em>
      );
    }

    if (mark.type === "code") {
      return (
        <code
          key={markKey}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-900 ring-1 ring-slate-200"
        >
          {currentChildren}
        </code>
      );
    }

    if (mark.type === "link") {
      const safeHref = getSafeLessonRichTextHref(mark.attrs?.href);

      if (!safeHref) {
        return currentChildren;
      }

      return (
        <a
          key={markKey}
          data-testid="lesson-rich-text-safe-link"
          href={safeHref}
          target={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "_blank"}
          rel={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "noreferrer"}
          className="font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-blue-900"
        >
          {currentChildren}
        </a>
      );
    }

    return currentChildren;
  }, children);
}

function renderLessonRichTextChildren(nodes, keyPrefix) {
  if (!Array.isArray(nodes)) {
    return null;
  }

  return nodes
    .map((node, index) => renderLessonRichTextNode(node, `${keyPrefix}-${index}`))
    .filter(Boolean);
}

function renderLessonRichTextNode(node, key) {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.type === "text") {
    return renderLessonRichTextMarks(`${node.text || ""}`, node.marks, key);
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  const children = renderLessonRichTextChildren(node.content, key);

  if (node.type === "paragraph") {
    return (
      <p key={key} className="text-sm leading-7 text-slate-700">
        {children?.length ? children : <br />}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level || 2);
    const HeadingTag = level >= 3 ? "h3" : "h2";
    const className =
      level >= 3
        ? "mt-4 text-base font-black leading-7 text-slate-950 first:mt-0"
        : "mt-5 text-lg font-black leading-7 text-slate-950 first:mt-0";

    return (
      <HeadingTag key={key} className={className}>
        {children}
      </HeadingTag>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="ml-5 list-disc space-y-1 text-sm leading-7 text-slate-700">
        {children}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="ml-5 list-decimal space-y-1 text-sm leading-7 text-slate-700">
        {children}
      </ol>
    );
  }

  if (node.type === "listItem") {
    return (
      <li key={key} className="pl-1">
        {children}
      </li>
    );
  }

  if (node.type === "blockquote") {
    return (
      <blockquote
        key={key}
        className="rounded-r-2xl border-l-4 border-blue-200 bg-blue-50/70 px-4 py-3 text-sm italic leading-7 text-slate-700"
      >
        {children}
      </blockquote>
    );
  }

  if (node.type === "codeBlock") {
    return (
      <pre
        key={key}
        className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-50 shadow-inner"
      >
        <code>{getLessonRichTextPlainText(node)}</code>
      </pre>
    );
  }

  if (children?.length) {
    return (
      <div key={key} className="text-sm leading-7 text-slate-700">
        {children}
      </div>
    );
  }

  return null;
}

function getLessonRichTextPreviewDocument(block, preview) {
  const content = safeParseJson(block?.content_json);

  if (content.editor_json?.type === "doc") {
    return content.editor_json;
  }

  const fallbackText = `${content.text || content.content_text || preview || ""}`.trim();

  return buildLessonRichTextDocumentFromText(fallbackText);
}

function LessonRichTextSafePreview({ block, preview, learnerMode = false }) {
  const documentValue = getLessonRichTextPreviewDocument(block, preview);
  const fallbackText = `${preview || ""}`.trim();
  const empty = isLessonRichTextDocumentEmpty(documentValue);
  const nodes = Array.isArray(documentValue?.content) ? documentValue.content : [];

  return (
    <div
      data-testid="lesson-studio-text-preview"
      className={learnerMode ? "mt-2" : "mt-4 rounded-2xl bg-white/90 p-5 ring-1 ring-black/5"}
    >
      <div
        data-testid="lesson-rich-text-safe-preview"
        className={learnerMode ? "space-y-3 break-words text-slate-800" : "space-y-3 break-words"}
      >
        {empty ? (
          <p className="text-sm leading-7 text-slate-500">
            {fallbackText || "Учебный текст пока не заполнен."}
          </p>
        ) : (
          nodes.map((node, index) => renderLessonRichTextNode(node, `rich-text-preview-${index}`))
        )}
      </div>
    </div>
  );
}

function LessonCanvasTypePreview({ block, preview, learnerMode = false }) {
  const type = `${block?.block_type || "rich_text"}`.toLowerCase();
  const meta = getBlockPreviewMeta(block);
  const isEmpty = preview === "Контент блока пока не заполнен.";

  const previewValue = isEmpty ? "Заполните содержимое справа в инспекторе." : preview;
  const richTextPreview = type === "rich_text" || type === "text";

  return (
    <div
      data-testid="lesson-studio-canvas-type-preview"
      className={
        learnerMode
          ? "py-1 text-sm leading-7 text-slate-800"
          : `mt-3 rounded-[1.25rem] p-3 text-sm leading-6 ring-1 ${meta.surfaceClass}`
      }
    >
      {!learnerMode ? (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xs font-black shadow-sm ring-1 ring-black/5">
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
      ) : null}

      {richTextPreview ? (
        <LessonRichTextSafePreview block={block} preview={previewValue} learnerMode={learnerMode} />
      ) : type === "video" ? (
        <div
          data-testid="lesson-studio-video-preview"
          className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-slate-900 text-white">
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
          className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Открыть материал</div>
          <div className="mt-1 break-words text-xs opacity-80">{previewValue}</div>
        </div>
      ) : type === "quiz" ? (
        <div
          data-testid="lesson-studio-quiz-preview"
          className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
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
          className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Что нужно сделать</div>
          <div className="mt-1 text-sm">{previewValue}</div>
        </div>
      ) : type === "callout" ? (
        <div
          data-testid="lesson-studio-callout-preview"
          className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
        >
          <div className="text-sm font-bold">Важно</div>
          <div className="mt-1 text-sm">{previewValue}</div>
        </div>
      ) : (
        <div
          data-testid="lesson-studio-text-preview"
          className="mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
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

function LessonStudioReadinessChecklist({
  report,
  selectedBlockId,
  onSelectBlock,
  onModeChange,
  onFixFirstProblem,
  onFixNextProblem,
}) {
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
  const firstProblemBlock = report.problemBlocks[0]?.block || null;
  const currentProblemIndex = report.problemBlocks.findIndex(
    (item) => item.block?.id === selectedBlockId
  );
  const nextProblemNumber =
    currentProblemIndex >= 0
      ? ((currentProblemIndex + 1) % Math.max(report.problemBlocks.length, 1)) + 1
      : 1;

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

        <div className="flex flex-wrap items-center gap-2">
          {firstProblemBlock ? (
            <button
              type="button"
              data-testid="lesson-studio-readiness-fix-first-problem"
              onClick={() => {
                if (typeof onModeChange === "function") {
                  onModeChange("editor");
                }

                if (typeof onFixFirstProblem === "function") {
                  onFixFirstProblem();
                } else if (typeof onSelectBlock === "function") {
                  onSelectBlock(firstProblemBlock.id);
                }

                setIsOpen(true);
              }}
              className="rounded-full bg-blue-700 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-800"
            >
              Исправить первую проблему
            </button>
          ) : null}

          {report.problemBlocks.length > 1 ? (
            <button
              type="button"
              data-testid="lesson-studio-readiness-fix-next-problem"
              onClick={() => {
                if (typeof onModeChange === "function") {
                  onModeChange("editor");
                }

                if (typeof onFixNextProblem === "function") {
                  onFixNextProblem();
                }

                setIsOpen(true);
              }}
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-50"
            >
              Следующая проблема · {nextProblemNumber}/{report.problemBlocks.length}
            </button>
          ) : null}

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
                        #{item.index + 1} · {item.title}
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


function LessonStudioTopbar({ lesson, error, mode = "editor", onModeChange }) {
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

          <a
            href={courseHref}
            data-testid="lesson-studio-course-link"
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
          >
            К курсу
          </a>
        </div>
      </div>

      {error ? (
        <div
          data-testid="lesson-studio-error"
          className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200"
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}


function LessonStudioStructurePanel({
  lesson,
  blocks,
  selectedBlockId,
  editingBlockId,
  onSelectBlock,
  mode,
  quickAddTemplates = [],
  onCreateBlock,
  creatingTemplateKey,
  quickAddDisabled,
  showOnlyProblems = false,
  onToggleShowOnlyProblems,
}) {
  const previewMode = mode === "preview";
  const requiredBlocks = blocks.filter((block) => block.is_required).length;
  const activeBlocks = blocks.filter((block) => block.is_active !== false).length;
  const inactiveBlocks = Math.max(blocks.length - activeBlocks, 0);
  const problemBlocks = blocks.filter((block) => getBlockValidationIssues(block).length > 0);
  const readyBlocks = Math.max(blocks.length - problemBlocks.length, 0);
  const displayedBlocks = showOnlyProblems ? problemBlocks : blocks;
  const hiddenByProblemFilter = Math.max(blocks.length - displayedBlocks.length, 0);

  return (
    <aside
      data-testid="lesson-studio-structure"
      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.75rem] bg-white p-3 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Структура урока
          </div>
          <h2 className="mt-1 truncate text-sm font-black text-slate-900">
            {lesson?.title || "Урок загружается"}
          </h2>
        </div>

        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
          {blocks.length}
        </span>
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
        className="mt-3 flex flex-wrap gap-1.5"
      >
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
          Всего: {blocks.length}
        </span>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700 ring-1 ring-green-100">
          Готово: {readyBlocks}
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
          Обяз.: {requiredBlocks}
        </span>

        {problemBlocks.length ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-100">
            Проблем: {problemBlocks.length}
          </span>
        ) : null}

        {inactiveBlocks ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
            Скрыто: {inactiveBlocks}
          </span>
        ) : null}
      </div>

      <div
        data-testid="lesson-studio-structure-problem-filter"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          data-testid="lesson-studio-structure-problems-filter-button"
          onClick={onToggleShowOnlyProblems}
          disabled={!problemBlocks.length}
          className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
            showOnlyProblems
              ? "bg-amber-600 text-white ring-amber-600"
              : "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100"
          }`}
        >
          {showOnlyProblems ? "Показать все" : "Только проблемные"}
        </button>

        {showOnlyProblems && hiddenByProblemFilter ? (
          <span
            data-testid="lesson-studio-structure-problems-filter-hidden"
            className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200"
          >
            Скрыто готовых: {hiddenByProblemFilter}
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1.5">
        {displayedBlocks.length ? (
          displayedBlocks.map((block, index) => {
            const selected = block.id === selectedBlockId;
            const editing = block.id === editingBlockId;
            const issues = getBlockValidationIssues(block);
            const hasIssues = issues.length > 0;

            return (
              <button
                key={block.id}
                type="button"
                data-testid="lesson-studio-structure-block"
                onClick={() => onSelectBlock(block.id)}
                className={`w-full rounded-2xl px-3 py-2.5 text-left ring-1 transition ${
                  selected
                    ? "bg-blue-50 ring-blue-300 shadow-sm"
                    : hasIssues
                      ? "bg-amber-50/70 ring-amber-200 hover:bg-amber-50"
                      : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ring-1 ${
                    selected
                      ? "bg-white text-blue-700 ring-blue-200"
                      : "bg-slate-50 text-slate-600 ring-slate-200"
                  }`}>
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {getBlockDisplayTitle(block, index)}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {getLessonBlockTypeLabel(block.block_type)}
                      </span>

                      {block.is_required ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-100">
                          обязательный
                        </span>
                      ) : null}

                      {block.is_active === false ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          скрыт
                        </span>
                      ) : null}

                      {editing ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-200">
                          правится
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span
                    data-testid="lesson-studio-structure-block-status"
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${
                      hasIssues
                        ? "bg-amber-100 text-amber-800 ring-amber-200"
                        : "bg-green-50 text-green-700 ring-green-200"
                    }`}
                  >
                    {hasIssues ? `${issues.length} проблем` : "готов"}
                  </span>
                </div>

                {selected && hasIssues ? (
                  <div
                    data-testid="lesson-studio-structure-block-issues"
                    className="mt-2 flex flex-wrap gap-1.5"
                  >
                    {issues.map((issue) => (
                      <span
                        key={issue}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
            {showOnlyProblems && blocks.length
              ? "Проблемных блоков нет. Все отображаемые блоки готовы."
              : "Блоки урока пока не добавлены."}
          </div>
        )}
      </div>
    </aside>
  );
}


function LessonCanvasInsertBlockControl({
  templates,
  insertIndex,
  onCreateBlock,
  creatingTemplateKey,
  disabled,
}) {
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsidePointerDown = (event) => {
      if (!menuRef.current) {
        return;
      }

      if (menuRef.current.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [open]);

  return (
    <div
      data-testid="lesson-studio-canvas-insert-control"
      className="relative py-0.5"
    >
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200/80" />

        <details
          ref={menuRef}
          open={open}
          data-testid="lesson-studio-canvas-insert-menu"
          className="relative"
          onToggle={(event) => setOpen(event.currentTarget.open)}
        >
          <summary
            data-testid="lesson-studio-canvas-insert-trigger"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-lg font-black text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50"
            style={{ listStyle: "none" }}
            aria-label="Добавить блок здесь"
          >
            +
          </summary>

          <div
            data-testid="lesson-studio-canvas-insert-options"
            className="absolute left-1/2 z-30 mt-2 grid w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 grid-cols-2 gap-2 rounded-[1.35rem] bg-white p-2 shadow-xl ring-1 ring-slate-200 sm:grid-cols-3 xl:grid-cols-6"
          >
            {templates.map((template) => {
              const creatingKey = getCanvasInsertTemplateKey(insertIndex, template.key);
              const creating = creatingTemplateKey === creatingKey;
              const meta = getBlockPreviewMeta({ block_type: template.values?.block_type });

              return (
                <button
                  key={template.key}
                  type="button"
                  data-testid="lesson-studio-canvas-insert-option"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                    onCreateBlock(template, insertIndex);
                  }}
                  disabled={disabled || creating}
                  className="flex min-h-20 flex-col items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-left ring-1 ring-slate-200 transition hover:bg-blue-50 hover:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[11px] font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                    {meta.icon}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-slate-950">
                      {creating ? "Добавляем..." : template.label}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-slate-500">
                      {template.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </details>

        <div className="h-px flex-1 bg-slate-200/80" />
      </div>
    </div>
  );
}

function LessonCanvasBlock({
  lesson,
  block,
  index,
  previewMode = false,
  selected,
  editing,
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
  onSaveBlock,
  savingBlockId,
}) {
  const issues = getBlockValidationIssues(block);
  const blockReady = issues.length === 0;
  const title = getBlockDisplayTitle(block, index);
  const preview = getBlockTextPreview(block);
  const compact = !previewMode && !selected;
  const busy = disabled || moving || duplicating || deleting;
  const compactSummary = issues.length
    ? `Нужно заполнить: ${issues.slice(0, 2).join(", ")}${issues.length > 2 ? "..." : ""}`
    : preview || "Краткое содержимое блока пока не заполнено.";
  const inlineRichTextEditing = !previewMode && selected && editing && isLessonRichTextBlock(block);
  const actionsMenuRef = useRef(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return undefined;
    }

    const handleOutsidePointerDown = (event) => {
      if (!actionsMenuRef.current) {
        return;
      }

      if (actionsMenuRef.current.contains(event.target)) {
        return;
      }

      setActionsMenuOpen(false);
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setActionsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [actionsMenuOpen]);

  const handleMoveClick = (event, direction) => {
    event.stopPropagation();

    if (busy) {
      return;
    }

    setActionsMenuOpen(false);
    onMove(block, direction);
  };

  const handleDuplicateClick = (event) => {
    event.stopPropagation();

    if (busy) {
      return;
    }

    setActionsMenuOpen(false);
    onDuplicate(block);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();

    if (busy) {
      return;
    }

    setActionsMenuOpen(false);
    onDelete(block);
  };

  return (
    <article
      data-lesson-studio-block-id={block.id}
      tabIndex={-1}
      style={{ overflowAnchor: "none", scrollMarginTop: "9rem" }}
      id={`studio-block-${block.id}`}
      data-testid="lesson-studio-canvas-block"
      data-compact={compact ? "true" : "false"}
      className={
        previewMode
          ? "py-3"
          : `rounded-[1.35rem] bg-white shadow-sm ring-1 transition ${
              compact ? "p-3" : "p-4"
            } ${
              !previewMode && selected ? "ring-blue-300 bg-blue-50/20" : "ring-slate-200 hover:ring-blue-200"
            }`
      }
      onClick={() => {
        if (!previewMode) {
          onSelect(block.id);
        }
      }}
    >
      {!previewMode ? (
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              #{index + 1} · {getLessonBlockTypeLabel(block.block_type)}
            </div>
            <h3 className={`${compact ? "mt-0.5 text-sm" : "mt-1 text-base"} font-black text-slate-900`}>
              {title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span
              data-testid="lesson-studio-block-readiness-chip"
              className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
                blockReady
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-amber-50 text-amber-800 ring-amber-200"
              }`}
            >
              {blockReady ? "Готов" : `${issues.length} проблем`}
            </span>

            {!compact && block.is_required ? (
              <LessonStudioBadge tone="green">Обязательный</LessonStudioBadge>
            ) : null}

            {block.is_active === false ? (
              <LessonStudioBadge tone="slate">Скрыт</LessonStudioBadge>
            ) : null}
          </div>
        </div>
      ) : null}

      {compact ? (
        <p
          data-testid="lesson-studio-block-compact-summary"
          className={`mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 ${
            issues.length ? "font-semibold text-amber-800" : "text-slate-500"
          }`}
        >
          {compactSummary}
        </p>
      ) : null}

      <div
        data-testid="lesson-studio-block-order-controls"
        className={
          previewMode
            ? "hidden"
            : compact
              ? "mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2"
              : "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5"
        }
      >
        <details
          ref={actionsMenuRef}
          open={actionsMenuOpen}
          data-testid="lesson-studio-card-actions-menu"
          className="relative"
          onClick={(event) => event.stopPropagation()}
          onToggle={(event) => setActionsMenuOpen(event.currentTarget.open)}
        >
          <summary
            data-testid="lesson-studio-card-actions-trigger"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-lg font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
            style={{ listStyle: "none" }}
            aria-label="Действия с блоком"
          >
            ⋯
          </summary>

          <div
            data-testid="lesson-studio-card-actions"
            className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200"
          >
            <button
              type="button"
              data-testid="lesson-studio-move-up-button"
              onClick={(event) => handleMoveClick(event, "up")}
              disabled={!canMoveUp || busy}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Переместить выше</span>
              <span>↑</span>
            </button>

            <button
              type="button"
              data-testid="lesson-studio-move-down-button"
              onClick={(event) => handleMoveClick(event, "down")}
              disabled={!canMoveDown || busy}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Переместить ниже</span>
              <span>↓</span>
            </button>

            <button
              type="button"
              data-testid="lesson-studio-duplicate-button"
              onClick={handleDuplicateClick}
              disabled={busy}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Дублировать</span>
              <span>⧉</span>
            </button>

            <button
              type="button"
              data-testid="lesson-studio-delete-button"
              onClick={handleDeleteClick}
              disabled={busy}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Удалить</span>
              <span>×</span>
            </button>
          </div>
        </details>

        {moving || duplicating || deleting ? (
          <span className="rounded-full bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {moving ? "Меняем порядок..." : duplicating ? "Дублируем..." : "Удаляем..."}
          </span>
        ) : null}
      </div>

      {!compact && !previewMode && issues.length ? (
        <div
          data-testid="lesson-studio-block-issues"
          className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-amber-800"
        >
          <span className="font-bold">Нужно заполнить:</span>
          {issues.map((issue) => (
            <span
              key={issue}
              className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold ring-1 ring-amber-200"
            >
              {issue}
            </span>
          ))}
        </div>
      ) : null}

      {!compact && !inlineRichTextEditing ? (
        <LessonCanvasTypePreview block={block} preview={preview} learnerMode={previewMode} />
      ) : null}

      {!previewMode && selected && editing ? (
        <LessonStudioInspector
          lesson={lesson}
          selectedBlock={block}
          onSaveBlock={async (...args) => {
            const savedBlockId = block.id;
            const savedBlockSelector = `[data-lesson-studio-block-id="${savedBlockId}"]`;

            await onSaveBlock(...args);
            onSelect("");

            const scrollToSavedBlock = (behavior = "auto") => {
              const savedBlockElement = document.querySelector(savedBlockSelector);

              if (!savedBlockElement) {
                return;
              }

              savedBlockElement.scrollIntoView({
                behavior,
                block: "start",
                inline: "nearest",
              });

              savedBlockElement.focus?.({ preventScroll: true });
            };

            window.requestAnimationFrame(() => {
              scrollToSavedBlock("auto");

              window.setTimeout(() => scrollToSavedBlock("auto"), 80);
              window.setTimeout(() => scrollToSavedBlock("smooth"), 220);
              window.setTimeout(() => scrollToSavedBlock("smooth"), 420);
            });
          }}
          savingBlockId={savingBlockId}
          variant="inline"
          onClose={() => onSelect("")}
        />
      ) : null}
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
      className="mt-3 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200"
    >
      <summary
        data-testid="lesson-studio-sidebar-quick-add-trigger"
        className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm font-black text-slate-950 transition hover:bg-white"
        style={{ listStyle: "none" }}
      >
        <span>+ Добавить блок</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
          {templates.length}
        </span>
      </summary>

      <div
        data-testid="lesson-studio-sidebar-quick-add-menu"
        className="border-t border-slate-200 p-2"
      >
        <div className="grid gap-1.5">
          {templates.map((template) => {
            const creating = creatingTemplateKey === template.key;

            return (
              <button
                key={template.key}
                type="button"
                data-testid="lesson-studio-sidebar-quick-add-button"
                onClick={() => onCreateBlock(template)}
                disabled={disabled || creating}
                className="flex w-full items-start justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-slate-200 transition hover:bg-blue-50 hover:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-slate-950">
                    {creating ? "Добавляем..." : template.label}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-slate-500">
                    {template.hint}
                  </span>
                </span>

                <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {getLessonBlockTypeLabel(template.values?.block_type)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}


function LessonStudioCanvas({
  lesson,
  blocks,
  mode = "editor",
  selectedBlockId,
  editingBlockId,
  onSelectBlock,
  onRefreshBlocks,
  quickAddTemplates = [],
  onCreateBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onSaveBlock,
  savingBlockId,
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
  const insertDisabled =
    blocksLoading ||
    Boolean(creatingTemplateKey) ||
    Boolean(movingBlockId) ||
    Boolean(duplicatingBlockId) ||
    Boolean(deletingBlockId);

  return (
    <section
      data-testid="lesson-studio-visual-canvas"
      className={previewMode ? "space-y-0" : "space-y-2.5"}
    >
      {visibleBlocks.length ? (
        <div
          data-testid={previewMode ? "lesson-studio-learner-document" : "lesson-studio-editor-block-list"}
          className={
            previewMode
              ? "mx-auto w-full max-w-6xl space-y-5 rounded-[1.75rem] bg-white px-7 py-6 shadow-sm ring-1 ring-slate-100 sm:px-9 lg:px-12"
              : "space-y-2.5"
          }
        >
          {visibleBlocks.map((block, index) => (
            <div
              key={block.id}
              data-testid="lesson-studio-canvas-block-stack"
              className={
                previewMode
                  ? "border-b border-slate-100 pb-5 last:border-b-0 last:pb-0"
                  : "space-y-2.5"
              }
            >
              <LessonCanvasBlock
                lesson={lesson}
                block={block}
                index={index}
                previewMode={previewMode}
                selected={block.id === selectedBlockId}
                editing={editingBlockId === block.id}
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
                onSaveBlock={onSaveBlock}
                savingBlockId={savingBlockId}
              />

              {!previewMode ? (
                <LessonCanvasInsertBlockControl
                  templates={quickAddTemplates}
                  insertIndex={index + 1}
                  onCreateBlock={onCreateBlock}
                  creatingTemplateKey={creatingTemplateKey}
                  disabled={insertDisabled}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {!previewMode ? (
            <LessonCanvasInsertBlockControl
              templates={quickAddTemplates}
              insertIndex={0}
              onCreateBlock={onCreateBlock}
              creatingTemplateKey={creatingTemplateKey}
              disabled={insertDisabled}
            />
          ) : null}

          <div className="rounded-[1.35rem] bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-dashed ring-slate-300">
            {previewMode
              ? "В предпросмотре нет активных блоков."
              : "Урок пока пустой. Добавьте первый блок через левую панель или плюс на полотне."}
          </div>
        </div>
      )}
    </section>
  );
}



function getInspectorContentText(block) {
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

  return value || "";
}

function isLessonRichTextBlock(block) {
  const type = `${block?.block_type || "rich_text"}`.toLowerCase();

  return type === "rich_text" || type === "text";
}

function buildLessonRichTextDocumentFromText(value) {
  const text = `${value || ""}`.trim();

  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}

function getInspectorEditorJson(block) {
  const content = safeParseJson(block?.content_json);

  if (content.editor_json?.type === "doc") {
    return content.editor_json;
  }

  return buildLessonRichTextDocumentFromText(getInspectorContentText(block));
}

function getInspectorEditorHtml(block) {
  const content = safeParseJson(block?.content_json);

  return `${content.editor_html || ""}`;
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
    editor_json: getInspectorEditorJson(block),
    editor_html: getInspectorEditorHtml(block),
    is_required: Boolean(block?.is_required),
    is_active: block?.is_active !== false,
  };
}

function stableStringifyLessonValue(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringifyLessonValue(item)).join(",")}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringifyLessonValue(value[key])}`);

  return `{${entries.join(",")}}`;
}

function normalizeInspectorSnapshotEditorJson(values) {
  const contentText = `${values?.content_text || ""}`.trim();

  if (values?.editor_json?.type === "doc") {
    return values.editor_json;
  }

  return buildLessonRichTextDocumentFromText(contentText);
}

function getInspectorFormSnapshot(values) {
  const contentText = `${values?.content_text || ""}`.trim();

  return JSON.stringify({
    title: `${values?.title || ""}`.trim(),
    content_text: contentText,
    editor_json: stableStringifyLessonValue(normalizeInspectorSnapshotEditorJson(values)),
    is_required: Boolean(values?.is_required),
    is_active: Boolean(values?.is_active),
  });
}


function buildInspectorBlockPayload(block, values) {
  const contentJson =
    block?.content_json && typeof block.content_json === "object"
      ? { ...block.content_json }
      : {};

  const type = `${block?.block_type || "rich_text"}`.toLowerCase();
  const contentText = `${values.content_text || ""}`.trim();

  if (type === "rich_text" || type === "text") {
    contentJson.text = contentText;
    contentJson.editor_json =
      values.editor_json && typeof values.editor_json === "object"
        ? values.editor_json
        : buildLessonRichTextDocumentFromText(contentText);
    contentJson.editor_html = `${values.editor_html || ""}`;
  } else if (type === "video" || type === "file_link") {
    contentJson.url = contentText;
  } else if (type === "quiz") {
    contentJson.question = contentText;
  } else if (type === "assignment") {
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

function LessonStudioInspector({
  lesson,
  selectedBlock,
  onSaveBlock,
  savingBlockId,
  variant = "sidebar",
  onClose,
}) {
  const [form, setForm] = useState(() => buildInspectorBlockForm(selectedBlock));
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [savedFormSnapshotOverride, setSavedFormSnapshotOverride] = useState("");

  useEffect(() => {
    setForm(buildInspectorBlockForm(selectedBlock));
    setFormError("");
    setFormSuccess("");
    setSavedFormSnapshotOverride("");
  }, [selectedBlock?.id]);

  const contentFieldMeta = getInspectorContentFieldMeta(selectedBlock);
  const richTextEditorMode = isLessonRichTextBlock(selectedBlock);
  const saving = Boolean(selectedBlock?.id && savingBlockId === selectedBlock.id);
  const draftPayload = selectedBlock ? buildInspectorBlockPayload(selectedBlock, form) : null;
  const draftBlock = selectedBlock && draftPayload ? { ...selectedBlock, ...draftPayload } : null;
  const blockIssues = draftBlock ? getBlockValidationIssues(draftBlock) : [];
  const blockReady = Boolean(selectedBlock && blockIssues.length === 0);
  const savedFormSnapshot = useMemo(
    () => getInspectorFormSnapshot(buildInspectorBlockForm(selectedBlock)),
    [selectedBlock]
  );
  const currentFormSnapshot = useMemo(
    () => getInspectorFormSnapshot(form),
    [form]
  );
  const effectiveSavedFormSnapshot = savedFormSnapshotOverride || savedFormSnapshot;
  const hasUnsavedChanges = Boolean(
    selectedBlock && effectiveSavedFormSnapshot !== currentFormSnapshot
  );
  const saveFeedback = saving
    ? {
        label: "Сохраняем…",
        description: "Отправляем изменения блока на сервер.",
        className: "bg-blue-50 text-blue-900 ring-blue-200",
      }
    : formError
      ? {
          label: "Ошибка сохранения",
          description: formError,
          className: "bg-red-50 text-red-900 ring-red-200",
        }
      : formSuccess
        ? {
            label: "Сохранено",
            description: formSuccess,
            className: "bg-green-50 text-green-900 ring-green-200",
          }
        : hasUnsavedChanges
          ? {
              label: "Есть несохранённые изменения",
              description: "Нажмите «Сохранить изменения», чтобы обновить блок.",
              className: "bg-amber-50 text-amber-950 ring-amber-200",
            }
          : {
              label: "Сохранено",
              description: "Текущие поля совпадают с сохранённой версией блока.",
              className: "bg-slate-50 text-slate-700 ring-slate-200",
            };
  const inlineMode = variant === "inline";
  const inlineRichTextMode = inlineMode && richTextEditorMode;
  const inspectorTestId = inlineMode
    ? "lesson-studio-inline-inspector"
    : "lesson-studio-inspector";
  const inspectorClassName = inlineMode
    ? "mt-4 rounded-[1.5rem] bg-white p-3 ring-1 ring-blue-100"
    : "sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200";

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

  const handleRichTextChange = (nextValue) => {
    const nextText = `${nextValue?.text || ""}`;

    setForm((current) => {
      const nextForm = {
        ...current,
        content_text: nextText,
        editor_json:
          nextValue?.editor_json && typeof nextValue.editor_json === "object"
            ? nextValue.editor_json
            : buildLessonRichTextDocumentFromText(nextText),
        editor_html: `${nextValue?.editor_html || ""}`,
      };

      if (getInspectorFormSnapshot(current) === getInspectorFormSnapshot(nextForm)) {
        return current;
      }

      return nextForm;
    });

    setFormError("");
    setFormSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedBlock || saving) {
      return;
    }

    try {
      setFormError("");
      setFormSuccess("");
      await onSaveBlock(selectedBlock, form);
      setSavedFormSnapshotOverride(getInspectorFormSnapshot(form));
      setFormSuccess("Блок сохранён. Полотно обновлено.");
    } catch (err) {
      setFormError(err?.message || "Не удалось сохранить блок.");
    }
  };

  return (
    <aside data-testid={inspectorTestId} className={inspectorClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {inlineMode ? "Правка блока" : "Инспектор"}
          </div>
          <h2 className="mt-1 text-sm font-bold text-slate-900">
            {selectedBlock
              ? inlineMode
                ? getBlockDisplayTitle(selectedBlock)
                : "Редактирование блока"
              : "Настройки урока"}
          </h2>
        </div>

        {inlineMode && onClose ? (
          <button
            type="button"
            data-testid="lesson-studio-inline-inspector-close"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-white"
          >
            Отмена
          </button>
        ) : null}
      </div>

      {selectedBlock ? (
        <div
          data-testid="lesson-studio-inspector-save-status"
          role="status"
          aria-live="polite"
          className={`mt-3 rounded-2xl p-3 text-sm ring-1 ${saveFeedback.className}`}
        >
          <div className="font-black">{saveFeedback.label}</div>
          <div className="mt-1 text-xs leading-5 opacity-90">
            {saveFeedback.description}
          </div>
        </div>
      ) : null}

      {!inlineMode ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Выберите блок на полотне или в структуре. Основные поля можно менять здесь, без прокрутки к техническому редактору.
        </p>
      ) : null}

      {selectedBlock ? (
        <>
          <div
            data-testid="lesson-studio-inspector-readiness"
            className={`mt-3 rounded-2xl px-3 py-2 ring-1 ${
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
                <div className="mt-0.5 text-sm font-black text-slate-900">
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
              <div className="mt-1 text-xs leading-5 text-green-800">
                Все обязательные поля блока заполнены.
              </div>
            )}
          </div>

          <form
            data-testid="lesson-studio-inspector-form"
            onSubmit={handleSubmit}
            className="mt-3 space-y-3"
          >
            {inlineRichTextMode ? (
              <>
                <section
                  data-testid="lesson-studio-inspector-section-content"
                  className="rounded-[1.75rem] bg-white p-0"
                >
                  <div className="block" data-testid="lesson-studio-inspector-content-field">
                    <LessonRichTextEditor
                      key={selectedBlock?.id || "lesson-rich-text-editor"}
                      value={{
                        text: form.content_text,
                        editor_json: form.editor_json,
                        editor_html: form.editor_html,
                      }}
                      onChange={handleRichTextChange}
                      disabled={!selectedBlock || saving}
                      placeholder="Начните писать учебный текст. Выделите фразу для быстрых действий."
                    />
                  </div>
                </section>

                <details
                  data-testid="lesson-studio-text-block-settings"
                  className="rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-wide text-slate-600">
                    <span>Настройки блока</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold normal-case tracking-normal text-slate-500 ring-1 ring-slate-200">
                      Заголовок · обязательность · активность
                    </span>
                  </summary>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <label className="block" data-testid="lesson-studio-inspector-title-field">
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

                    <div
                      data-testid="lesson-studio-inspector-section-publication"
                      className="grid gap-2"
                    >
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
                  </div>
                </details>
              </>
            ) : (
              <>
                <section
                  data-testid="lesson-studio-inspector-section-main"
                  className="rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200"
                >
                  {!inlineMode ? (
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Основное
                    </div>
                  ) : null}

                  <label className="mt-3 block" data-testid="lesson-studio-inspector-title-field">
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
                  className="rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200"
                >
                  {!inlineMode ? (
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Контент
                    </div>
                  ) : null}

                  {richTextEditorMode ? (
                    <div className="mt-3 block" data-testid="lesson-studio-inspector-content-field">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {contentFieldMeta.label}
                      </span>

                      <LessonRichTextEditor
                        key={selectedBlock?.id || "lesson-rich-text-editor"}
                        value={{
                          text: form.content_text,
                          editor_json: form.editor_json,
                          editor_html: form.editor_html,
                        }}
                        onChange={handleRichTextChange}
                        disabled={!selectedBlock || saving}
                        placeholder="Начните писать учебный текст. Выделите фразу для быстрых действий."
                      />

                      {contentFieldMeta.help ? (
                        <span className="mt-2 block text-xs leading-5 text-slate-500">
                          {contentFieldMeta.help}
                        </span>
                      ) : null}
                    </div>
                  ) : (
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
                  )}
                </section>

                <section
                  data-testid="lesson-studio-inspector-section-publication"
                  className="rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200"
                >
                  {!inlineMode ? (
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Публикация
                    </div>
                  ) : null}

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
              </>
            )}

            {blockIssues.length ? (
              <div
                data-testid="lesson-studio-inspector-issues"
                className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200"
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

<div
              data-testid="lesson-studio-inspector-save-bar"
              className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-[1.25rem] bg-white/95 p-2 shadow-sm ring-1 ring-slate-200 backdrop-blur"
            >
              {inlineMode && onClose ? (
                <button
                  type="button"
                  data-testid="lesson-studio-inline-inspector-cancel"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  className="rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-white"
                >
                  Отмена
                </button>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Сохраняем..."
                  : hasUnsavedChanges
                    ? "Сохранить изменения"
                    : "Сохранить"}
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
  const [editingBlockId, setEditingBlockId] = useState("");
  const [viewMode, setViewMode] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blockActionId, setBlockActionId] = useState("");
  const [duplicatingBlockId, setDuplicatingBlockId] = useState("");
  const [deletingBlockId, setDeletingBlockId] = useState("");
  const [creatingTemplateKey, setCreatingTemplateKey] = useState("");
  const [error, setError] = useState("");
  const [showOnlyProblemBlocks, setShowOnlyProblemBlocks] = useState(false);

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

  // stage83_3_4_3_close_editor_on_preview_mode
  useEffect(() => {
    if (viewMode === "preview" && editingBlockId) {
      setEditingBlockId("");
    }
  }, [editingBlockId, viewMode]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  // stage83_3_4_3_clear_missing_selected_block
  useEffect(() => {
    if (!selectedBlockId) {
      return;
    }

    const exists = blocks.some((block) => block.id === selectedBlockId);

    if (!exists) {
      setSelectedBlockId("");
    }
  }, [blocks, selectedBlockId]);

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

  const handleFixFirstProblem = useCallback(() => {
    const firstProblemBlock = lessonReadiness?.problemBlocks?.[0]?.block || null;

    if (!firstProblemBlock?.id) {
      return;
    }

    setViewMode("editor");
    handleSelectBlock(firstProblemBlock.id);
    setEditingBlockId(firstProblemBlock.id);
  }, [handleSelectBlock, lessonReadiness]);

  const handleFixNextProblem = useCallback(() => {
    const problemBlocks = lessonReadiness?.problemBlocks || [];

    if (!problemBlocks.length) {
      return;
    }

    const currentProblemIndex = problemBlocks.findIndex(
      (item) => item.block?.id === selectedBlockId
    );
    const nextProblemIndex =
      currentProblemIndex >= 0
        ? (currentProblemIndex + 1) % problemBlocks.length
        : 0;
    const nextProblemBlock = problemBlocks[nextProblemIndex]?.block || null;

    if (!nextProblemBlock?.id) {
      return;
    }

    setViewMode("editor");
    handleSelectBlock(nextProblemBlock.id);
    setEditingBlockId(nextProblemBlock.id);
  }, [handleSelectBlock, lessonReadiness, selectedBlockId]);

  const handleQuickCreateBlock = useCallback(
    async (template, insertIndex = null) => {
      if (!lessonId || !template?.values) {
        setError("Не удалось определить урок или тип блока.");
        return;
      }

      const orderedBlocks = blocks
        .slice()
        .sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0));
      const numericInsertIndex = Number(insertIndex);
      const shouldInsertAtIndex = Number.isInteger(numericInsertIndex);
      const safeInsertIndex = shouldInsertAtIndex
        ? Math.min(Math.max(numericInsertIndex, 0), orderedBlocks.length)
        : null;
      const creatingKey = shouldInsertAtIndex
        ? getCanvasInsertTemplateKey(safeInsertIndex, template.key)
        : template.key;

      setCreatingTemplateKey(creatingKey);
      setError("");

      try {
        const position = getNextStudioBlockPosition(blocks);
        const createdBlock = await createAdminLessonBlock(
          lessonId,
          buildStudioQuickBlockPayload(template, position)
        );

        if (createdBlock?.id && shouldInsertAtIndex) {
          const reorderedBlocks = orderedBlocks.slice();
          reorderedBlocks.splice(safeInsertIndex, 0, createdBlock);

          const payload = reorderedBlocks.map((item, itemIndex) => ({
            id: item.id,
            position: itemIndex + 1,
          }));

          await reorderAdminLessonBlocks(lessonId, payload);
        }

        await loadBlocks();

        if (createdBlock?.id) {
          setSelectedBlockId(createdBlock.id);
          setEditingBlockId(createdBlock.id);
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
        error={error}
        mode={viewMode}
        onModeChange={setViewMode}
      />

      {viewMode !== "preview" ? (
        <LessonStudioReadinessChecklist
          report={lessonReadiness}
          selectedBlockId={selectedBlockId}
          onSelectBlock={(blockId) => {
            handleSelectBlock(blockId);
            setEditingBlockId(blockId || "");
          }}
          onModeChange={setViewMode}
          onFixFirstProblem={handleFixFirstProblem}
          onFixNextProblem={handleFixNextProblem}
        />
      ) : null}


      <div
        className={
          viewMode === "preview"
            ? "grid gap-5"
            : "grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]"
        }
      >
        {viewMode !== "preview" ? (
          <LessonStudioStructurePanel
            lesson={lesson}
            blocks={studioStructureBlocks}
            selectedBlockId={selectedBlockId}
            editingBlockId={editingBlockId}
            onSelectBlock={(blockId) => {
              handleSelectBlock(blockId);
              setEditingBlockId(blockId || "");
            }}
            mode={viewMode}
            quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}
            onCreateBlock={handleQuickCreateBlock}
            creatingTemplateKey={creatingTemplateKey}
            quickAddDisabled={blocksLoading || Boolean(creatingTemplateKey)}
            showOnlyProblems={showOnlyProblemBlocks}
            onToggleShowOnlyProblems={() => setShowOnlyProblemBlocks((current) => !current)}
          />
        ) : null}

        <section
          data-testid="lesson-studio-canvas"
          className={
            viewMode === "preview"
              ? "min-w-0 rounded-[2rem] bg-slate-50/70 p-4 sm:p-6"
              : "min-w-0 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
          }
        >
          <LessonStudioCanvas
            lesson={lesson}
            blocks={blocks}
            mode={viewMode}
            selectedBlockId={selectedBlockId}
            editingBlockId={editingBlockId}
            onSelectBlock={(blockId) => {
              handleSelectBlock(blockId);
              setEditingBlockId(blockId || "");
            }}
            onRefreshBlocks={loadBlocks}
            quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}
            onCreateBlock={handleQuickCreateBlock}
            onMoveBlock={handleMoveBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlock}
            onSaveBlock={handleInspectorSaveBlock}
            savingBlockId={blockActionId}
            creatingTemplateKey={creatingTemplateKey}
            movingBlockId={blockActionId}
            duplicatingBlockId={duplicatingBlockId}
            deletingBlockId={deletingBlockId}
            blocksLoading={blocksLoading}
          />
        </section>

      </div>
    </main>
  );
}

export default LessonStudioPage;
