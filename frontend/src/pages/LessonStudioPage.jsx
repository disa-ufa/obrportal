import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, ChevronRight, Clock3, Eye, FileText, GripVertical, Image as ImageIcon, ListChecks, PlayCircle, Save, Send, Star, Type } from "lucide-react";
import {
  buildApiUrl,
  createAdminLessonBlock,
  deleteAdminLessonBlock,
  getAdminCourseLessonDetail,
  getAdminLessonBlocks,
  publishAdminCourseLesson,
  unpublishAdminCourseLesson,
  reorderAdminLessonBlocks,
  updateAdminLessonBlock,
  uploadAdminLessonPresentationAsset,
  uploadAdminLessonAudioAsset,
  uploadAdminLessonImageAsset,
} from "../api/client";
import LessonRichTextEditor from "../components/admin/lesson-studio/LessonRichTextEditor";
import QuizBlockEditor from "../components/admin/lesson-studio/quiz/QuizBlockEditor";
import { createDefaultQuiz, normalizeQuizContent } from "../components/admin/lesson-studio/quiz/quizSchema";
import { validateQuizContent } from "../components/admin/lesson-studio/quiz/quizValidation";
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
    key: "audio",
    label: "\u0410\u0443\u0434\u0438\u043e",
    hint: "\u0410\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b \u0438\u043b\u0438 \u0441\u0441\u044b\u043b\u043a\u0430",
    tone: "green",
    values: {
      block_type: "audio",
      title: "\u0410\u0443\u0434\u0438\u043e",
      content_json: {
        material_kind: "audio",
        url: "",
        content_url: "",
        audio_url: "",
        stream_url: "",
        show_download: true,
      },
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
    key: "presentation",
    label: "Презентация",
    hint: "PDF в браузере",
    tone: "amber",
    values: {
      block_type: "presentation",
      title: "Презентация",
      content_json: {
        material_kind: "presentation",
        url: "",
        content_url: "",
        viewer_url: "",
        render_mode: "pdf",
        show_download: true,
      },
      is_required: true,
      is_active: true,
    },
  },
  {
    key: "image",
    label: "Изображение",
    hint: "Картинка по ссылке",
    tone: "violet",
    values: {
      block_type: "file_link",
      title: "Изображение",
      content_json: {
        material_kind: "image",
        kind: "image",
        media_type: "image",
        image_url: "",
        image_src: "",
        src: "",
        caption: "",
        alt_text: "",
        full_width: true,
        open_full_size: true,
      },
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
      content_json: createDefaultQuiz(),
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
    image: "Изображение",
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
    presentation: "Презентация",
    file: "Файл",
    link: "Ссылка",
    quiz: "Тест",
    assignment: "Задание",
    image: "Изображение",
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
    content.title,
    content.text,
    content.content_text,
    content.body,
    content.description,
    content.url,
    content.content_url,
    content.video_url,
    content.embed_code,
    content.video_embed_code,
    content.image_url,
    content.image_src,
    content.src,
    content.caption,
    content.alt_text,
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
    audio: {
      icon: "AUD",
      kicker: "\u0410\u0443\u0434\u0438\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
      description: "\u0410\u0443\u0434\u0438\u043e\u0431\u043b\u043e\u043a \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u0442 \u0437\u0430\u043f\u0438\u0441\u044c, \u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u0430\u0436 \u0438\u043b\u0438 \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435 \u043f\u043e\u044f\u0441\u043d\u0435\u043d\u0438\u0435.",
      surfaceClass: "bg-green-50 text-green-900 ring-green-200",
    },
    file_link: {
      icon: "↗",
      kicker: "Материал для перехода",
      description: "Ссылка на файл, презентацию, документ или внешний ресурс.",
      surfaceClass: "bg-blue-50 text-blue-900 ring-blue-200",
    },
    presentation: {
      icon: "PPT",
      kicker: "Презентация",
      description: "PDF-презентация с просмотром прямо внутри урока.",
      surfaceClass: "bg-amber-50 text-amber-900 ring-amber-200",
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
    image: {
      icon: "IMG",
      kicker: "Учебное изображение",
      description: "Иллюстрация, схема или скриншот внутри урока.",
      surfaceClass: "bg-violet-50 text-violet-900 ring-violet-200",
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

  if (isLessonImageBlock(block)) {
    return metaByType.image;
  }

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

  if (value.startsWith("#")) {
    return value;
  }

  if (value.startsWith("/api/")) {
    return buildApiUrl(value);
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

    if (!allowedProtocols.includes(url.protocol)) {
      return "";
    }

    if (
      typeof window !== "undefined" &&
      window.location?.host &&
      url.host === window.location.host &&
      (url.protocol === "http:" || url.protocol === "https:")
    ) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return value;
  } catch {
    return "";
  }
}

const LESSON_RICH_TEXT_ALLOWED_COLORS = new Set([
  "#dc2626",
  "#d97706",
  "#16a34a",
  "#2563eb",
]);

function getSafeLessonRichTextColor(value) {
  const color = `${value || ""}`.trim().toLowerCase();

  return LESSON_RICH_TEXT_ALLOWED_COLORS.has(color) ? color : "";
}

function getLessonRichTextAlignClass(value) {
  const align = `${value || ""}`.trim().toLowerCase();

  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  if (align === "justify") return "text-justify";

  return "text-left";
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

    if (mark.type === "textStyle") {
      const safeColor = getSafeLessonRichTextColor(mark.attrs?.color);

      if (!safeColor) {
        return currentChildren;
      }

      return (
        <span key={markKey} style={{ color: safeColor }}>
          {currentChildren}
        </span>
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
    const alignClass = getLessonRichTextAlignClass(node.attrs?.textAlign);

    return (
      <p key={key} className={`text-base leading-8 text-slate-700 ${alignClass}`}>
        {children?.length ? children : <br />}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level || 2);
    const HeadingTag = level >= 3 ? "h3" : "h2";
    const alignClass = getLessonRichTextAlignClass(node.attrs?.textAlign);
    const className =
      level >= 3
        ? `mt-5 text-lg font-black leading-8 text-slate-950 first:mt-0 ${alignClass}`
        : `mt-6 text-2xl font-black leading-9 text-slate-950 first:mt-0 ${alignClass}`;

    return (
      <HeadingTag key={key} className={className}>
        {children}
      </HeadingTag>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="ml-6 list-disc space-y-2 text-base leading-8 text-slate-700">
        {children}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="ml-6 list-decimal space-y-2 text-base leading-8 text-slate-700">
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
        className="rounded-2xl border-l-4 border-blue-300 bg-blue-50 px-5 py-4 text-base italic leading-8 text-slate-700"
      >
        {children}
      </blockquote>
    );
  }

  if (node.type === "codeBlock") {
    return (
      <pre
        key={key}
        className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-50 shadow-inner"
      >
        <code>{getLessonRichTextPlainText(node)}</code>
      </pre>
    );
  }

  if (children?.length) {
    return (
      <div key={key} className="text-base leading-8 text-slate-700">
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
        className={learnerMode ? "space-y-4 break-words text-slate-800" : "space-y-3 break-words"}
      >
        {empty ? (
          <p className="text-base leading-8 text-slate-500">
            {fallbackText || "Учебный текст пока не заполнен."}
          </p>
        ) : (
          nodes.map((node, index) => renderLessonRichTextNode(node, `rich-text-preview-${index}`))
        )}
      </div>
    </div>
  );
}




function isLessonCalloutBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();

  return type === "callout";
}

function getCalloutBlockContent(block) {
  return safeParseJson(block?.content_json);
}

function getCalloutBlockText(block, previewValue = "") {
  const content = getCalloutBlockContent(block);

  return `${content.text || content.content_text || content.body || previewValue || ""}`.trim();
}

function LessonCalloutCanvasPreview({ block, previewValue, learnerMode = false }) {
  const textValue = getCalloutBlockText(block, previewValue);
  const ready = Boolean(textValue);
  const title = `${block?.title || "Важно"}`.trim() || "Важно";

  return (
    <div
      data-testid="lesson-studio-callout-preview"
      className={
        learnerMode
          ? "mt-5 rounded-3xl border-l-4 border-indigo-300 bg-indigo-50 p-5 shadow-sm ring-1 ring-indigo-100"
          : "mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-4 shadow-sm ring-1 ring-indigo-100/70"
      }
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-black text-indigo-700 shadow-sm ring-1 ring-indigo-200">
            !
          </div>

          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">
              Врезка
            </div>
            <div className="mt-1 text-lg font-black leading-7 text-slate-950">
              {title}
            </div>
          </div>
        </div>

        {ready ? (
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
            ✓ Готово
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Требуется текст
          </span>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-base font-semibold leading-8 text-slate-700 ring-1 ring-indigo-100">
        {ready ? (
          <div className="whitespace-pre-wrap break-words">{textValue}</div>
        ) : (
          <div className="text-slate-400">
            Добавьте короткое важное примечание, предупреждение или подсказку.
          </div>
        )}
      </div>

      <div className="mt-3 text-xs leading-5 text-indigo-700/80">
        Врезка выделяет ключевую мысль и помогает обучающемуся обратить внимание на важный фрагмент урока.
      </div>
    </div>
  );
}



function isLessonImageBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();
  const content = safeParseJson(block?.content_json);
  const kind = `${content.material_kind || content.kind || content.media_type || ""}`.toLowerCase();
  const imageUrl = `${content.image_url || content.image_src || content.src || ""}`.trim();
  const title = `${block?.title || content.title || ""}`.toLowerCase();

  return (
    type === "image" ||
    type === "picture" ||
    (
      (type === "file_link" || type === "file" || type === "link") &&
      (kind === "image" || Boolean(imageUrl) || title.includes("изображ"))
    )
  );
}

function getImageBlockContent(block) {
  return safeParseJson(block?.content_json);
}

function getImageBlockUrl(block) {
  const content = getImageBlockContent(block);

  return `${content.image_url || content.image_src || content.src || content.url || content.content_url || ""}`.trim();
}

function getImageBlockCaption(block) {
  const content = getImageBlockContent(block);

  return `${content.caption || content.description || ""}`.trim();
}

function getImageBlockAlt(block) {
  const content = getImageBlockContent(block);

  return `${content.alt_text || content.alt || content.caption || block?.title || "Изображение урока"}`.trim();
}

function getImageHostLabel(value) {
  const source = `${value || ""}`.trim();

  if (!source) return "—";
  if (source.startsWith("/") || source.startsWith("#")) return "Внутренний ресурс";

  try {
    const url = new URL(source);
    return url.hostname.replace(/^www\./, "") || "Изображение";
  } catch {
    return "Изображение";
  }
}

function LessonImageCanvasPreview({ block, previewValue, learnerMode = false }) {
  const sourceValue = getImageBlockUrl(block) || `${previewValue || ""}`.trim();
  const safeSrc = getSafeLessonRichTextHref(sourceValue);
  const ready = Boolean(safeSrc);
  const title = `${block?.title || "Изображение"}`.trim() || "Изображение";
  const caption = getImageBlockCaption(block);
  const altText = getImageBlockAlt(block);
  const hostLabel = getImageHostLabel(sourceValue);
  const content = getImageBlockContent(block);
  const openFullSize = content.open_full_size !== false;
  const fullWidth = content.full_width !== false;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [safeSrc]);

  return (
    <div
      data-testid="lesson-studio-image-preview"
      className={
        learnerMode
          ? "mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          : "mt-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5"
      }
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">
            {ready ? "Изображение по ссылке" : "Изображение не настроено"}
          </div>
          <div className="mt-1 max-w-3xl break-words text-xs leading-5 text-slate-500">
            {ready ? sourceValue : "Добавьте прямую ссылку на картинку или открытый графический материал."}
          </div>
        </div>

        {ready && !imageFailed ? (
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
            ✓ Изображение найдено
          </span>
        ) : ready && imageFailed ? (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Не удалось загрузить
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Требуется ссылка
          </span>
        )}
      </div>

      <div className={`mt-4 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200 ${fullWidth ? "w-full" : "mx-auto max-w-3xl"}`}>
        {ready && !imageFailed ? (
          <img
            src={safeSrc}
            alt={altText}
            onError={() => setImageFailed(true)}
            className="max-h-[520px] w-full object-contain"
          />
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-lg font-black text-violet-700 ring-1 ring-violet-200">
              IMG
            </div>
            <div className="mt-4 text-base font-black text-slate-950">
              {ready ? "Изображение не загрузилось" : "Добавьте изображение"}
            </div>
            <div className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {ready
                ? "Проверьте, что ссылка открыта для просмотра и ведёт именно на изображение."
                : "Вставьте ссылку на JPG, PNG, WebP, SVG или другое открытое изображение."}
            </div>
          </div>
        )}
      </div>

      {caption ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-slate-200">
          {caption}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-slate-500">
          Источник: {ready ? hostLabel : "—"}. Alt-текст: {altText || "не указан"}.
        </div>

        {ready && openFullSize ? (
          <a
            href={safeSrc}
            target={safeSrc.startsWith("/") || safeSrc.startsWith("#") ? undefined : "_blank"}
            rel={safeSrc.startsWith("/") || safeSrc.startsWith("#") ? undefined : "noreferrer"}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            Открыть изображение
          </a>
        ) : null}
      </div>
    </div>
  );
}


function isLessonFileLinkBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();

  return type === "file_link" || type === "file" || type === "link";
}

function getFileLinkBlockContent(block) {
  return safeParseJson(block?.content_json);
}

function getFileLinkBlockUrl(block) {
  const content = getFileLinkBlockContent(block);

  return `${content.url || content.content_url || content.file_url || content.href || content.link || ""}`.trim();
}

function isLessonPresentationBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();

  return type === "presentation";
}

function getPresentationBlockContent(block) {
  return safeParseJson(block?.content_json);
}

function getPresentationBlockUrl(block) {
  const content = getPresentationBlockContent(block);

  return `${content.viewer_url || content.url || content.content_url || content.file_url || content.href || ""}`.trim();
}

function getPresentationOriginalUrl(block) {
  const content = getPresentationBlockContent(block);

  return `${content.original_url || content.download_url || content.url || content.content_url || ""}`.trim();
}

function getFileLinkHostLabel(value) {
  const source = `${value || ""}`.trim();

  if (!source) return "—";
  if (source.startsWith("/") || source.startsWith("#")) return "Внутренняя ссылка";

  try {
    const url = new URL(source);
    return url.hostname.replace(/^www\./, "") || "Ссылка";
  } catch {
    return "Ссылка";
  }
}

function getFileLinkKindMeta(value) {
  const source = `${value || ""}`.trim();
  const lowerSource = source.split("?")[0].split("#")[0].toLowerCase();

  if (lowerSource.endsWith(".pdf")) {
    return {
      icon: "PDF",
      label: "PDF-документ",
      hint: "Документ для чтения или скачивания",
      tone: "red",
    };
  }

  if (lowerSource.endsWith(".doc") || lowerSource.endsWith(".docx")) {
    return {
      icon: "DOC",
      label: "Документ Word",
      hint: "Текстовый учебный материал",
      tone: "blue",
    };
  }

  if (lowerSource.endsWith(".ppt") || lowerSource.endsWith(".pptx")) {
    return {
      icon: "PPT",
      label: "Презентация",
      hint: "Слайды или демонстрационный материал",
      tone: "amber",
    };
  }

  if (lowerSource.endsWith(".xls") || lowerSource.endsWith(".xlsx")) {
    return {
      icon: "XLS",
      label: "Таблица",
      hint: "Табличный материал или форма",
      tone: "green",
    };
  }

  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(lowerSource)) {
    return {
      icon: "IMG",
      label: "Изображение",
      hint: "Графический материал",
      tone: "violet",
    };
  }

  if (/\.(zip|rar|7z)$/i.test(lowerSource)) {
    return {
      icon: "ZIP",
      label: "Архив",
      hint: "Набор файлов для скачивания",
      tone: "slate",
    };
  }

  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");

    if (host.includes("disk.yandex") || host.includes("drive.google") || host.includes("docs.google")) {
      return {
        icon: "☁",
        label: "Облачный материал",
        hint: "Файл или документ во внешнем хранилище",
        tone: "blue",
      };
    }
  } catch {
    // ignore
  }

  return {
    icon: "↗",
    label: "Внешняя ссылка",
    hint: "Материал откроется по ссылке",
    tone: "blue",
  };
}

function getFileLinkKindToneClass(tone) {
  const classes = {
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    green: "bg-green-50 text-green-700 ring-green-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };

  return classes[tone] || classes.blue;
}

function LessonPresentationCanvasPreview({ block, previewValue, learnerMode = false }) {
  const content = getPresentationBlockContent(block);
  const sourceValue = getPresentationBlockUrl(block) || `${previewValue || ""}`.trim();
  const safeHref = getSafeLessonRichTextHref(sourceValue);
  const originalUrl = getPresentationOriginalUrl(block);
  const safeOriginalHref = getSafeLessonRichTextHref(originalUrl);
  const ready = Boolean(safeHref);
  const title = `${block?.title || content.title || content.original_filename || "Презентация"}`.trim() || "Презентация";
  const filename = `${content.original_filename || ""}`.trim();
  const hostLabel = getFileLinkHostLabel(sourceValue);
  const showDownload = content.show_download !== false;
  const frameHeightClass = learnerMode ? "h-[760px]" : "h-[620px]";

  return (
    <div
      data-testid="lesson-studio-presentation-preview"
      className={
        learnerMode
          ? "mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          : "mt-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5"
      }
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-600">
            {ready ? "Презентация для просмотра в браузере" : "Презентация не настроена"}
          </div>
          <div className="mt-1 max-w-3xl break-words text-xs leading-5 text-slate-500">
            {ready ? sourceValue : "Добавьте прямую ссылку на PDF-файл презентации."}
          </div>
        </div>

        {ready ? (
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
            ✓ Готово
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Требуется PDF
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        {ready ? (
          <iframe
            title={title}
            src={safeHref}
            className={`${frameHeightClass} w-full bg-white`}
          />
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-slate-50 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
              PPT
            </div>
            <div className="mt-4 text-base font-black text-slate-950">
              Добавьте презентацию
            </div>
            <div className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              На первом этапе укажите ссылку на PDF. После этого обучающийся увидит презентацию прямо в уроке.
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-slate-500">
          Источник: {ready ? hostLabel : "—"}{filename ? `. Файл: ${filename}` : ""}.
        </div>

        <div className="flex flex-wrap gap-2">
          {ready ? (
            <a
              href={safeHref}
              target={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "_blank"}
              rel={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "noreferrer"}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
            >
              Открыть на весь экран
            </a>
          ) : null}

          {ready && showDownload && safeOriginalHref ? (
            <a
              href={safeOriginalHref}
              target={safeOriginalHref.startsWith("/") || safeOriginalHref.startsWith("#") ? undefined : "_blank"}
              rel={safeOriginalHref.startsWith("/") || safeOriginalHref.startsWith("#") ? undefined : "noreferrer"}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              Скачать
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function LessonFileLinkCanvasPreview({ block, previewValue, learnerMode = false }) {
  const sourceValue = getFileLinkBlockUrl(block) || `${previewValue || ""}`.trim();
  const safeHref = getSafeLessonRichTextHref(sourceValue);
  const ready = Boolean(safeHref);
  const title = `${block?.title || "Файл или ссылка"}`.trim() || "Файл или ссылка";
  const kind = getFileLinkKindMeta(sourceValue);
  const hostLabel = getFileLinkHostLabel(sourceValue);

  return (
    <div
      data-testid="lesson-studio-file-link-preview"
      className={
        learnerMode
          ? "mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          : "mt-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-black/5"
      }
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-sm ring-1 ${getFileLinkKindToneClass(kind.tone)}`}
          >
            {kind.icon}
          </div>

          <div className="min-w-0">
            <div className="text-base font-black text-slate-950">
              {title}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              {ready ? kind.label : "Материал не настроен"}
            </div>
            <div className="mt-1 max-w-3xl break-words text-xs leading-5 text-slate-500">
              {ready ? sourceValue : "Добавьте ссылку на файл, облачный документ или внешний ресурс."}
            </div>
          </div>
        </div>

        {ready ? (
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
            ✓ Материал готов
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Требуется ссылка
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {[
          ["Тип материала", ready ? kind.label : "—"],
          ["Источник", ready ? hostLabel : "—"],
          ["Описание", ready ? kind.hint : "Ссылка пока не добавлена"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[11rem_minmax(0,1fr)] border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <div className="text-sm font-semibold text-slate-500">{label}</div>
            <div className="break-words text-sm font-semibold text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-slate-500">
          Материал откроется в новой вкладке. Проверьте, что у обучающихся есть доступ по ссылке.
        </div>

        {ready ? (
          <a
            href={safeHref}
            target={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "_blank"}
            rel={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "noreferrer"}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            Открыть материал
          </a>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-5 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
            Открыть материал
          </span>
        )}
      </div>
    </div>
  );
}


function LessonVideoCanvasPreview({ block, previewValue, learnerMode = false }) {
  const content = getVideoBlockContent(block);
  const sourceValue = getVideoBlockSourceValue(block) || previewValue;
  const previewEmbedUrl = getVideoPreviewEmbedUrl(sourceValue);
  const previewReady = Boolean(previewEmbedUrl);
  const allowFullscreen = content.allow_fullscreen !== false;
  const videoTitle = `${block?.title || content.title || "Видео"}`.trim() || "Видео";
  const videoHost = getVideoHostLabel(sourceValue || previewEmbedUrl);
  const insertTypeLabel = getVideoBlockSourceType(block) === "embed" ? "Код вставки" : "Ссылка";

  return (
    <div
      data-testid="lesson-studio-video-preview"
      className={
        learnerMode
          ? "mt-5 overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          : "mt-4 overflow-hidden rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-black/5"
      }
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950">
            Видео для просмотра
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-slate-500">
            {previewReady ? sourceValue : "Добавьте ссылку или код вставки"}
          </div>
        </div>

        {previewReady ? (
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
            ✓ Видео найдено
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            Нет источника
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 shadow-sm ring-1 ring-slate-900/10">
        <div className="relative aspect-[16/9] min-h-[220px] bg-slate-950">
          {previewReady ? (
            <iframe
              title={videoTitle}
              src={previewEmbedUrl}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen={allowFullscreen}
            />
          ) : (
            <>
              <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-blue-700 shadow-xl">
                  ▶
                </div>

                <div className="mt-4 text-sm font-semibold text-white/90">
                  Видео пока не настроено
                </div>
                <div className="mt-1 max-w-md text-xs leading-5 text-white/60">
                  Вставьте ссылку YouTube, Rutube, VK Видео, Vimeo или iframe-код.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {[
          ["Название видео", previewReady ? videoTitle : "—"],
          ["Источник", previewReady ? videoHost : "—"],
          ["Тип вставки", previewReady ? insertTypeLabel : "—"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[10rem_minmax(0,1fr)] border-b border-slate-100 px-4 py-3 last:border-b-0"
          >
            <div className="text-sm font-semibold text-slate-500">{label}</div>
            <div className="break-words text-sm font-semibold text-slate-800">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}





function getQuizQuestionTypeLabel(type) {
  const labels = {
    single_choice: "\u041e\u0434\u0438\u043d \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442",
    multiple_choice: "\u041d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445 \u043e\u0442\u0432\u0435\u0442\u043e\u0432",
    true_false: "\u0412\u0435\u0440\u043d\u043e / \u043d\u0435\u0432\u0435\u0440\u043d\u043e",
    short_text: "\u041a\u043e\u0440\u043e\u0442\u043a\u0438\u0439 \u0442\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u043e\u0442\u0432\u0435\u0442",
    number: "\u0427\u0438\u0441\u043b\u043e\u0432\u043e\u0439 \u043e\u0442\u0432\u0435\u0442",
  };

  return labels[type] || "\u0412\u043e\u043f\u0440\u043e\u0441";
}

function getQuizQuestionPreviewText(question) {
  const type = `${question?.type || ""}`.toLowerCase();

  if (type === "single_choice" || type === "multiple_choice") {
    const options = Array.isArray(question?.options) ? question.options : [];
    const filledOptions = options
      .map((option) => `${option?.text || ""}`.trim())
      .filter(Boolean);

    return filledOptions.length
      ? `\u0412\u0430\u0440\u0438\u0430\u043d\u0442\u044b: ${filledOptions.slice(0, 4).join(", ")}${filledOptions.length > 4 ? "\u2026" : ""}`
      : "\u0412\u0430\u0440\u0438\u0430\u043d\u0442\u044b \u043e\u0442\u0432\u0435\u0442\u0430 \u0435\u0449\u0451 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b.";
  }

  if (type === "true_false") {
    return `\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442: ${question?.correct_value ? "\u0412\u0435\u0440\u043d\u043e" : "\u041d\u0435\u0432\u0435\u0440\u043d\u043e"}.`;
  }

  if (type === "short_text") {
    const answers = Array.isArray(question?.accepted_answers)
      ? question.accepted_answers.map((answer) => `${answer || ""}`.trim()).filter(Boolean)
      : [];

    return answers.length
      ? `\u0414\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0435 \u043e\u0442\u0432\u0435\u0442\u044b: ${answers.slice(0, 3).join(", ")}${answers.length > 3 ? "\u2026" : ""}`
      : "\u0414\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0435 \u043e\u0442\u0432\u0435\u0442\u044b \u0435\u0449\u0451 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b.";
  }

  if (type === "number") {
    const numberValue = `${question?.correct_number ?? ""}`.trim();
    const tolerance = Number(question?.tolerance || 0);

    return numberValue
      ? `\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0435 \u0447\u0438\u0441\u043b\u043e: ${numberValue}${tolerance > 0 ? `, \u043f\u043e\u0433\u0440\u0435\u0448\u043d\u043e\u0441\u0442\u044c \u00b1${tolerance}` : ""}.`
      : "\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0435 \u0447\u0438\u0441\u043b\u043e \u0435\u0449\u0451 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e.";
  }

  return "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u0442\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0432\u043e\u043f\u0440\u043e\u0441\u0430.";
}

function LessonQuizCanvasPreview({ block, previewValue, learnerMode = false }) {
  const quiz = normalizeQuizContent(safeParseJson(block?.content_json));
  const validation = validateQuizContent(quiz);
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const questionCount = validation.questionCount || questions.length;
  const totalPoints = validation.totalPoints || 0;
  const passScore = Number(quiz.grading?.pass_score_percent);
  const attemptsLabel = quiz.behavior?.allow_retry
    ? `${quiz.behavior?.max_attempts || 1} \u043f\u043e\u043f\u044b\u0442\u043a.`
    : "1 \u043f\u043e\u043f\u044b\u0442\u043a\u0430";
  const visibleQuestions = questions.slice(0, learnerMode ? 5 : 3);

  return (
    <div
      data-testid="lesson-studio-quiz-preview"
      className={
        learnerMode
          ? "mt-5 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100"
          : "mt-3 rounded-2xl bg-white/85 p-4 ring-1 ring-black/5"
      }
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className={learnerMode ? "text-base font-black text-slate-950" : "text-sm font-black text-slate-950"}>
            {quiz.title || previewValue || "\u041f\u0440\u043e\u0432\u0435\u0440\u043e\u0447\u043d\u044b\u0439 \u0442\u0435\u0441\u0442"}
          </div>

          {quiz.description ? (
            <div className={learnerMode ? "mt-2 text-sm leading-6 text-slate-700" : "mt-1 text-xs leading-5 text-slate-600"}>
              {quiz.description}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            {questionCount} {"\u0432\u043e\u043f\u0440\u043e\u0441(\u043e\u0432)"}
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
            {totalPoints} {"\u0431\u0430\u043b\u043b(\u043e\u0432)"}
          </span>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
              validation.isValid
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-amber-50 text-amber-800 ring-amber-200"
            }`}
          >
            {validation.isValid ? "\u0413\u043e\u0442\u043e\u0432" : `${validation.issues.length} \u043f\u0440\u043e\u0431\u043b\u0435\u043c`}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-amber-100/60 px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
            {"\u041f\u0440\u043e\u0445\u043e\u0434\u043d\u043e\u0439 \u0431\u0430\u043b\u043b"}
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {Number.isFinite(passScore) ? `${passScore}%` : "\u2014"}
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-amber-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {"\u041f\u043e\u043f\u044b\u0442\u043a\u0438"}
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {attemptsLabel}
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-amber-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {"\u041f\u0435\u0440\u0435\u043c\u0435\u0448\u0438\u0432\u0430\u043d\u0438\u0435"}
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {quiz.behavior?.shuffle_questions || quiz.behavior?.shuffle_answers ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u043e" : "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e"}
          </div>
        </div>
      </div>

      {visibleQuestions.length ? (
        <div className="mt-4 space-y-2">
          {visibleQuestions.map((question, index) => (
            <div
              key={question.id || index}
              className="rounded-2xl bg-white/85 px-3 py-3 ring-1 ring-amber-100"
            >
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 text-sm font-bold text-slate-900">
                  {index + 1}. {question.title || "\u0412\u043e\u043f\u0440\u043e\u0441 \u0431\u0435\u0437 \u0442\u0435\u043a\u0441\u0442\u0430"}
                </div>
                <div className="shrink-0 text-xs font-semibold text-slate-500">
                  {getQuizQuestionTypeLabel(question.type)} ? {question.points || 0} {"\u0431\u0430\u043b\u043b."}
                </div>
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-500">
                {getQuizQuestionPreviewText(question)}
              </div>
            </div>
          ))}

          {questions.length > visibleQuestions.length ? (
            <div className="rounded-2xl bg-white/60 px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-amber-100">
              {"\u0415\u0449\u0451 \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432:"} {questions.length - visibleQuestions.length}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
          {"\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u0432\u043e\u043f\u0440\u043e\u0441."}
        </div>
      )}

      {!validation.isValid ? (
        <div className="mt-4 rounded-2xl bg-amber-100/70 px-3 py-3 text-xs font-semibold text-amber-900">
          {validation.issues.slice(0, 3).join(" ? ")}
          {validation.issues.length > 3 ? " ? \u2026" : ""}
        </div>
      ) : null}
    </div>
  );
}




function isLessonAudioBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();

  return type === "audio";
}

function getAudioBlockContent(block) {
  return safeParseJson(block?.content_json);
}

function getAudioBlockUrl(block) {
  const content = getAudioBlockContent(block);

  return `${content.audio_url || content.stream_url || content.url || content.content_url || content.src || content.file_url || content.href || ""}`.trim();
}

function getAudioBlockDownloadUrl(block) {
  const content = getAudioBlockContent(block);

  return `${content.original_url || content.download_url || getAudioBlockUrl(block) || ""}`.trim();
}

function getAudioBlockFilename(block) {
  const content = getAudioBlockContent(block);

  return `${content.original_filename || content.filename || block?.title || "audio"}`.trim();
}

function LessonAudioCanvasPreview({ block, previewValue, learnerMode = false }) {
  const sourceValue = getAudioBlockUrl(block) || `${previewValue || ""}`.trim();
  const safeSrc = getSafeLessonRichTextHref(sourceValue);
  const downloadUrl = getSafeLessonRichTextHref(getAudioBlockDownloadUrl(block));
  const ready = Boolean(safeSrc);
  const title = `${block?.title || "\u0410\u0443\u0434\u0438\u043e"}`.trim() || "\u0410\u0443\u0434\u0438\u043e";
  const filename = getAudioBlockFilename(block);

  return (
    <div
      data-testid="lesson-studio-audio-preview"
      className={
        learnerMode
          ? "mt-5 rounded-3xl bg-green-50 p-5 ring-1 ring-green-100"
          : "mt-3 rounded-2xl bg-white/90 p-4 ring-1 ring-black/5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={learnerMode ? "text-base font-black text-slate-950" : "text-sm font-black text-slate-950"}>
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {ready ? filename : "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0430\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b \u0438\u043b\u0438 \u0441\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e."}
          </div>
        </div>

        {ready ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
            {"\u2713 \u0410\u0443\u0434\u0438\u043e \u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            {"\u041d\u0435\u0442 \u0430\u0443\u0434\u0438\u043e"}
          </span>
        )}
      </div>

      <div className="mt-4">
        {ready ? (
          <audio controls preload="metadata" src={safeSrc} className="w-full">
            {"\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0430\u0443\u0434\u0438\u043e\u043f\u043b\u0435\u0435\u0440."}
          </audio>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
            {"\u0410\u0443\u0434\u0438\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e\u043a\u0430 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d."}
          </div>
        )}
      </div>

      {ready && downloadUrl ? (
        <div className="mt-3">
          <a
            href={downloadUrl}
            target={downloadUrl.startsWith("/") || downloadUrl.startsWith("#") ? undefined : "_blank"}
            rel={downloadUrl.startsWith("/") || downloadUrl.startsWith("#") ? undefined : "noreferrer"}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-green-700 ring-1 ring-green-200 transition hover:bg-green-50"
          >
            {"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0430\u0443\u0434\u0438\u043e"}
          </a>
        </div>
      ) : null}
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
          ? "py-1 text-base leading-8 text-slate-800"
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
        <LessonVideoCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : type === "audio" ? (
        <LessonAudioCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : type === "presentation" ? (
        <LessonPresentationCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : isLessonImageBlock(block) ? (
        <LessonImageCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : type === "file_link" || type === "file" || type === "link" ? (
        <LessonFileLinkCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : type === "quiz" ? (
        <LessonQuizCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : type === "assignment" ? (
        <div
          data-testid="lesson-studio-assignment-preview"
          className={
            learnerMode
              ? "mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200"
              : "mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
          }
        >
          <div className={learnerMode ? "text-base font-black text-slate-950" : "text-sm font-bold"}>
            Что нужно сделать
          </div>
          <div className={learnerMode ? "mt-2 text-base leading-8 text-slate-800" : "mt-1 text-sm"}>
            {previewValue}
          </div>
        </div>
      ) : type === "callout" ? (
        <LessonCalloutCanvasPreview
          block={block}
          previewValue={previewValue}
          learnerMode={learnerMode}
        />
      ) : (
        <div
          data-testid="lesson-studio-text-preview"
          className={
            learnerMode
              ? "mt-4 text-base leading-8 text-slate-800"
              : "mt-3 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5"
          }
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

  if (type === "video" && !getVideoBlockSourceValue({ content_json: content })) {
    issues.push("нет источника видео");
  }

  if (type === "presentation" && !getPresentationBlockUrl({ content_json: content })) {
    issues.push("нет ссылки на презентацию");
  }

  if (type === "audio" && !getAudioBlockUrl({ content_json: content })) {
    issues.push("\u043d\u0435\u0442 \u0430\u0443\u0434\u0438\u043e");
  }

  if ((type === "file_link" || type === "file" || type === "link") && !isLessonImageBlock({ ...block, content_json: content }) && !`${content.url || content.content_url || ""}`.trim()) {
    issues.push("нет ссылки");
  }

  if (isLessonImageBlock({ ...block, content_json: content }) && !`${content.image_url || content.image_src || content.src || content.url || content.content_url || ""}`.trim()) {
    issues.push("нет изображения");
  }

  if (type === "quiz") {
    const quizValidation = validateQuizContent(content);

    if (!quizValidation.isValid) {
      issues.push(...quizValidation.issues);
    }
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
      className={`rounded-3xl p-3 shadow-sm ring-1 ${statusClass}`}
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


function LessonStudioTopbar({ lesson, error, mode = "editor", onModeChange, readinessReport, publishing = false, onPublish, unpublishing = false, onUnpublish }) {
  const courseId =
    lesson?.course_id ||
    lesson?.courseId ||
    lesson?.course?.id ||
    lesson?.course?.course_id ||
    "";

  const courseHref = courseId ? `/admin/courses#course-${courseId}` : "/admin/courses";
  const previewMode = mode === "preview";
  const published = lesson?.status === "published" && Boolean(lesson?.published_version_id);
  const readyForPublish = Boolean(readinessReport?.ready);
  const canPublish = !publishing && !unpublishing && typeof onPublish === "function";
  const canUnpublish = published && !publishing && !unpublishing && typeof onUnpublish === "function";
  const publishButtonLabel = publishing
    ? "\u041f\u0443\u0431\u043b\u0438\u043a\u0443\u0435\u043c..."
    : published
      ? "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u0437\u0430\u043d\u043e\u0432\u043e"
      : "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c";
  const publishButtonTitle = readyForPublish
    ? "\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u0443\u0440\u043e\u043a \u0434\u043b\u044f \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0438\u0445\u0441\u044f"
    : "\u041f\u0435\u0440\u0435\u0434 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0435\u0439 \u0438\u0441\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438 \u0443\u0440\u043e\u043a\u0430";
  const unpublishButtonLabel = "\u0421\u043d\u044f\u0442\u044c \u0441 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438";
  const courseTitle =
    lesson?.course_title ||
    lesson?.course?.title ||
    lesson?.program_title ||
    "Программа";
  const moduleTitle = lesson?.module_title || lesson?.module?.title || "Модуль";
  const lessonTitle = lesson?.title || "Урок без названия";

  const handleSaveShortcut = () => {
    if (typeof document === "undefined") {
      return;
    }

    const saveButton = document.querySelector(
      '[data-testid="lesson-studio-inspector-save-bar"] button[type="submit"]'
    );

    if (saveButton && typeof saveButton.click === "function") {
      saveButton.click();
    }
  };

  return (
    <section
      data-testid="lesson-studio-topbar"
      className="rounded-2xl bg-white/95 p-5 shadow-sm ring-1 ring-slate-200 backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <a
          href="/admin/courses"
          data-testid="lesson-studio-back-to-courses"
          className="transition hover:text-blue-700"
        >
          Программы
        </a>
        <span>/</span>
        <a href={courseHref} className="max-w-[18rem] truncate transition hover:text-blue-700">
          {courseTitle}
        </a>
        <span>/</span>
        <span className="max-w-[14rem] truncate">{moduleTitle}</span>
        <span>/</span>
        <span className="max-w-[18rem] truncate text-blue-700">Lesson Studio</span>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              data-testid="lesson-studio-title"
              className="text-3xl font-black leading-tight text-slate-950"
            >
              Конструктор урока
            </h1>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
              <span aria-hidden="true" className="text-emerald-500/70">&#10003;</span>
              Черновик сохранён
            </span>

            <span className="text-xs font-semibold text-slate-400">
              {lesson ? "данные загружены" : "загрузка урока"}
            </span>
          </div>

          <p className="mt-2 max-w-3xl truncate text-sm font-semibold text-slate-600">
            {lessonTitle}
          </p>
        </div>

        <div
          data-testid="lesson-studio-quick-actions"
          className="flex flex-wrap justify-start gap-2 sm:justify-end"
        >
          <button
            type="button"
            data-testid="lesson-studio-save-shortcut-button"
            onClick={handleSaveShortcut}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Сохранить
          </button>

          <button
            type="button"
            data-testid="lesson-studio-preview-mode-button"
            onClick={() => onModeChange(previewMode ? "editor" : "preview")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {previewMode ? "К редактору" : "Предпросмотр"}
          </button>
          <button
            type="button"
            data-testid="lesson-studio-publish-button"
            title={publishButtonTitle}
            disabled={!canPublish}
            aria-disabled={!canPublish}
            onClick={onPublish}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition ${
              publishing || typeof onPublish !== "function"
                ? "cursor-not-allowed bg-blue-700/45"
                : readyForPublish
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {publishButtonLabel}
          </button>
          {published ? (
            <button
              type="button"
              data-testid="lesson-studio-unpublish-button"
              title={unpublishButtonLabel}
              disabled={!canUnpublish}
              aria-disabled={!canUnpublish}
              onClick={onUnpublish}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm ring-1 transition ${
                canUnpublish
                  ? "bg-white text-red-700 ring-red-200 hover:bg-red-50"
                  : "cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200"
              }`}
            >
              {unpublishButtonLabel}
            </button>
          ) : null}

          <a
            href={courseHref}
            data-testid="lesson-studio-course-link"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-blue-700 hover:ring-blue-200"
            aria-label="Вернуться к курсу"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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


function getStructureBlockIcon(blockType) {
  const type = `${blockType || ""}`.toLowerCase();

  if (type === "video") return PlayCircle;
  if (type === "audio") return PlayCircle;
  if (type === "image" || type === "image_url") return ImageIcon;
  if (type === "quiz" || type === "survey") return BarChart3;
  if (type === "file_link" || type === "file") return FileText;

  return Type;
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
  const [structureFilter, setStructureFilter] = useState("all");
  const previewMode = mode === "preview";
  const requiredBlocks = blocks.filter((block) => block.is_required);
  const activeBlocks = blocks.filter((block) => block.is_active !== false).length;
  const inactiveBlocks = Math.max(blocks.length - activeBlocks, 0);
  const problemBlocks = blocks.filter((block) => getBlockValidationIssues(block).length > 0);
  const readyBlocks = Math.max(blocks.length - problemBlocks.length, 0);
  const effectiveFilter = showOnlyProblems ? "problems" : structureFilter;
  const displayedBlocks =
    effectiveFilter === "problems"
      ? problemBlocks
      : effectiveFilter === "required"
        ? requiredBlocks
        : blocks;
  const hiddenByProblemFilter = Math.max(blocks.length - displayedBlocks.length, 0);

  const handleFilterChange = (nextFilter) => {
    if (nextFilter === "problems") {
      if (!problemBlocks.length) return;
      if (!showOnlyProblems) onToggleShowOnlyProblems?.();
      setStructureFilter("all");
      return;
    }

    if (showOnlyProblems) onToggleShowOnlyProblems?.();
    setStructureFilter(nextFilter);
  };

  // Smoke guard for legacy problem filter text:
  // showOnlyProblems ? "Показать все" : "Только проблемные"

  return (
    <aside
      data-testid="lesson-studio-structure"
      className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-black leading-tight text-slate-950">
            Структура урока
          </div>
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
        className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200"
      >
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-[11px] font-semibold text-slate-500">Всего</span>
            <span className="block text-sm font-semibold text-slate-800">{blocks.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 px-2.5 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-[11px] font-semibold text-emerald-700/80">Готово</span>
            <span className="block text-sm font-semibold text-emerald-700">{readyBlocks}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-blue-50/80 px-2.5 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-blue-100">
            <Star className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-[11px] font-semibold text-blue-700/80">Обяз.</span>
            <span className="block text-sm font-semibold text-blue-700">{requiredBlocks.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-amber-50/80 px-2.5 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-amber-600 ring-1 ring-amber-100">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-[11px] font-semibold text-amber-700/80">Проблем</span>
            <span className="block text-sm font-semibold text-amber-700">{problemBlocks.length}</span>
          </span>
        </div>
      </div>

      {inactiveBlocks ? (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
          Скрытых блоков: {inactiveBlocks}
        </div>
      ) : null}

      <div
        data-testid="lesson-studio-structure-problem-filter"
        className="mt-3 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200"
      >
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition ${
              effectiveFilter === "all"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:bg-white/70"
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            Все
          </button>

          <button
            type="button"
            data-testid="lesson-studio-structure-problems-filter-button"
            onClick={() => handleFilterChange("problems")}
            disabled={!problemBlocks.length}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
              effectiveFilter === "problems"
                ? "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200"
                : "text-amber-700 hover:bg-white/70"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Проблемные
          </button>

          <button
            type="button"
            onClick={() => handleFilterChange("required")}
            disabled={!requiredBlocks.length}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
              effectiveFilter === "required"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                : "text-slate-500 hover:bg-white/70"
            }`}
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Обяз.
          </button>
        </div>

        {showOnlyProblems && hiddenByProblemFilter ? (
          <span
            data-testid="lesson-studio-structure-problems-filter-hidden"
            className="mt-2 block rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200"
          >
            Скрыто готовых: {hiddenByProblemFilter}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {displayedBlocks.length ? (
          displayedBlocks.map((block, index) => {
            const selected = block.id === selectedBlockId;
            const editing = block.id === editingBlockId;
            const issues = getBlockValidationIssues(block);
            const hasIssues = issues.length > 0;
            const BlockIcon = getStructureBlockIcon(block.block_type);

            return (
              <button
                key={block.id}
                type="button"
                data-testid="lesson-studio-structure-block"
                onClick={() => onSelectBlock(block.id)}
                className={`group w-full rounded-xl px-3 py-3 text-left ring-1 transition ${
                  selected
                    ? "bg-blue-50/80 ring-blue-400 shadow-sm"
                    : hasIssues
                      ? "bg-amber-50/70 ring-amber-200 hover:bg-amber-50"
                      : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GripVertical className={`h-4 w-4 shrink-0 ${
                    hasIssues ? "text-amber-400" : "text-slate-300"
                  }`} aria-hidden="true" />

                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ring-1 ${
                    selected
                      ? "bg-blue-700 text-white ring-blue-700"
                      : hasIssues
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}>
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-950">
                      {getBlockDisplayTitle(block, index)}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                        <BlockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="truncate">{getLessonBlockTypeLabel(block.block_type)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {block.is_required ? (
                      <span className="hidden rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100 min-[1500px]:inline-flex">
                        обязательный
                      </span>
                    ) : null}

                    <span
                      data-testid="lesson-studio-structure-block-status"
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ${
                        hasIssues
                          ? "bg-white text-amber-800 ring-amber-200"
                          : block.is_active === false
                            ? "bg-slate-50 text-slate-500 ring-slate-200"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      }`}
                    >
                      {hasIssues ? (
                        <>
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          {issues.length}
                        </>
                      ) : block.is_active === false ? (
                        <>
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          скрыт
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          готов
                        </>
                      )}
                    </span>

                    <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" aria-hidden="true" />
                  </div>
                </div>

                {editing ? (
                  <div className="mt-2 inline-flex rounded-lg bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-800 ring-1 ring-blue-200">
                    правится
                  </div>
                ) : null}

                {selected && hasIssues ? (
                  <div
                    data-testid="lesson-studio-structure-block-issues"
                    className="mt-2 flex flex-wrap gap-1.5"
                  >
                    {issues.map((issue) => (
                      <span
                        key={issue}
                        className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100"
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
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
            {showOnlyProblems && blocks.length
              ? "Проблемных блоков нет. Все отображаемые блоки готовы."
              : effectiveFilter === "required" && blocks.length
                ? "Обязательных блоков пока нет."
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
      className="relative py-3"
    >
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200/80" />

        <details
          ref={menuRef}
          open={open}
          data-testid="lesson-studio-canvas-insert-menu"
          className="relative"
          onToggle={(event) => setOpen(event.currentTarget.open)}
        >
          <summary
            data-testid="lesson-studio-canvas-insert-trigger"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-lg font-black text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50 hover:shadow-md"
            style={{ listStyle: "none" }}
            aria-label="Добавить блок здесь"
          >
            +
          </summary>

          <div
            data-testid="lesson-studio-canvas-insert-options"
            className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-200"
          >
            <div className="hidden" />
            <div className="hidden" />

            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                }}
                className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Закрыть выбор блока"
              >
                ×
              </button>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-base font-black text-slate-950">
                  <span className="text-blue-500">✦</span>
                  Добавить новый блок
                </div>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">
                  Выберите тип блока, который хотите добавить в урок
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
                {templates.map((template, index) => {
                  const creatingKey = getCanvasInsertTemplateKey(insertIndex, template.key);
                  const creating = creatingTemplateKey === creatingKey;
                  const meta = getBlockPreviewMeta({ block_type: template.values?.block_type, content_json: template.values?.content_json });
                  const primary = index === 0;

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
                      className={`group flex min-h-[132px] flex-col items-center justify-center rounded-xl px-3 py-3 text-center ring-1 transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                        primary
                          ? "bg-blue-50/60 ring-blue-500 hover:bg-blue-50 hover:shadow-[0_14px_34px_rgba(37,99,235,0.12)]"
                          : "bg-white ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:ring-blue-200 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-black shadow-sm ring-1 transition ${
                          primary
                            ? "bg-blue-100 text-blue-700 ring-blue-100"
                            : "bg-blue-50 text-blue-700 ring-blue-100 group-hover:bg-blue-100"
                        }`}
                      >
                        {meta.icon}
                      </span>

                      <span className="mt-3 block text-sm font-black text-slate-950">
                        {creating ? "Добавляем..." : template.label}
                      </span>

                      <span className="mt-1.5 block max-w-[7.5rem] text-xs font-semibold leading-4 text-slate-500">
                        {template.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </details>

        <div className="h-px flex-1 bg-gradient-to-r from-slate-200/80 via-slate-200 to-transparent" />
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
  onUnsavedStateChange,
}) {
  const issues = getBlockValidationIssues(block);
  const blockReady = issues.length === 0;
  const title = getBlockDisplayTitle(block, index);
  const preview = getBlockTextPreview(block);
  const blockTypeLabel = isLessonImageBlock(block) ? "Изображение" : getLessonBlockTypeLabel(block.block_type);
  const compactBlockType = `${block?.block_type || "rich_text"}`.toLowerCase();
  const isCompactVideo = compactBlockType === "video";
  const isCompactAudio = compactBlockType === "audio";
  const isCompactPresentation = compactBlockType === "presentation";
  const isCompactImage = isLessonImageBlock(block);
  const isCompactFileLink =
    !isCompactImage &&
    (compactBlockType === "file_link" || compactBlockType === "file" || compactBlockType === "link");
  const isCompactCallout = compactBlockType === "callout";
  const compactPreviewLines = `${preview || ""}`
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  const compact = !previewMode && !selected;
  const busy = disabled || moving || duplicating || deleting;
  const compactSummary = issues.length
    ? `Нужно заполнить: ${issues.slice(0, 2).join(", ")}${issues.length > 2 ? "..." : ""}`
    : preview || "Краткое содержимое блока пока не заполнено.";
  const inlineRichTextEditing = !previewMode && selected && editing && isLessonRichTextBlock(block);
  const inlineEditing = !previewMode && selected && editing;
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
          : `relative rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.045)] ring-1 transition duration-200 ${
              inlineEditing ? "p-3" : compact ? "p-6" : "p-5"
            } ${
              !previewMode && selected
                ? "ring-blue-300 bg-blue-50/20"
                : "ring-slate-200 hover:-translate-y-0.5 hover:ring-blue-200 hover:shadow-[0_22px_55px_rgba(37,99,235,0.08)]"
            }`
      }
      onClick={() => {
        if (!previewMode) {
          onSelect(block.id);
        }
      }}
    >
      {!previewMode && !inlineEditing ? (
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-100 pb-4">
          <div className="min-w-0 max-w-4xl">
            <div className="text-[13px] font-black uppercase tracking-[0.12em] text-blue-700">
              #{index + 1} · {blockTypeLabel}
            </div>
            <h3 className={`${compact ? "mt-2 text-xl" : "mt-1.5 text-lg"} font-black text-slate-950`}>
              {title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 pr-12">
            <span
              data-testid="lesson-studio-block-readiness-chip"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                blockReady
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-amber-50 text-amber-800 ring-amber-200"
              }`}
            >
              {blockReady ? "✓ Готов" : `${issues.length} проблем`}
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
        <div
          className={isCompactVideo || isCompactAudio || isCompactPresentation || isCompactFileLink || isCompactImage || isCompactCallout ? "mt-5 w-full" : "mt-5 max-w-4xl"}
          data-testid="lesson-studio-block-compact-summary"
        >
          {isCompactVideo ? (
            <LessonVideoCanvasPreview
              block={block}
              previewValue={compactSummary}
              learnerMode={false}
            />
          ) : isCompactAudio ? (
            <LessonAudioCanvasPreview
              block={block}
              previewValue={compactSummary}
              learnerMode={false}
            />
          ) : isCompactPresentation ? (
            <LessonPresentationCanvasPreview
              block={block}
              previewValue={compactSummary}
              learnerMode={false}
            />
          ) : isCompactImage ? (
            <LessonImageCanvasPreview
              block={block}
              previewValue={compactSummary}
              learnerMode={false}
            />
          ) : isCompactFileLink ? (
            <LessonFileLinkCanvasPreview
              block={block}
              previewValue={compactSummary}
              learnerMode={false}
            />
          ) : isCompactCallout ? (
            <LessonCalloutCanvasPreview
              block={block}
              previewValue={compactSummary}
              learnerMode={false}
            />
          ) : isLessonRichTextBlock(block) ? (
            <div className="lesson-studio-canvas-rich-preview text-slate-700">
              <LessonRichTextSafePreview
                block={block}
                preview={preview}
                learnerMode
              />
            </div>
          ) : (
            <p
              className={`whitespace-pre-wrap break-words text-base leading-7 ${
                issues.length ? "font-semibold text-amber-800" : "text-slate-600"
              }`}
            >
              {compactPreviewLines.length
                ? compactPreviewLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))
                : compactSummary}
            </p>
          )}
        </div>
      ) : null}

      <div
        data-testid="lesson-studio-block-order-controls"
        className={
          previewMode || inlineEditing
            ? "hidden"
            : "absolute right-5 top-5 z-10 flex items-center justify-end"
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
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-base font-black text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
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

      {!compact && !previewMode && !inlineEditing && issues.length ? (
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

      {!compact && !inlineEditing ? (
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

            const saveAndSwitchTargetBlockId =
              typeof window !== "undefined"
                ? window.__lessonStudioSaveAndSwitchTargetBlockId
                : "";

            if (saveAndSwitchTargetBlockId) {
              return;
            }

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
      className="mx-auto mt-4 w-[calc(100%-1.5rem)] overflow-hidden rounded-xl bg-blue-700 shadow-sm ring-1 ring-blue-700"
    >
      <summary
        data-testid="lesson-studio-sidebar-quick-add-trigger"
        className="flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
        style={{ listStyle: "none" }}
      >
        <span className="text-lg leading-none">+</span>
        <span>Добавить блок</span>
      </summary>

      <div
        data-testid="lesson-studio-sidebar-quick-add-menu"
        className="border-t border-blue-600 bg-white p-2"
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
  onUnsavedStateChange,
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
                onUnsavedStateChange={onUnsavedStateChange}
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




function isLessonVideoBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();

  return type === "video";
}

function getVideoBlockContent(block) {
  return safeParseJson(block?.content_json);
}

function normalizeVideoSourceType(value) {
  return `${value || ""}`.toLowerCase() === "embed" ? "embed" : "link";
}

function getVideoBlockEmbedCode(block) {
  const content = getVideoBlockContent(block);

  return `${content.embed_code || content.video_embed_code || content.iframe || ""}`;
}

function getVideoEmbedSrc(value) {
  const code = `${value || ""}`;
  const match = code.match(/src=["']([^"']+)["']/i);

  return match?.[1]?.replaceAll("&amp;", "&").trim() || "";
}

function normalizeVideoEmbedUrl(value) {
  const source = `${value || ""}`.trim().replaceAll("&amp;", "&");

  if (!source) return "";
  if (source.startsWith("//")) return `https:${source}`;
  if (source.startsWith("http://") || source.startsWith("https://")) return source;

  return "";
}

function getYouTubeVideoId(url) {
  const host = url.hostname.replace(/^www\./, "");
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return pathParts[0] || "";
  }

  if (host.includes("youtube.com")) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    if (pathParts[0] === "embed" || pathParts[0] === "shorts" || pathParts[0] === "live") {
      return pathParts[1] || "";
    }
  }

  return "";
}

function getVideoPreviewEmbedUrl(value) {
  const source = `${value || ""}`.trim().replaceAll("&amp;", "&");

  if (!source) return "";

  const iframeSrc = getVideoEmbedSrc(source);

  if (iframeSrc) {
    return normalizeVideoEmbedUrl(iframeSrc);
  }

  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);

    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}`;
    }

    if (host.includes("rutube.ru")) {
      const rutubeId = pathParts[0] === "video" ? pathParts[1] : pathParts[0] === "play" && pathParts[1] === "embed" ? pathParts[2] : "";

      if (rutubeId) {
        return `https://rutube.ru/play/embed/${rutubeId}`;
      }
    }

    if (host.includes("vk.com") || host.includes("vkvideo.ru")) {
      const videoMatch = url.pathname.match(/video(-?\d+)_(\d+)/);

      if (videoMatch) {
        return `https://vk.com/video_ext.php?oid=${videoMatch[1]}&id=${videoMatch[2]}`;
      }

      if (url.pathname.includes("video_ext.php")) {
        return normalizeVideoEmbedUrl(source);
      }
    }

    if (host.includes("vimeo.com")) {
      const videoId = pathParts.find((part) => /^\d+$/.test(part));

      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    if (
      url.pathname.includes("/embed/") ||
      host.includes("player.") ||
      host.includes("video_ext.php")
    ) {
      return normalizeVideoEmbedUrl(source);
    }

    return "";
  } catch {
    return "";
  }
}

function getVideoBlockSourceType(block) {
  const content = getVideoBlockContent(block);
  const explicitType = content.video_source_type || content.source_type || content.insert_type;

  if (explicitType) {
    return normalizeVideoSourceType(explicitType);
  }

  return getVideoBlockEmbedCode(block).trim() ? "embed" : "link";
}

function getVideoBlockUrl(block) {
  const content = getVideoBlockContent(block);

  return `${content.url || content.content_url || content.video_url || content.src || getVideoEmbedSrc(getVideoBlockEmbedCode(block)) || ""}`;
}

function getVideoBlockSourceValue(block) {
  const sourceType = getVideoBlockSourceType(block);

  if (sourceType === "embed") {
    return getVideoBlockEmbedCode(block).trim() || getVideoBlockUrl(block).trim();
  }

  return getVideoBlockUrl(block).trim();
}

function getVideoHostLabel(value) {
  const source = `${value || ""}`.trim();

  if (!source) {
    return "—";
  }

  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");

    if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("rutube")) return "Rutube";
    if (host.includes("vk.com") || host.includes("vkvideo")) return "VK Видео";
    if (host.includes("vimeo")) return "Vimeo";

    return host;
  } catch {
    return "Код вставки";
  }
}

function LessonStudioVideoBlockEditor({ form, saving, onFieldChange }) {
  const sourceType = normalizeVideoSourceType(form.video_source_type);
  const videoUrl = `${form.video_url || ""}`;
  const embedCode = `${form.video_embed_code || ""}`;
  const sourceValue = sourceType === "embed" ? embedCode : videoUrl;
  const rawPreviewSource = sourceType === "embed" ? getVideoEmbedSrc(embedCode) || embedCode : videoUrl;
  const previewEmbedUrl = getVideoPreviewEmbedUrl(rawPreviewSource);
  const previewReady = Boolean(previewEmbedUrl);
  const videoHost = getVideoHostLabel(rawPreviewSource || previewEmbedUrl);
  const insertTypeLabel = sourceType === "embed" ? "Код вставки" : "Ссылка";
  const videoTitle = `${form.title || "Видео"}`.trim() || "Видео";

  const handleSourceTypeChange = (nextType) => {
    const normalizedType = normalizeVideoSourceType(nextType);

    onFieldChange("video_source_type", normalizedType);
    onFieldChange("content_text", normalizedType === "embed" ? embedCode : videoUrl);
  };

  const handleVideoUrlChange = (value) => {
    onFieldChange("video_url", value);

    if (sourceType === "link") {
      onFieldChange("content_text", value);
    }
  };

  const handleEmbedCodeChange = (value) => {
    onFieldChange("video_embed_code", value);

    if (sourceType === "embed") {
      onFieldChange("content_text", value);
    }
  };

  return (
    <>
      <section
        data-testid="lesson-studio-inspector-section-content"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Источник видео</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Добавьте видео из видеохостинга по ссылке или через код вставки.
            </p>
          </div>

          {previewReady ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              ✓ Видео найдено
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Требуется источник
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => handleSourceTypeChange("link")}
            disabled={saving}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition ${
              sourceType === "link"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            <span aria-hidden="true">🔗</span>
            Ссылка на видео
          </button>

          <button
            type="button"
            onClick={() => handleSourceTypeChange("embed")}
            disabled={saving}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition ${
              sourceType === "embed"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            <span aria-hidden="true">&lt;/&gt;</span>
            Код вставки
          </button>
        </div>

        {sourceType === "link" ? (
          <div className="mt-4" data-testid="lesson-studio-inspector-content-field">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Ссылка на видео
              </span>

              <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_9rem]">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(event) => handleVideoUrlChange(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={saving}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
                />

                <button
                  type="button"
                  disabled={saving}
                  className="h-11 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Проверить
                </button>
              </div>
            </label>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Поддерживаются публичные ссылки YouTube, VK Видео, Rutube, Vimeo и других видеохостингов.
            </p>
          </div>
        ) : (
          <div className="mt-4" data-testid="lesson-studio-inspector-content-field">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                HTML-код для вставки
              </span>

              <textarea
                value={embedCode}
                onChange={(event) => handleEmbedCodeChange(event.target.value)}
                placeholder='<iframe src="https://..." width="560" height="315" allowfullscreen></iframe>'
                rows={6}
                disabled={saving}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
              />
            </label>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Вставьте iframe-код из плеера видеохостинга. В урок попадёт только код выбранного источника.
            </p>
          </div>
        )}
      </section>

      <section
        data-testid="lesson-studio-video-preview-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-black text-slate-950">Предпросмотр</div>

          {previewReady ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              ✓ Видео найдено
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
              Ожидает проверки
            </span>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 shadow-sm ring-1 ring-slate-900/10">
          <div className="relative aspect-[16/9] min-h-[260px] bg-slate-950">
            {previewReady ? (
              <iframe
                title={videoTitle}
                src={previewEmbedUrl}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen={form.allow_fullscreen !== false}
              />
            ) : (
              <>
                <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-blue-700 shadow-xl">
                    ▶
                  </div>

                  <div className="mt-4 text-sm font-semibold text-white/90">
                    Добавьте корректную ссылку или iframe-код
                  </div>
                  <div className="mt-1 max-w-md text-xs leading-5 text-white/60">
                    Поддерживаются YouTube, Rutube, VK Видео, Vimeo и прямые embed-ссылки.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {[
            ["Название видео", previewReady ? videoTitle : "—"],
            ["Источник", previewReady ? videoHost : "—"],
            ["Тип вставки", previewReady ? insertTypeLabel : "—"],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[12rem_minmax(0,1fr)] border-b border-slate-100 px-4 py-3 last:border-b-0">
              <div className="text-sm font-semibold text-slate-500">{label}</div>
              <div className="break-words text-sm font-semibold text-slate-800">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        data-testid="lesson-studio-inspector-section-publication"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="text-lg font-black text-slate-950">Настройки блока</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Заголовок, обязательность и видимость видео для обучающихся.
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_15rem_15rem_17rem]">
          <label
            className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
            data-testid="lesson-studio-inspector-title-field"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Название блока
            </span>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Видео"
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_required
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Обязательный</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Обучающийся должен пройти этот блок.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => onFieldChange("is_required", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_active
              ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Показывать в уроке</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Блок будет виден обучающимся.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.allow_fullscreen
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Полный экран</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Видео можно открыть на весь экран.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.allow_fullscreen}
                onChange={(event) => onFieldChange("allow_fullscreen", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}






function LessonStudioAudioBlockEditor({ lesson, form, saving, onFieldChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const audioUrl = `${form.content_text || ""}`.trim();
  const safeAudioUrl = getSafeLessonRichTextHref(audioUrl);
  const uploadedAsset = form.audio_asset && typeof form.audio_asset === "object" ? form.audio_asset : {};
  const filename = `${uploadedAsset.original_filename || ""}`.trim();
  const ready = Boolean(safeAudioUrl);

  const handleAudioFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadError("");
    setUploadSuccess("");

    if (!lesson?.id) {
      setUploadError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0430\u0443\u0434\u0438\u043e.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const uploaded = await uploadAdminLessonAudioAsset(lesson.id, file);
      const nextUrl = `${uploaded.audio_url || uploaded.stream_url || uploaded.url || uploaded.content_url || ""}`.trim();

      onFieldChange("audio_asset", uploaded);
      onFieldChange("content_text", nextUrl);

      if (!`${form.title || ""}`.trim() || `${form.title || ""}`.trim() === "\u0410\u0443\u0434\u0438\u043e") {
        onFieldChange("title", uploaded.original_filename || file.name || "\u0410\u0443\u0434\u0438\u043e");
      }

      setUploadSuccess("\u0410\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c\u00bb, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0435\u0433\u043e \u0432 \u0431\u043b\u043e\u043a\u0435.");
    } catch (err) {
      setUploadError(err?.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <section
        data-testid="lesson-studio-audio-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">{"\u0410\u0443\u0434\u0438\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b"}</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b \u0438\u043b\u0438 \u0432\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u043f\u0440\u044f\u043c\u0443\u044e \u0441\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e."}
            </p>
          </div>

          {ready ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              {"\u2713 \u0410\u0443\u0434\u0438\u043e \u043d\u0430\u0439\u0434\u0435\u043d\u043e"}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              {"\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0430\u0443\u0434\u0438\u043e"}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <label className="block rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {"\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b"}
            </span>

            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/webm,.mp3,.wav,.m4a,.aac,.ogg,.oga,.webm"
              onChange={handleAudioFileChange}
              disabled={saving || uploading}
              className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-700 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {"\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044e\u0442\u0441\u044f MP3, WAV, M4A, AAC, OGG \u0438 WEBM."}
            </span>
          </label>

          <label className="block rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200" data-testid="lesson-studio-inspector-content-field">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {"\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e"}
            </span>

            <input
              type="url"
              value={form.content_text}
              onChange={(event) => {
                onFieldChange("content_text", event.target.value);
                onFieldChange("audio_asset", {
                  ...(form.audio_asset || {}),
                  material_kind: "audio",
                  url: event.target.value,
                  content_url: event.target.value,
                  audio_url: event.target.value,
                  stream_url: event.target.value,
                });
              }}
              placeholder="https://.../audio.mp3"
              disabled={saving || uploading}
              className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />

            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {"\u041c\u043e\u0436\u043d\u043e \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u044f\u043c\u0443\u044e \u0441\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b, \u0435\u0441\u043b\u0438 \u0444\u0430\u0439\u043b \u0443\u0436\u0435 \u0440\u0430\u0437\u043c\u0435\u0449\u0451\u043d \u0432\u043e \u0432\u043d\u0435\u0448\u043d\u0435\u043c \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435."}
            </span>
          </label>
        </div>

        {uploading ? (
          <div className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 ring-1 ring-blue-200">
            {"\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0430\u0443\u0434\u0438\u043e..."}
          </div>
        ) : null}

        {uploadSuccess ? (
          <div className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 ring-1 ring-green-200">
            {uploadSuccess}
          </div>
        ) : null}

        {uploadError ? (
          <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-200">
            {uploadError}
          </div>
        ) : null}
      </section>

      <section
        data-testid="lesson-studio-audio-preview-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-black text-slate-950">{"\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440"}</div>

          {filename ? (
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              {filename}
            </span>
          ) : null}
        </div>

        <LessonAudioCanvasPreview
          block={{
            block_type: "audio",
            title: form.title || "\u0410\u0443\u0434\u0438\u043e",
            content_json: {
              ...(form.audio_asset || {}),
              url: form.content_text,
              content_url: form.content_text,
              audio_url: form.content_text,
              stream_url: form.content_text,
            },
          }}
          previewValue={form.content_text}
          learnerMode={false}
        />
      </section>

      <section
        data-testid="lesson-studio-inspector-section-publication"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="text-lg font-black text-slate-950">{"\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0431\u043b\u043e\u043a\u0430"}</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {"\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a, \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0438 \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u0430\u0443\u0434\u0438\u043e \u0434\u043b\u044f \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0438\u0445\u0441\u044f."}
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_15rem_15rem]">
          <label
            className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
            data-testid="lesson-studio-inspector-title-field"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {"\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0431\u043b\u043e\u043a\u0430"}
            </span>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="\u0410\u0443\u0434\u0438\u043e"
              disabled={saving || uploading}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_required
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">{"\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439"}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {"\u041e\u0431\u0443\u0447\u0430\u044e\u0449\u0438\u0439\u0441\u044f \u0434\u043e\u043b\u0436\u0435\u043d \u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u0442\u044c \u044d\u0442\u043e\u0442 \u0431\u043b\u043e\u043a."}
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => onFieldChange("is_required", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_active
              ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">{"\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0432 \u0443\u0440\u043e\u043a\u0435"}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {"\u0411\u043b\u043e\u043a \u0431\u0443\u0434\u0435\u0442 \u0432\u0438\u0434\u0435\u043d \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0438\u043c\u0441\u044f."}
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}


function LessonStudioCalloutBlockEditor({ form, saving, onFieldChange }) {
  const calloutText = `${form.content_text || ""}`;
  const draftBlock = {
    block_type: "callout",
    title: form.title || "Важно",
    content_json: {
      text: calloutText,
      content_text: calloutText,
    },
    is_required: form.is_required,
    is_active: form.is_active,
  };
  const ready = Boolean(calloutText.trim());

  return (
    <>
      <section
        data-testid="lesson-studio-inspector-section-content"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Содержимое врезки</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Добавьте короткое примечание, предупреждение или подсказку для обучающегося.
            </p>
          </div>

          {ready ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              ✓ Врезка готова
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Требуется текст
            </span>
          )}
        </div>

        <label className="mt-4 block" data-testid="lesson-studio-inspector-content-field">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Текст врезки
          </span>

          <textarea
            value={calloutText}
            onChange={(event) => onFieldChange("content_text", event.target.value)}
            placeholder="Например: обратите внимание на важное правило или частую ошибку."
            rows={5}
            disabled={saving}
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
          />
        </label>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Лучше использовать короткий текст: 1–3 предложения. Для большого материала используйте текстовый блок.
        </p>
      </section>

      <section
        data-testid="lesson-studio-callout-preview-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Предпросмотр</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Так врезка будет выглядеть на полотне урока.
            </p>
          </div>

          {ready ? (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Важное примечание
            </span>
          ) : null}
        </div>

        <LessonCalloutCanvasPreview
          block={draftBlock}
          previewValue={calloutText}
          learnerMode={false}
        />
      </section>

      <section
        data-testid="lesson-studio-inspector-section-publication"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="text-lg font-black text-slate-950">Настройки блока</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Заголовок, обязательность и видимость врезки для обучающихся.
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem_17rem]">
          <label
            className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
            data-testid="lesson-studio-inspector-title-field"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Название блока
            </span>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Важно"
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_required
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Обязательный</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Обучающийся должен прочитать эту врезку.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => onFieldChange("is_required", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_active
              ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Показывать в уроке</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Блок будет виден обучающимся.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}



function LessonStudioImageBlockEditor({ lesson, form, saving, onFieldChange }) {
  const [imageUploadState, setImageUploadState] = useState("idle");
  const [imageUploadError, setImageUploadError] = useState("");
  const imageUrl = `${form.image_url || form.content_text || ""}`;
  const imageCaption = `${form.image_caption || ""}`;
  const imageAlt = `${form.image_alt || ""}`;
  const draftBlock = {
    block_type: "image",
    title: form.title || "Изображение",
    content_json: {
      image_url: imageUrl,
      image_src: imageUrl,
      src: imageUrl,
      caption: imageCaption,
      description: imageCaption,
      alt_text: imageAlt,
      alt: imageAlt,
      full_width: form.image_full_width !== false,
      open_full_size: form.image_open_full_size !== false,
    },
    is_required: form.is_required,
    is_active: form.is_active,
  };
  const ready = Boolean(getSafeLessonRichTextHref(imageUrl));

  const handleImageUrlChange = (value) => {
    onFieldChange("image_url", value);
    onFieldChange("content_text", value);
  };

  const handleImageFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!lesson?.id) {
      setImageUploadError("Не найден идентификатор урока.");
      return;
    }

    setImageUploadState("uploading");
    setImageUploadError("");

    try {
      const uploadedImage = await uploadAdminLessonImageAsset(lesson.id, file);
      const nextImageUrl = `${uploadedImage.image_url || uploadedImage.image_src || uploadedImage.url || uploadedImage.src || ""}`.trim();

      if (!nextImageUrl) {
        throw new Error("Сервер не вернул ссылку на изображение.");
      }

      onFieldChange("image_asset", uploadedImage);
      onFieldChange("image_url", nextImageUrl);
      onFieldChange("content_text", nextImageUrl);

      if (!imageCaption && uploadedImage.original_filename) {
        onFieldChange("image_caption", uploadedImage.original_filename);
      }

      if (!imageAlt && uploadedImage.original_filename) {
        onFieldChange(
          "image_alt",
          uploadedImage.original_filename.replace(/\.[^/.]+$/, "")
        );
      }

      setImageUploadState("done");
    } catch (err) {
      setImageUploadError(formatLessonStudioError(err, "Не удалось загрузить изображение"));
      setImageUploadState("error");
    }
  };

  return (
    <>
      <section
        data-testid="lesson-studio-inspector-section-content"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Источник изображения</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Добавьте открытую ссылку на изображение. Загрузку файла с компьютера подключим отдельным этапом.
            </p>
          </div>

          {ready ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              ✓ Изображение указано
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Требуется ссылка
            </span>
          )}
        </div>

        <div
          data-testid="lesson-studio-image-upload-field"
          className="mt-4 rounded-xl bg-violet-50/70 p-4 ring-1 ring-violet-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950">Загрузка с компьютера</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Поддерживаются JPG, PNG, WebP и GIF. Максимальный размер — 20 МБ.
              </p>
            </div>

            <input
              id="lesson-studio-image-file-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              onChange={handleImageFileUpload}
              disabled={saving || imageUploadState === "uploading"}
              className="sr-only"
            />

            <label
              htmlFor="lesson-studio-image-file-upload"
              className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-bold text-white shadow-sm ring-1 transition ${
                saving || imageUploadState === "uploading"
                  ? "pointer-events-none bg-slate-400 ring-slate-400"
                  : "bg-violet-700 ring-violet-700 hover:bg-violet-800"
              }`}
            >
              {imageUploadState === "uploading" ? "Загружаем..." : "Выбрать изображение"}
            </label>
          </div>

          {imageUploadState === "done" ? (
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-green-700 ring-1 ring-green-200">
              Изображение загружено. Нажмите «Сохранить», чтобы закрепить его в блоке.
            </div>
          ) : null}

          {imageUploadError ? (
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200">
              {imageUploadError}
            </div>
          ) : null}
        </div>

        <label className="mt-4 block" data-testid="lesson-studio-inspector-content-field">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Ссылка на изображение
          </span>

          <div className="mt-2 flex flex-col gap-2 lg:flex-row">
            <input
              type="text"
              inputMode="url"
              value={imageUrl}
              onChange={(event) => handleImageUrlChange(event.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={saving}
              className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />

            {ready ? (
              <a
                href={getSafeLessonRichTextHref(imageUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                Проверить
              </a>
            ) : (
              <span className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-50 px-5 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
                Проверить
              </span>
            )}
          </div>
        </label>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Подпись под изображением
            </span>
            <input
              value={imageCaption}
              onChange={(event) => onFieldChange("image_caption", event.target.value)}
              placeholder="Например: схема подключения оборудования"
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Alt-текст
            </span>
            <input
              value={imageAlt}
              onChange={(event) => onFieldChange("image_alt", event.target.value)}
              placeholder="Кратко опишите, что изображено"
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Для стабильного отображения лучше использовать прямую ссылку на JPG, PNG, WebP или SVG.
        </p>
      </section>

      <section
        data-testid="lesson-studio-image-preview-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Предпросмотр</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Так изображение будет выглядеть на полотне урока.
            </p>
          </div>

          {ready ? (
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
              Изображение
            </span>
          ) : null}
        </div>

        <LessonImageCanvasPreview
          block={draftBlock}
          previewValue={imageUrl}
          learnerMode={false}
        />
      </section>

      <section
        data-testid="lesson-studio-inspector-section-publication"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="text-lg font-black text-slate-950">Настройки блока</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Заголовок, обязательность, видимость и поведение изображения.
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem_17rem]">
          <label
            className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
            data-testid="lesson-studio-inspector-title-field"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Название блока
            </span>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Изображение"
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_required
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Обязательный</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Обучающийся должен просмотреть изображение.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => onFieldChange("is_required", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_active
              ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Показывать в уроке</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Блок будет виден обучающимся.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.image_full_width !== false
              ? "bg-violet-50/70 text-violet-900 ring-violet-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">На всю ширину</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Изображение занимает всю ширину блока.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-violet-600">
              <input
                type="checkbox"
                checked={form.image_full_width !== false}
                onChange={(event) => onFieldChange("image_full_width", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.image_open_full_size !== false
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Открывать отдельно</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Показывать кнопку открытия в новой вкладке.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.image_open_full_size !== false}
                onChange={(event) => onFieldChange("image_open_full_size", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}


function LessonStudioPresentationBlockEditor({ lesson, form, saving, onFieldChange }) {
  const labels = {
    presentation: "\u041f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f",
    editorHelp: "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 PDF-\u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e. \u041e\u043d\u0430 \u0431\u0443\u0434\u0435\u0442 \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0442\u044c\u0441\u044f \u043f\u0440\u044f\u043c\u043e \u0432\u043d\u0443\u0442\u0440\u0438 \u0443\u0440\u043e\u043a\u0430.",
    uploadTitle: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c PDF/PPTX",
    uploadHelp: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 PDF \u0438\u043b\u0438 PPTX. PPTX \u0431\u0443\u0434\u0435\u0442 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u043f\u0440\u0435\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d \u0432 PDF \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
    uploading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...",
    choosePdf: "\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0444\u0430\u0439\u043b",
    uploadedFile: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043d \u0444\u0430\u0439\u043b:",
    urlLabel: "\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 PDF-\u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e",
    check: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c",
    urlHelp: "\u041c\u043e\u0436\u043d\u043e \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443 \u0432\u0440\u0443\u0447\u043d\u0443\u044e \u0438\u043b\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c PDF-\u0444\u0430\u0439\u043b \u0432\u044b\u0448\u0435.",
    preview: "\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440",
    previewHelp: "\u0422\u0430\u043a \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f \u0431\u0443\u0434\u0435\u0442 \u0432\u044b\u0433\u043b\u044f\u0434\u0435\u0442\u044c \u0434\u043b\u044f \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0435\u0433\u043e\u0441\u044f.",
    ready: "\u0413\u043e\u0442\u043e\u0432\u043e",
    settings: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0431\u043b\u043e\u043a\u0430",
    settingsHelp: "\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a, \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0438 \u0432\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0430.",
    blockTitle: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0431\u043b\u043e\u043a\u0430",
    required: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
    requiredHelp: "\u041e\u0431\u0443\u0447\u0430\u044e\u0449\u0438\u0439\u0441\u044f \u0434\u043e\u043b\u0436\u0435\u043d \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u044d\u0442\u043e\u0442 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b.",
    active: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0432 \u0443\u0440\u043e\u043a\u0435",
    activeHelp: "\u0411\u043b\u043e\u043a \u0431\u0443\u0434\u0435\u0442 \u0432\u0438\u0434\u0435\u043d \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0438\u043c\u0441\u044f.",
    noLessonError: "\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d ID \u0443\u0440\u043e\u043a\u0430 \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u0438.",
    onlyPdfError: "\u0421\u0435\u0439\u0447\u0430\u0441 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430 PDF \u0438 PPTX-\u0444\u0430\u0439\u043b\u043e\u0432.",
    noViewerError: "\u0421\u0435\u0440\u0432\u0435\u0440 \u043d\u0435 \u0432\u0435\u0440\u043d\u0443\u043b \u0441\u0441\u044b\u043b\u043a\u0443 \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u0438.",
    uploadSuccess: "\u041f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u0430. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c\u00bb, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0435\u0435 \u0432 \u0431\u043b\u043e\u043a\u0435.",
    uploadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e.",
  };

  const presentationUrl = `${form.content_text || ""}`.trim();
  const presentationAsset =
    form.presentation_asset && typeof form.presentation_asset === "object"
      ? form.presentation_asset
      : {};
  const presentationViewerUrl = `${presentationAsset.viewer_url || presentationUrl || ""}`.trim();
  const presentationDownloadUrl = `${presentationAsset.original_url || presentationAsset.download_url || presentationViewerUrl}`.trim();

  const draftBlock = {
    block_type: "presentation",
    title: form.title || labels.presentation,
    content_json: {
      material_kind: "presentation",
      asset_id: presentationAsset.asset_id || "",
      original_filename: presentationAsset.original_filename || "",
      source_extension: presentationAsset.source_extension || "",
      mime_type: presentationAsset.mime_type || "application/pdf",
      size_bytes: presentationAsset.size_bytes || null,
      url: presentationViewerUrl,
      content_url: presentationViewerUrl,
      viewer_url: presentationViewerUrl,
      original_url: presentationDownloadUrl,
      download_url: presentationDownloadUrl,
      render_mode: "pdf",
      conversion_status: presentationAsset.conversion_status || (presentationViewerUrl ? "ready" : "empty"),
      show_download: true,
    },
    is_required: form.is_required,
    is_active: form.is_active,
  };

  const safeHref = getSafeLessonRichTextHref(presentationViewerUrl);
  const ready = Boolean(safeHref);
  const lessonIdFromUrl =
    typeof window !== "undefined"
      ? window.location.pathname.match(/\/admin\/lessons\/([^/]+)\/studio/)?.[1] || ""
      : "";
  const lessonIdForUpload = `${lesson?.id || lessonIdFromUrl || ""}`.trim();
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  const [presentationUploadError, setPresentationUploadError] = useState("");
  const [presentationUploadSuccess, setPresentationUploadSuccess] = useState("");

  const handlePresentationUpload = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    setPresentationUploadError("");
    setPresentationUploadSuccess("");

    if (!file) {
      return;
    }

    if (!lessonIdForUpload) {
      setPresentationUploadError(labels.noLessonError);
      return;
    }

    const filename = `${file.name || ""}`.toLowerCase();

    if (!filename.endsWith(".pdf") && !filename.endsWith(".pptx")) {
      setPresentationUploadError(labels.onlyPdfError);
      return;
    }

    setUploadingPresentation(true);

    try {
      const asset = await uploadAdminLessonPresentationAsset(lessonIdForUpload, file);
      const viewerUrl = `${asset?.viewer_url || ""}`.trim();

      if (!viewerUrl) {
        throw new Error(labels.noViewerError);
      }

      onFieldChange("content_text", viewerUrl);
      onFieldChange("presentation_asset", asset);
      setPresentationUploadSuccess(labels.uploadSuccess);
    } catch (err) {
      setPresentationUploadError(formatLessonStudioError(err, labels.uploadFailed));
    } finally {
      setUploadingPresentation(false);
    }
  };

  return (
    <>
      <section
        data-testid="lesson-studio-presentation-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">{labels.presentation}</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{labels.editorHelp}</p>
          </div>

          {ready ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              {labels.ready}
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
              PDF
            </span>
          )}
        </div>

        <div
          data-testid="lesson-studio-presentation-upload"
          className="mt-4 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-black text-amber-950">{labels.uploadTitle}</div>
              <p className="mt-1 text-xs leading-5 text-amber-900">{labels.uploadHelp}</p>
            </div>

            <label className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-bold shadow-sm transition ${
              uploadingPresentation || saving
                ? "bg-slate-200 text-slate-500"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}>
              {uploadingPresentation ? labels.uploading : labels.choosePdf}
              <input
                type="file"
                accept="application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pdf,.pptx"
                disabled={uploadingPresentation || saving}
                onChange={handlePresentationUpload}
                className="sr-only"
              />
            </label>
          </div>

          {presentationUploadError ? (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 ring-1 ring-red-200">
              {presentationUploadError}
            </div>
          ) : null}

          {presentationUploadSuccess ? (
            <div className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 ring-1 ring-green-200">
              {presentationUploadSuccess}
            </div>
          ) : null}

          {presentationAsset.original_filename ? (
            <div className="mt-3 text-xs leading-5 text-amber-900">
              {labels.uploadedFile} <span className="font-bold">{presentationAsset.original_filename}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4" data-testid="lesson-studio-inspector-content-field">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {labels.urlLabel}
            </span>

            <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_11rem]">
              <input
                type="url"
                value={presentationViewerUrl}
                onChange={(event) => {
                  onFieldChange("content_text", event.target.value);
                  onFieldChange("presentation_asset", null);
                  setPresentationUploadSuccess("");
                }}
                placeholder="https://.../presentation.pdf"
                disabled={saving}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
              />

              {ready ? (
                <a
                  href={safeHref}
                  target={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "_blank"}
                  rel={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "noreferrer"}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                >
                  {labels.check}
                </a>
              ) : (
                <span className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
                  {labels.check}
                </span>
              )}
            </div>
          </label>

          <p className="mt-2 text-xs leading-5 text-slate-500">{labels.urlHelp}</p>
        </div>
      </section>

      <section
        data-testid="lesson-studio-presentation-preview-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">{labels.preview}</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{labels.previewHelp}</p>
          </div>
        </div>

        <LessonPresentationCanvasPreview
          block={draftBlock}
          previewValue={presentationViewerUrl}
          learnerMode={false}
        />
      </section>

      <section
        data-testid="lesson-studio-inspector-section-publication"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="text-lg font-black text-slate-950">{labels.settings}</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">{labels.settingsHelp}</p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem_17rem]">
          <label
            className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
            data-testid="lesson-studio-inspector-title-field"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {labels.blockTitle}
            </span>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder={labels.presentation}
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_required
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">{labels.required}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {labels.requiredHelp}
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => onFieldChange("is_required", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_active
              ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">{labels.active}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {labels.activeHelp}
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}


function LessonStudioFileLinkBlockEditor({ form, saving, onFieldChange }) {
  const materialUrl = `${form.content_text || ""}`;
  const draftBlock = {
    block_type: "file_link",
    title: form.title || "Файл или ссылка",
    content_json: {
      url: materialUrl,
      content_url: materialUrl,
    },
    is_required: form.is_required,
    is_active: form.is_active,
  };
  const safeHref = getSafeLessonRichTextHref(materialUrl);
  const ready = Boolean(safeHref);
  const kind = getFileLinkKindMeta(materialUrl);

  return (
    <>
      <section
        data-testid="lesson-studio-inspector-section-content"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Материал</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Добавьте ссылку на файл, презентацию, облачный документ или внешний ресурс.
            </p>
          </div>

          {ready ? (
            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              ✓ Материал готов
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Требуется ссылка
            </span>
          )}
        </div>

        <div className="mt-4" data-testid="lesson-studio-inspector-content-field">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Ссылка на материал
            </span>

            <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_11rem]">
              <input
                type="text"
                value={materialUrl}
                onChange={(event) => onFieldChange("content_text", event.target.value)}
                placeholder="https://... или ссылка на PDF/презентацию"
                disabled={saving}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
              />

              {ready ? (
                <a
                  href={safeHref}
                  target={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "_blank"}
                  rel={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "noreferrer"}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                >
                  Проверить
                </a>
              ) : (
                <span className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
                  Проверить
                </span>
              )}
            </div>
          </label>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Подойдут ссылки на PDF, Word, презентации, таблицы, Яндекс.Диск, Google Drive и другие открытые материалы.
          </p>
        </div>
      </section>

      <section
        data-testid="lesson-studio-file-link-preview-editor"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">Предпросмотр</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Так материал будет выглядеть на полотне урока.
            </p>
          </div>

          {ready ? (
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${getFileLinkKindToneClass(kind.tone)}`}>
              {kind.label}
            </span>
          ) : null}
        </div>

        <LessonFileLinkCanvasPreview
          block={draftBlock}
          previewValue={materialUrl}
          learnerMode={false}
        />
      </section>

      <section
        data-testid="lesson-studio-inspector-section-publication"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="text-lg font-black text-slate-950">Настройки блока</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Заголовок, обязательность и видимость материала для обучающихся.
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem_17rem]">
          <label
            className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
            data-testid="lesson-studio-inspector-title-field"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Название блока
            </span>
            <input
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Файл или ссылка"
              disabled={saving}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_required
              ? "bg-blue-50/70 text-blue-900 ring-blue-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Обязательный</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Обучающийся должен открыть этот материал.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => onFieldChange("is_required", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
            form.is_active
              ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
              : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}>
            <span className="min-w-0">
              <span className="block font-bold text-slate-950">Показывать в уроке</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Блок будет виден обучающимся.
              </span>
            </span>

            <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => onFieldChange("is_active", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </section>
    </>
  );
}


function getInspectorContentText(block) {
  const content = safeParseJson(block?.content_json);
  const settings = safeParseJson(block?.settings_json);

  const candidates = [
    content.title,
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

function isLessonQuizBlock(block) {
  const type = `${block?.block_type || ""}`.toLowerCase();

  return type === "quiz";
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
    audio: {
      label: "\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e",
      placeholder: "https://.../audio.mp3",
      help: "\u041c\u043e\u0436\u043d\u043e \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u0443\u0434\u0438\u043e\u0444\u0430\u0439\u043b \u0438\u043b\u0438 \u0443\u043a\u0430\u0437\u0430\u0442\u044c \u043f\u0440\u044f\u043c\u0443\u044e \u0441\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e.",
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
    presentation: {
      label: "Ссылка на PDF-презентацию",
      placeholder: "https://.../presentation.pdf",
      help: "На первом этапе укажите прямую ссылку на PDF. PPTX-загрузку добавим следующим пунктом.",
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
  const videoContent = getVideoBlockContent(block);
  const videoSourceType = getVideoBlockSourceType(block);
  const videoUrl = getVideoBlockUrl(block);
  const videoEmbedCode = getVideoBlockEmbedCode(block);
  const videoSourceValue = videoSourceType === "embed" ? videoEmbedCode : videoUrl;
  const audioContent = getAudioBlockContent(block);
  const audioUrl = getAudioBlockUrl(block);
  const imageContent = getImageBlockContent(block);
  const imageUrl = getImageBlockUrl(block);
  const quizContent = normalizeQuizContent(block?.content_json);

  return {
    title: `${block?.title || ""}`,
    content_text: isLessonVideoBlock(block)
      ? videoSourceValue
      : isLessonAudioBlock(block)
        ? audioUrl
        : isLessonImageBlock(block)
          ? imageUrl
          : getInspectorContentText(block),
    editor_json: getInspectorEditorJson(block),
    editor_html: getInspectorEditorHtml(block),
    video_source_type: videoSourceType,
    video_url: videoUrl,
    video_embed_code: videoEmbedCode,
    allow_fullscreen: videoContent.allow_fullscreen !== false,
    image_url: imageUrl,
    image_caption: `${imageContent.caption || imageContent.description || ""}`,
    image_alt: `${imageContent.alt_text || imageContent.alt || ""}`,
    image_full_width: imageContent.full_width !== false,
    image_open_full_size: imageContent.open_full_size !== false,
    image_asset: isLessonImageBlock(block) ? imageContent : null,
    quiz_content: isLessonQuizBlock(block) ? quizContent : null,
    presentation_asset: isLessonPresentationBlock(block) ? getPresentationBlockContent(block) : null,
    audio_asset: isLessonAudioBlock(block) ? audioContent : null,
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
    video_source_type: normalizeVideoSourceType(values?.video_source_type),
    video_url: `${values?.video_url || ""}`.trim(),
    video_embed_code: `${values?.video_embed_code || ""}`.trim(),
    allow_fullscreen: values?.allow_fullscreen !== false,
    image_url: `${values?.image_url || ""}`.trim(),
    image_caption: `${values?.image_caption || ""}`.trim(),
    image_alt: `${values?.image_alt || ""}`.trim(),
    image_full_width: values?.image_full_width !== false,
    image_open_full_size: values?.image_open_full_size !== false,
    image_asset: stableStringifyLessonValue(values?.image_asset || null),
    quiz_content: stableStringifyLessonValue(values?.quiz_content || null),
    presentation_asset: stableStringifyLessonValue(values?.presentation_asset || null),
    audio_asset: stableStringifyLessonValue(values?.audio_asset || null),
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
  } else if (type === "video") {
    const sourceType = normalizeVideoSourceType(values.video_source_type);
    const videoUrl = `${values.video_url || ""}`.trim();
    const embedCode = `${values.video_embed_code || ""}`.trim();
    const embedSrc = getVideoEmbedSrc(embedCode);

    contentJson.video_source_type = sourceType;
    contentJson.source_type = sourceType;
    contentJson.url = sourceType === "embed" ? embedSrc : videoUrl;
    contentJson.content_url = contentJson.url;
    contentJson.video_url = videoUrl;
    contentJson.embed_code = sourceType === "embed" ? embedCode : "";
    contentJson.video_embed_code = sourceType === "embed" ? embedCode : "";
    contentJson.allow_fullscreen = values.allow_fullscreen !== false;
  } else if (type === "image") {
    const uploadedImageAsset =
      values.image_asset && typeof values.image_asset === "object"
        ? values.image_asset
        : {};
    const imageUrl = `${uploadedImageAsset.image_url || uploadedImageAsset.image_src || uploadedImageAsset.url || uploadedImageAsset.src || values.image_url || contentText || ""}`.trim();
    const downloadUrl = `${uploadedImageAsset.original_url || uploadedImageAsset.download_url || contentJson.original_url || contentJson.download_url || imageUrl}`.trim();
    const imageCaption = `${values.image_caption || contentJson.caption || contentJson.description || ""}`.trim();
    const imageAlt = `${values.image_alt || contentJson.alt_text || contentJson.alt || ""}`.trim();

    contentJson.material_kind = "image";
    contentJson.asset_id = uploadedImageAsset.asset_id || contentJson.asset_id || "";
    contentJson.original_filename = uploadedImageAsset.original_filename || contentJson.original_filename || "";
    contentJson.source_extension = uploadedImageAsset.source_extension || contentJson.source_extension || "";
    contentJson.mime_type = uploadedImageAsset.mime_type || contentJson.mime_type || "";
    contentJson.size_bytes = uploadedImageAsset.size_bytes || contentJson.size_bytes || null;
    contentJson.url = imageUrl;
    contentJson.content_url = imageUrl;
    contentJson.image_url = imageUrl;
    contentJson.image_src = imageUrl;
    contentJson.src = imageUrl;
    contentJson.original_url = downloadUrl;
    contentJson.download_url = downloadUrl;
    contentJson.caption = imageCaption;
    contentJson.description = imageCaption;
    contentJson.alt_text = imageAlt;
    contentJson.alt = imageAlt;
    contentJson.full_width = values.image_full_width !== false;
    contentJson.open_full_size = values.image_open_full_size !== false;
  } else if (type === "audio") {
    const uploadedAudioAsset =
      values.audio_asset && typeof values.audio_asset === "object"
        ? values.audio_asset
        : {};
    const audioUrl = `${uploadedAudioAsset.stream_url || uploadedAudioAsset.audio_url || uploadedAudioAsset.url || contentText || ""}`.trim();
    const downloadUrl = `${uploadedAudioAsset.original_url || uploadedAudioAsset.download_url || contentJson.original_url || contentJson.download_url || audioUrl}`.trim();

    contentJson.material_kind = "audio";
    contentJson.asset_id = uploadedAudioAsset.asset_id || contentJson.asset_id || "";
    contentJson.original_filename = uploadedAudioAsset.original_filename || contentJson.original_filename || "";
    contentJson.source_extension = uploadedAudioAsset.source_extension || contentJson.source_extension || "";
    contentJson.mime_type = uploadedAudioAsset.mime_type || contentJson.mime_type || "";
    contentJson.size_bytes = uploadedAudioAsset.size_bytes || contentJson.size_bytes || null;
    contentJson.url = audioUrl;
    contentJson.content_url = audioUrl;
    contentJson.audio_url = audioUrl;
    contentJson.stream_url = audioUrl;
    contentJson.original_url = downloadUrl;
    contentJson.download_url = downloadUrl;
    contentJson.show_download = contentJson.show_download !== false;
  } else if (type === "presentation") {
    const uploadedPresentationAsset =
      values.presentation_asset && typeof values.presentation_asset === "object"
        ? values.presentation_asset
        : {};
    const viewerUrl = `${uploadedPresentationAsset.viewer_url || contentText || ""}`.trim();
    const downloadUrl = `${uploadedPresentationAsset.original_url || uploadedPresentationAsset.download_url || contentJson.original_url || contentJson.download_url || viewerUrl}`.trim();
  const sourceFilename = `${uploadedPresentationAsset.original_filename || contentJson.original_filename || ""}`.trim().toLowerCase();
  const inferredSourceExtension = sourceFilename.endsWith(".pptx")
    ? ".pptx"
    : sourceFilename.endsWith(".pdf")
      ? ".pdf"
      : "";

    contentJson.material_kind = "presentation";
    contentJson.asset_id = uploadedPresentationAsset.asset_id || contentJson.asset_id || "";
    contentJson.original_filename = uploadedPresentationAsset.original_filename || contentJson.original_filename || "";
  contentJson.source_extension = uploadedPresentationAsset.source_extension || contentJson.source_extension || inferredSourceExtension;
    contentJson.mime_type = uploadedPresentationAsset.mime_type || contentJson.mime_type || "application/pdf";
    contentJson.size_bytes = uploadedPresentationAsset.size_bytes || contentJson.size_bytes || null;
    contentJson.url = viewerUrl;
    contentJson.content_url = viewerUrl;
    contentJson.viewer_url = viewerUrl;
    contentJson.original_url = downloadUrl;
    contentJson.download_url = downloadUrl;
    contentJson.render_mode = "pdf";
    contentJson.conversion_status = uploadedPresentationAsset.conversion_status || contentJson.conversion_status || (viewerUrl ? "ready" : "empty");
    contentJson.show_download = contentJson.show_download !== false;

} else if (type === "file_link" || type === "file" || type === "link") {
    contentJson.url = contentText;
    contentJson.content_url = contentText;
  } else if (type === "callout") {
    contentJson.text = contentText;
    contentJson.content_text = contentText;
  } else if (type === "quiz") {
    const quizContent = normalizeQuizContent(values.quiz_content || contentJson);

    return {
      block_type: block?.block_type || "quiz",
      title: `${quizContent.title || values.title || ""}`.trim() || null,
      content_json: quizContent,
      position: block?.position || 1,
      is_required: Boolean(values.is_required),
      is_active: Boolean(values.is_active),
    };
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
  onUnsavedStateChange,
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
    ? "mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100"
    : "sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-shell bg-white p-4 shadow-sm ring-1 ring-slate-200";

  const lessonFacts = [
    ["ID урока", lesson?.id || "—"],
    ["Тип", getLessonContentTypeLabel(lesson?.content_type)],
    ["Позиция", lesson?.position || "—"],
    ["Активен", lesson?.is_active === false ? "Нет" : "Да"],
    ["Обязательный", lesson?.is_required ? "Да" : "Нет"],
  ];


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

  const handleQuizContentChange = (nextValue) => {
    const nextQuizContent = normalizeQuizContent(nextValue);

    setForm((current) => {
      const nextForm = {
        ...current,
        quiz_content: nextQuizContent,
      };

      if (getInspectorFormSnapshot(current) === getInspectorFormSnapshot(nextForm)) {
        return current;
      }

      return nextForm;
    });

    setFormError("");
    setFormSuccess("");
  };

  const saveCurrentForm = useCallback(async () => {
    if (!selectedBlock || saving) {
      return false;
    }

    try {
      setFormError("");
      setFormSuccess("");
      await onSaveBlock(selectedBlock, form);
      setSavedFormSnapshotOverride(getInspectorFormSnapshot(form));
      setFormSuccess("Блок сохранён. Полотно обновлено.");
      return true;
    } catch (err) {
      const message = err?.message || "Не удалось сохранить блок.";
      setFormError(message);
      throw new Error(message);
    }
  }, [form, onSaveBlock, saving, selectedBlock]);

  const discardCurrentForm = useCallback(() => {
    const restoredForm = buildInspectorBlockForm(selectedBlock);

    setForm(restoredForm);
    setFormError("");
    setFormSuccess("");
    setSavedFormSnapshotOverride("");
  }, [selectedBlock]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await saveCurrentForm();
  };

  useEffect(() => {
    if (!inlineMode || typeof onUnsavedStateChange !== "function") {
      return undefined;
    }

    onUnsavedStateChange({
      blockId: selectedBlock?.id || "",
      hasUnsavedChanges,
      saving,
      save: saveCurrentForm,
      discard: discardCurrentForm,
    });

    return () => {
      onUnsavedStateChange(null);
    };
  }, [
    discardCurrentForm,
    hasUnsavedChanges,
    inlineMode,
    onUnsavedStateChange,
    saveCurrentForm,
    saving,
    selectedBlock?.id,
  ]);

  return (
    <aside
      data-testid={inspectorTestId}
      className={inspectorClassName}
      onPointerDown={inlineMode ? (event) => event.stopPropagation() : undefined}
      onClick={inlineMode ? (event) => event.stopPropagation() : undefined}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {inlineMode ? "Правка блока" : "Инспектор"}
          </div>
          <h2 className="mt-2 text-[26px] font-black leading-tight text-slate-950">
            {selectedBlock
              ? inlineMode
                ? getBlockDisplayTitle(selectedBlock)
                : "Редактирование блока"
              : "Настройки урока"}
          </h2>

          {inlineMode ? (
            <p className="mt-2 max-w-3xl text-[15px] leading-6 text-slate-500">
              Редактируйте содержимое выбранного блока.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
          {selectedBlock ? (
            <>
              <span
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm ring-1 transition ${
                  saving
                    ? "bg-blue-50 text-blue-700 ring-blue-200"
                    : hasUnsavedChanges
                      ? "bg-amber-50 text-amber-800 ring-amber-200"
                      : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                {saving ? "Сохраняем…" : hasUnsavedChanges ? "Есть изменения" : "Сохранено"}
              </span>

              <span
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm ring-1 ${
                  blockReady
                    ? "bg-green-50 text-green-700 ring-green-200"
                    : "bg-amber-50 text-amber-800 ring-amber-200"
                }`}
              >
                {blockReady ? "✓ Готов" : `${blockIssues.length} проблем`}
              </span>

              {form.is_required ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200">
                  ☆ Обязательный
                </span>
              ) : null}
            </>
          ) : null}

          {inlineMode && onClose ? (
            <button
              type="button"
              data-testid="lesson-studio-inline-inspector-close"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </div>

      {selectedBlock ? (
        <div
          data-testid="lesson-studio-inspector-save-status"
          role="status"
          aria-live="polite"
          className={inlineMode ? "hidden" : `mt-4 rounded-xl p-4 text-sm ring-1 ${saveFeedback.className}`}
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
            className={inlineMode ? "hidden" : `mt-3 rounded-xl px-4 py-3 ring-1 ${
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
            className="mt-4 space-y-4"
          >
            {inlineRichTextMode ? (
              <>
<section
                  data-testid="lesson-studio-inspector-section-content"
                  className="rounded-2xl bg-white"
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

                <section
                  data-testid="lesson-studio-text-block-settings"
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        Настройки блока
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Название, обязательность и видимость блока для обучающихся.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem_17rem]">
                    <label
                      className="block rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200"
                      data-testid="lesson-studio-inspector-title-field"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Название блока
                      </span>
                      <input
                        value={form.title}
                        onChange={(event) => handleFieldChange("title", event.target.value)}
                        placeholder="Название блока"
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
                      />
                    </label>

                    <label className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
                      form.is_required
                        ? "bg-blue-50/70 text-blue-900 ring-blue-200"
                        : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
                    }`}>
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-950">Обязательный</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          Обучающийся должен пройти этот блок.
                        </span>
                      </span>

                      <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-blue-600">
                        <input
                          type="checkbox"
                          checked={form.is_required}
                          onChange={(event) => handleFieldChange("is_required", event.target.checked)}
                          className="peer sr-only"
                        />
                        <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                      </span>
                    </label>

                    <label
                      data-testid="lesson-studio-inspector-section-publication"
                      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl p-3 text-sm ring-1 transition ${
                        form.is_active
                          ? "bg-emerald-50/70 text-emerald-900 ring-emerald-200"
                          : "bg-slate-50/80 text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-950">Показывать в уроке</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          Блок будет виден обучающимся.
                        </span>
                      </span>

                      <span className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-200 p-1 transition group-has-[:checked]:bg-emerald-600">
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(event) => handleFieldChange("is_active", event.target.checked)}
                          className="peer sr-only"
                        />
                        <span className="h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                      </span>
                    </label>
                  </div>
                </section>
              </>
            ) : isLessonVideoBlock(selectedBlock) ? (
              <LessonStudioVideoBlockEditor
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
              />
            ) : isLessonAudioBlock(selectedBlock) ? (
              <LessonStudioAudioBlockEditor
                lesson={lesson}
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
              />
            ) : isLessonImageBlock(selectedBlock) ? (
              <LessonStudioImageBlockEditor
                lesson={lesson}
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
              />
            ) : isLessonPresentationBlock(selectedBlock) ? (
              <LessonStudioPresentationBlockEditor
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
              />
            ) : isLessonFileLinkBlock(selectedBlock) ? (
              <LessonStudioFileLinkBlockEditor
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
              />
            ) : isLessonCalloutBlock(selectedBlock) ? (
              <LessonStudioCalloutBlockEditor
                form={form}
                saving={saving}
                onFieldChange={handleFieldChange}
              />
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
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
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
                  ) : isLessonQuizBlock(selectedBlock) ? (
                    <div className="mt-3 block" data-testid="lesson-studio-quiz-editor">
                      <QuizBlockEditor
                        value={form.quiz_content}
                        onChange={handleQuizContentChange}
                        disabled={!selectedBlock || saving}
                      />
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
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
                        />
                      ) : (
                        <textarea
                          value={form.content_text}
                          onChange={(event) => handleFieldChange("content_text", event.target.value)}
                          placeholder={contentFieldMeta.placeholder}
                          rows={contentFieldMeta.rows}
                          className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
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
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500"
                      />
                      Обязательный блок
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) => handleFieldChange("is_active", event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500"
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
              className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white/95 p-3 shadow-sm ring-1 ring-slate-200 backdrop-blur"
            >
              {inlineMode && onClose ? (
                <button
                  type="button"
                  data-testid="lesson-studio-inline-inspector-cancel"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  className="rounded-xl bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-950"
                >
                  Отмена
                </button>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className={`min-w-[132px] rounded-xl px-8 py-2.5 text-sm font-bold shadow-sm ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  hasUnsavedChanges || saving
                    ? "bg-blue-700 text-white ring-blue-700 hover:bg-blue-800"
                    : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-white hover:text-slate-950"
                }`}
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
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
      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-shell bg-white p-4 shadow-sm ring-1 ring-slate-200"
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

function LessonStudioEditorPanelHeader({ lesson, selectedBlock, blocks, blocksLoading }) {
  const selectedIndex = selectedBlock
    ? blocks.findIndex((block) => block.id === selectedBlock.id)
    : -1;
  const selectedNumber = selectedIndex >= 0 ? selectedIndex + 1 : null;

  return (
    <div
      data-testid="lesson-studio-editor-panel-header"
      className="mb-4 rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Редактирование блока
          </div>

        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedNumber ? (
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100">
              Блок {selectedNumber}
            </span>
          ) : null}

          {selectedBlock ? (
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">
              {getLessonBlockTypeLabel(selectedBlock.block_type)}
            </span>
          ) : null}

          {blocksLoading ? (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 ring-1 ring-amber-200">
              Обновляем…
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LessonStudioLivePreviewPanel({ lesson, blocks, selectedBlock }) {
  const activeBlocks = blocks.filter((block) => block.is_active !== false);
  const focusBlock = selectedBlock || activeBlocks[0] || blocks[0] || null;
  const previewBlocks = activeBlocks.slice(0, 4);
  const focusPreview = focusBlock ? getBlockTextPreview(focusBlock) : "Добавьте блоки урока для предпросмотра.";

  return (
    <aside
      data-testid="lesson-studio-live-preview-panel"
      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-shell bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Предпросмотр урока
          </div>
          <h2 className="mt-1 text-base font-black text-slate-950">
            Как увидит слушатель
          </h2>
        </div>

        <div className="flex rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
            ▣
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400">
            ▯
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          {lesson?.title || "Урок"}
        </div>

        {focusBlock ? (
          <article className="mt-4 rounded-[1.35rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                {getLessonBlockTypeLabel(focusBlock.block_type)}
              </span>
              {focusBlock.is_required ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 ring-1 ring-amber-100">
                  обязательный
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-black leading-7 text-slate-950">
              {getBlockDisplayTitle(focusBlock)}
            </h3>

            <LessonCanvasTypePreview block={focusBlock} preview={focusPreview} learnerMode />
          </article>
        ) : (
          <div className="mt-4 rounded-[1.35rem] bg-white p-5 text-sm leading-6 text-slate-500 ring-1 ring-dashed ring-slate-300">
            Урок пока пустой. Добавьте первый блок, чтобы увидеть предпросмотр.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Структура предпросмотра
          </div>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
            {activeBlocks.length} активн.
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {previewBlocks.length ? (
            previewBlocks.map((block, index) => (
              <div
                key={block.id}
                className={`rounded-2xl px-3 py-2 ring-1 ${
                  focusBlock?.id === block.id
                    ? "bg-blue-50 ring-blue-200"
                    : "bg-slate-50 ring-slate-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-600 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-950">
                      {getBlockDisplayTitle(block, index)}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {getLessonBlockTypeLabel(block.block_type)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500 ring-1 ring-slate-200">
              Активных блоков пока нет.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}


function LessonStudioUnsavedChangesDialog({
  open,
  saving,
  onStay,
  onDiscard,
  onSaveAndContinue,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      data-testid="lesson-studio-unsaved-changes-dialog"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onStay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-studio-unsaved-changes-title"
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700 ring-1 ring-amber-200">
            !
          </span>

          <div className="min-w-0">
            <h2
              id="lesson-studio-unsaved-changes-title"
              className="text-lg font-black text-slate-950"
            >
              Есть несохранённые изменения
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Вы изменили текущий блок, но ещё не сохранили его. Перед переходом
              к другому блоку выберите, что сделать с изменениями.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <button
            type="button"
            data-testid="lesson-studio-unsaved-stay"
            onClick={onStay}
            disabled={saving}
            className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Остаться
          </button>

          <button
            type="button"
            data-testid="lesson-studio-unsaved-discard"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-700 hover:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Перейти без сохранения
          </button>

          <button
            type="button"
            data-testid="lesson-studio-unsaved-save-and-switch"
            onClick={onSaveAndContinue}
            disabled={saving}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm ring-1 ring-blue-700 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Сохранить и перейти"}
          </button>
        </div>
      </div>
    </div>
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
  const [pendingCreatedBlockFocusId, setPendingCreatedBlockFocusId] = useState("");
  const [publishingLesson, setPublishingLesson] = useState(false);
  const [unpublishingLesson, setUnpublishingLesson] = useState(false);
  const [error, setError] = useState("");
  const [showOnlyProblemBlocks, setShowOnlyProblemBlocks] = useState(false);
  const [pendingBlockSelection, setPendingBlockSelection] = useState(null);
  const [pendingSelectionSaving, setPendingSelectionSaving] = useState(false);
  const [inlineEditorDirty, setInlineEditorDirty] = useState(false);
  const inlineEditorGuardRef = useRef({
    blockId: "",
    hasUnsavedChanges: false,
    saving: false,
    save: null,
    discard: null,
  });

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
    if (!pendingCreatedBlockFocusId || viewMode === "preview") {
      return undefined;
    }

    const createdBlockExists = blocks.some((block) => block.id === pendingCreatedBlockFocusId);

    if (!createdBlockExists) {
      return undefined;
    }

    const scrollToPendingCreatedBlock = (behavior = "smooth") => {
      if (typeof document === "undefined" || typeof window === "undefined") {
        return false;
      }

      const safeCreatedBlockId =
        window.CSS?.escape
          ? window.CSS.escape(pendingCreatedBlockFocusId)
          : `${pendingCreatedBlockFocusId}`.replace(/"/g, '\\"');

      const createdBlockElement = document.querySelector(
        `[data-lesson-studio-block-id="${safeCreatedBlockId}"]`
      );

      if (!createdBlockElement) {
        return false;
      }

      const targetTop = Math.max(
        createdBlockElement.getBoundingClientRect().top + window.scrollY - 130,
        0
      );

      window.scrollTo({
        top: targetTop,
        behavior,
      });

      createdBlockElement.focus?.({ preventScroll: true });

      return true;
    };

    const timeouts = [0, 80, 180, 360, 700, 1100].map((delay, index, delays) =>
      window.setTimeout(() => {
        scrollToPendingCreatedBlock(index < 2 ? "auto" : "smooth");

        if (index === delays.length - 1) {
          setPendingCreatedBlockFocusId("");
        }
      }, delay)
    );

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [blocks, pendingCreatedBlockFocusId, viewMode, editingBlockId]);


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

  const commitSelectBlock = useCallback((blockId) => {
    const shouldScrollToBlock = Boolean(blockId && blockId !== selectedBlockId);

    setSelectedBlockId(blockId);

    if (!shouldScrollToBlock || typeof document === "undefined") {
      return;
    }

    window.setTimeout(() => {
      const target = document.getElementById(`studio-block-${blockId}`);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }, 0);
  }, [selectedBlockId]);

  const handleInlineEditorUnsavedStateChange = useCallback((nextState) => {
    inlineEditorGuardRef.current = nextState || {
      blockId: "",
      hasUnsavedChanges: false,
      saving: false,
      save: null,
      discard: null,
    };

    setInlineEditorDirty(Boolean(nextState?.hasUnsavedChanges));
  }, []);

  const getVisibleInlineUnsavedState = useCallback(() => {
    if (typeof document === "undefined") {
      return false;
    }

    const inlineInspector = document.querySelector(
      '[data-testid="lesson-studio-inline-inspector"]'
    );

    const inspectorText = inlineInspector?.textContent || "";

    return (
      inspectorText.includes("Есть изменения") ||
      inspectorText.includes("Есть несохранённые изменения")
    );
  }, []);

  const handlePublishLesson = useCallback(async () => {
    if (!lessonId) {
      setError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u0434\u043b\u044f \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438.");
      return;
    }

    if (!lessonReadiness?.ready) {
      setError("\u041f\u0435\u0440\u0435\u0434 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0435\u0439 \u0438\u0441\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438 \u0443\u0440\u043e\u043a\u0430.");
      return;
    }

    const guard = inlineEditorGuardRef.current || {};

    if (guard.hasUnsavedChanges || getVisibleInlineUnsavedState()) {
      setError("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u0431\u043b\u043e\u043a, \u0437\u0430\u0442\u0435\u043c \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u0443\u0439\u0442\u0435 \u0443\u0440\u043e\u043a.");
      return;
    }

    setPublishingLesson(true);
    setError("");

    try {
      const updatedLesson = await publishAdminCourseLesson(lessonId);
      setLesson(updatedLesson || null);
      await loadBlocks();
    } catch (err) {
      const message = formatLessonStudioError(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u0443\u0440\u043e\u043a");
      setError(message);
    } finally {
      setPublishingLesson(false);
    }
  }, [getVisibleInlineUnsavedState, lessonId, lessonReadiness, loadBlocks]);

  const handleUnpublishLesson = useCallback(async () => {
    if (!lessonId) {
      setError("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u0443\u0440\u043e\u043a \u0434\u043b\u044f \u0441\u043d\u044f\u0442\u0438\u044f \u0441 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438.");
      return;
    }

    const confirmed = window.confirm("\u0421\u043d\u044f\u0442\u044c \u0443\u0440\u043e\u043a \u0441 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438?");

    if (!confirmed) {
      return;
    }

    setUnpublishingLesson(true);
    setError("");

    try {
      const updatedLesson = await unpublishAdminCourseLesson(lessonId);
      setLesson(updatedLesson || null);
      await loadLesson();
    } catch (err) {
      const message = formatLessonStudioError(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043d\u044f\u0442\u044c \u0443\u0440\u043e\u043a \u0441 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438");
      setError(message);
    } finally {
      setUnpublishingLesson(false);
    }
  }, [lessonId, loadLesson]);


  const handleSelectBlock = useCallback((blockId, options = {}) => {
    const guard = inlineEditorGuardRef.current || {};
    const currentEditingBlockId = guard.blockId || editingBlockId || selectedBlockId || "";
    const hasGuardUnsavedChanges = Boolean(guard.hasUnsavedChanges);
    const hasVisibleUnsavedChanges = getVisibleInlineUnsavedState();

    const shouldAskBeforeSwitch =
      !options.force &&
      Boolean(blockId) &&
      Boolean(currentEditingBlockId) &&
      blockId !== currentEditingBlockId &&
      (hasGuardUnsavedChanges || hasVisibleUnsavedChanges);

    if (shouldAskBeforeSwitch) {
      setPendingBlockSelection({ blockId });
      setInlineEditorDirty(true);
      return false;
    }

    commitSelectBlock(blockId);
    return true;
  }, [
    commitSelectBlock,
    editingBlockId,
    getVisibleInlineUnsavedState,
    selectedBlockId,
  ]);

  const handleStayOnUnsavedBlock = useCallback(() => {
    setPendingBlockSelection(null);
  }, []);

  const handleDiscardAndSwitchBlock = useCallback(() => {
    const targetBlockId = pendingBlockSelection?.blockId || "";
    const guard = inlineEditorGuardRef.current;

    if (typeof guard?.discard === "function") {
      guard.discard();
    }

    setPendingBlockSelection(null);
    setEditingBlockId(targetBlockId || "");
    commitSelectBlock(targetBlockId);
  }, [commitSelectBlock, pendingBlockSelection]);

  const handleSaveAndSwitchBlock = useCallback(async () => {
    const targetBlockId = pendingBlockSelection?.blockId || "";

    if (!targetBlockId) {
      setPendingBlockSelection(null);
      return;
    }

    setPendingSelectionSaving(true);
    setError("");

    if (typeof window !== "undefined") {
      window.__lessonStudioSaveAndSwitchTargetBlockId = targetBlockId;
    }

    try {
      const inlineForm =
        typeof document !== "undefined"
          ? document.querySelector('[data-testid="lesson-studio-inline-inspector"] form')
          : null;

      if (!inlineForm || typeof inlineForm.requestSubmit !== "function") {
        const guard = inlineEditorGuardRef.current;

        if (typeof guard?.save !== "function") {
          throw new Error("Не удалось найти открытую форму редактирования блока.");
        }

        await guard.save();
      } else {
        inlineForm.requestSubmit();

        await new Promise((resolve, reject) => {
          const startedAt = Date.now();

          const checkSaved = () => {
            const hasUnsavedChanges = getVisibleInlineUnsavedState();

            if (!hasUnsavedChanges) {
              resolve();
              return;
            }

            if (Date.now() - startedAt > 8000) {
              reject(new Error("Блок не был сохранён. Проверьте поля формы и попробуйте ещё раз."));
              return;
            }

            window.setTimeout(checkSaved, 150);
          };

          window.setTimeout(checkSaved, 250);
        });
      }

      setPendingBlockSelection(null);
      setEditingBlockId(targetBlockId);
      commitSelectBlock(targetBlockId);

      const scrollToTargetBlock = (behavior = "smooth") => {
        if (typeof document === "undefined") {
          return;
        }

        const safeTargetBlockId =
          typeof window !== "undefined" && window.CSS?.escape
            ? window.CSS.escape(targetBlockId)
            : targetBlockId.replace(/"/g, '\\"');

        const targetBlockElement = document.querySelector(
          `[data-lesson-studio-block-id="${safeTargetBlockId}"]`
        );

        if (!targetBlockElement) {
          return;
        }

        targetBlockElement.scrollIntoView({
          behavior,
          block: "start",
          inline: "nearest",
        });

        targetBlockElement.focus?.({ preventScroll: true });
      };

      window.requestAnimationFrame(() => {
        scrollToTargetBlock("auto");

        window.setTimeout(() => scrollToTargetBlock("auto"), 120);
        window.setTimeout(() => scrollToTargetBlock("smooth"), 360);
        window.setTimeout(() => scrollToTargetBlock("smooth"), 700);
      });
    } catch (err) {
      setError(err?.message || "Не удалось сохранить блок перед переходом.");
    } finally {
      setPendingSelectionSaving(false);

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (window.__lessonStudioSaveAndSwitchTargetBlockId === targetBlockId) {
            delete window.__lessonStudioSaveAndSwitchTargetBlockId;
          }
        }, 1200);
      }
    }
  }, [commitSelectBlock, getVisibleInlineUnsavedState, pendingBlockSelection]);

  const handleFixFirstProblem = useCallback(() => {
    const firstProblemBlock = lessonReadiness?.problemBlocks?.[0]?.block || null;

    if (!firstProblemBlock?.id) {
      return;
    }

    setViewMode("editor");
    if (handleSelectBlock(firstProblemBlock.id)) {
      setEditingBlockId(firstProblemBlock.id);
    }
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
    if (handleSelectBlock(nextProblemBlock.id)) {
      setEditingBlockId(nextProblemBlock.id);
    }
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
          const createdBlockId = createdBlock.id;

          setSelectedBlockId(createdBlockId);
          setEditingBlockId(createdBlockId);
          setPendingCreatedBlockFocusId(createdBlockId);
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

      if (!lessonId) {
        throw new Error("Не удалось определить урок для сохранения блока.");
      }

      const payload = buildInspectorBlockPayload(block, values);
      const isLegacyBlock = `${block.id}`.startsWith("legacy-");

      setBlockActionId(block.id);
      setError("");

      try {
        if (isLegacyBlock) {
          const createdBlock = await createAdminLessonBlock(lessonId, payload);
          await loadBlocks();

          if (createdBlock?.id) {
            setSelectedBlockId(createdBlock.id);
            setEditingBlockId(createdBlock.id);
          }

          return;
        }

        await updateAdminLessonBlock(block.id, payload);
        await loadBlocks();
        setSelectedBlockId(block.id);
        setEditingBlockId(block.id);
      } catch (err) {
        throw new Error(formatLessonStudioError(err, "Не удалось сохранить блок"));
      } finally {
        setBlockActionId("");
      }
    },
    [lessonId, loadBlocks]
  );

  return (
    <main data-testid="lesson-studio-page" className="space-y-5">
      <LessonStudioTopbar
        lesson={lesson}
        error={error}
        mode={viewMode}
        onModeChange={setViewMode}
        readinessReport={lessonReadiness}
        publishing={publishingLesson}
        onPublish={handlePublishLesson}
        unpublishing={unpublishingLesson}
        onUnpublish={handleUnpublishLesson}
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
            : "grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]"
        }
      >
        {viewMode !== "preview" ? (
          <LessonStudioStructurePanel
            lesson={lesson}
            blocks={studioStructureBlocks}
            selectedBlockId={selectedBlockId}
            editingBlockId={editingBlockId}
            onSelectBlock={(blockId) => {
              if (handleSelectBlock(blockId)) {
                setEditingBlockId(blockId || "");
              }
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
              ? "min-w-0 rounded-shell bg-slate-50/70 p-4 sm:p-6"
              : "min-w-0 rounded-shell bg-white p-4 shadow-sm ring-1 ring-slate-200"
          }
        >
          {viewMode !== "preview" ? (
            <LessonStudioEditorPanelHeader
              lesson={lesson}
              selectedBlock={selectedBlock}
              blocks={blocks}
              blocksLoading={blocksLoading}
            />
          ) : null}

          <LessonStudioCanvas
            lesson={lesson}
            blocks={blocks}
            mode={viewMode}
            selectedBlockId={selectedBlockId}
            editingBlockId={editingBlockId}
            onSelectBlock={(blockId) => {
              if (handleSelectBlock(blockId)) {
                setEditingBlockId(blockId || "");
              }
            }}
            onRefreshBlocks={loadBlocks}
            quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}
            onCreateBlock={handleQuickCreateBlock}
            onMoveBlock={handleMoveBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlock}
            onSaveBlock={handleInspectorSaveBlock}
            savingBlockId={blockActionId}
            onUnsavedStateChange={handleInlineEditorUnsavedStateChange}
            creatingTemplateKey={creatingTemplateKey}
            movingBlockId={blockActionId}
            duplicatingBlockId={duplicatingBlockId}
            deletingBlockId={deletingBlockId}
            blocksLoading={blocksLoading}
          />
        </section>



      </div>

      <LessonStudioUnsavedChangesDialog
        open={Boolean(pendingBlockSelection)}
        saving={pendingSelectionSaving}
        onStay={handleStayOnUnsavedBlock}
        onDiscard={handleDiscardAndSwitchBlock}
        onSaveAndContinue={handleSaveAndSwitchBlock}
      />
    </main>
  );
}

export default LessonStudioPage;

/*
Smoke guard for legacy lesson block save behavior:
legacy-
createAdminLessonBlock(lessonId, payload)
updateAdminLessonBlock(block.id, payload)
*/

