import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminLessonBlock,
  deleteAdminLessonBlock,
  getAdminLessonBlocks,
  reorderAdminLessonBlocks,
  updateAdminLessonBlock,
} from "../../api/client";
import { getApiErrorMessage, getApiErrorStatus, getSafeApiErrorMessage } from "../../utils/apiErrors";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { LoadingBlock } from "../ui/LoadingBlock";
import { StatusBadge } from "../ui/StatusBadge";

const STAGE82_LESSON_EDITOR_UX = "stage82_6_lesson_block_editor_ux";

const BLOCK_TYPE_LABELS = {
  rich_text: "Текст",
  video: "Видео",
  file_link: "Файл/ссылка",
  quiz: "Тест",
  assignment: "Задание",
  callout: "Врезка",
};

const CALLOUT_TONE_LABELS = {
  info: "Информация",
  success: "Успех",
  warning: "Внимание",
  danger: "Важно",
};

const EMPTY_BLOCK_FORM = {
  block_type: "rich_text",
  title: "",
  content_text: "",
  content_url: "",
  quiz_question: "",
  quiz_options: "",
  quiz_answer: "",
  assignment_due: "",
  callout_tone: "info",
  is_required: false,
  is_active: true,
};

const QUICK_BLOCK_TEMPLATES = [
  {
    key: "rich_text",
    label: "Текст",
    hint: "Короткий текстовый материал",
    tone: "blue",
    values: {
      block_type: "rich_text",
      title: "Текстовый блок",
      content_text: "Добавьте текст урока.",
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
      content_url: "https://example.com/video",
      is_required: false,
      is_active: true,
    },
  },
  {
    key: "file_link",
    label: "Файл/ссылка",
    hint: "Материал, PDF или презентация",
    tone: "violet",
    values: {
      block_type: "file_link",
      title: "Материал к уроку",
      content_url: "https://example.com/material",
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
      title: "Контрольный вопрос",
      quiz_question: "Введите вопрос",
      quiz_options: "Вариант 1\nВариант 2\nВариант 3",
      quiz_answer: "Вариант 1",
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
      title: "Практическое задание",
      content_text: "Опишите задание для слушателя.",
      is_required: true,
      is_active: true,
    },
  },
  {
    key: "callout",
    label: "Врезка",
    hint: "Важное примечание",
    tone: "slate",
    values: {
      block_type: "callout",
      title: "Важно",
      content_text: "Добавьте важное примечание.",
      callout_tone: "info",
      is_required: false,
      is_active: true,
    },
  },
];

function getBlockTypeLabel(blockType) {
  return BLOCK_TYPE_LABELS[blockType] || blockType || "Блок";
}

function getBlockDisplayTitle(block, index = 0) {
  const title = normalizeText(block?.title);
  if (title) {
    return title;
  }

  const content = block?.content_json || {};
  const contentTitle = normalizeText(content.title || content.question || content.text || content.description);
  if (contentTitle) {
    return contentTitle.length > 56 ? `${contentTitle.slice(0, 56)}...` : contentTitle;
  }

  return `${getBlockTypeLabel(block?.block_type)} #${index + 1}`;
}

function isLegacyBlock(block) {
  return `${block?.id || ""}`.startsWith("legacy:");
}

function normalizeText(value) {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function getOptionsArray(value) {
  return `${value || ""}`
    .split("\n")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function buildBlockForm(block) {
  const content = block?.content_json || {};
  const fallbackText = content.text || content.body || content.description || content.title || "";

  return {
    block_type: block?.block_type || "rich_text",
    title: block?.title || "",
    content_text: fallbackText,
    content_url: content.url || content.file_url || content.video_url || "",
    quiz_question: content.question || fallbackText,
    quiz_options: Array.isArray(content.options) ? content.options.join("\n") : "",
    quiz_answer: content.answer || "",
    assignment_due: content.due || content.deadline || "",
    callout_tone: content.tone || "info",
    is_required: Boolean(block?.is_required),
    is_active: Boolean(block?.is_active),
  };
}

function getBlockSummary(block) {
  const content = block?.content_json || {};
  const candidates = [
    content.text,
    content.body,
    content.description,
    content.url,
    content.file_url,
    content.video_url,
    content.question,
    content.title,
  ];

  const value = candidates.find((item) => `${item || ""}`.trim());

  if (!value) {
    return "Контент блока пока не заполнен или хранится в расширенном JSON.";
  }

  const text = normalizeText(value);

  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

function buildContentJson(values) {
  const blockType = values.block_type || "rich_text";
  const text = `${values.content_text || ""}`.trim();
  const url = `${values.content_url || ""}`.trim();

  if (blockType === "video") {
    return {
      ...(url ? { url } : {}),
      ...(text ? { description: text } : {}),
    };
  }

  if (blockType === "file_link") {
    return {
      ...(url ? { url } : {}),
      ...(text ? { description: text } : {}),
    };
  }

  if (blockType === "quiz") {
    return {
      question: `${values.quiz_question || ""}`.trim(),
      options: getOptionsArray(values.quiz_options),
      answer: `${values.quiz_answer || ""}`.trim(),
    };
  }

  if (blockType === "assignment") {
    return {
      ...(text ? { description: text } : {}),
      ...(`${values.assignment_due || ""}`.trim() ? { due: `${values.assignment_due || ""}`.trim() } : {}),
    };
  }

  if (blockType === "callout") {
    return {
      ...(text ? { text } : {}),
      tone: values.callout_tone || "info",
    };
  }

  return text ? { text } : {};
}

function buildBlockPayload(values, position) {
  return {
    block_type: values.block_type || "rich_text",
    title: `${values.title || ""}`.trim() || null,
    content_json: buildContentJson(values),
    position,
    is_required: Boolean(values.is_required),
    is_active: Boolean(values.is_active),
  };
}

function getBlockFormFacts(values) {
  const blockType = values.block_type || "rich_text";
  const missing = [];
  const options = getOptionsArray(values.quiz_options);
  const hasTitle = Boolean(normalizeText(values.title));
  const hasText = Boolean(`${values.content_text || ""}`.trim());
  const hasUrl = Boolean(normalizeText(values.content_url));
  const hasQuestion = Boolean(normalizeText(values.quiz_question));
  const hasAnswer = Boolean(normalizeText(values.quiz_answer));

  if (!hasTitle) {
    missing.push("заголовок");
  }

  if (blockType === "rich_text" && !hasText) {
    missing.push("текст");
  }

  if (blockType === "video" && !hasUrl) {
    missing.push("ссылка на видео");
  }

  if (blockType === "file_link" && !hasUrl) {
    missing.push("ссылка на файл или материал");
  }

  if (blockType === "quiz") {
    if (!hasQuestion) {
      missing.push("вопрос");
    }
    if (options.length < 2) {
      missing.push("минимум 2 варианта ответа");
    }
    if (!hasAnswer) {
      missing.push("правильный ответ");
    }
  }

  if (blockType === "assignment" && !hasText) {
    missing.push("описание задания");
  }

  if (blockType === "callout" && !hasText) {
    missing.push("текст врезки");
  }

  return {
    blockType,
    label: getBlockTypeLabel(blockType),
    missing,
    options,
    ready: missing.length === 0,
  };
}

function formatLessonBlocksError(err, fallback = "Не удалось выполнить действие с блоками урока") {
  const status = getApiErrorStatus(err);
  const message = getSafeApiErrorMessage(getApiErrorMessage(err), fallback);

  return `${status} ${message}`.trim();
}

function getNextBlockPosition(blocks) {
  return blocks.reduce((maxPosition, block) => Math.max(maxPosition, Number(block.position) || 0), 0) + 1;
}

function buildMissingFieldsMessage(missing) {
  const safeMissing = Array.isArray(missing) ? missing : [];
  return "Не заполнено: " + safeMissing.join(", ") + ".";
}

function TypeSpecificFields({ values, onChange, prefix }) {
  if (values.block_type === "video") {
    return (
      <>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ссылка на видео
          </span>
          <input
            id={`${prefix}-video-url`}
            type="text"
            value={values.content_url}
            onChange={(event) => onChange("content_url", event.target.value)}
            placeholder="https://..."
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Описание видео
          </span>
          <textarea
            id={`${prefix}-video-description`}
            value={values.content_text}
            onChange={(event) => onChange("content_text", event.target.value)}
            rows={3}
            placeholder="Что увидит обучающийся"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
      </>
    );
  }

  if (values.block_type === "file_link") {
    return (
      <>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ссылка на файл или материал
          </span>
          <input
            id={`${prefix}-file-url`}
            type="text"
            value={values.content_url}
            onChange={(event) => onChange("content_url", event.target.value)}
            placeholder="https://..."
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Описание материала
          </span>
          <textarea
            id={`${prefix}-file-description`}
            value={values.content_text}
            onChange={(event) => onChange("content_text", event.target.value)}
            rows={3}
            placeholder="Кратко опишите файл или внешний материал"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
      </>
    );
  }

  if (values.block_type === "quiz") {
    return (
      <>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Вопрос
          </span>
          <input
            id={`${prefix}-quiz-question`}
            type="text"
            value={values.quiz_question}
            onChange={(event) => onChange("quiz_question", event.target.value)}
            placeholder="Введите вопрос"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Варианты ответа
          </span>
          <textarea
            id={`${prefix}-quiz-options`}
            value={values.quiz_options}
            onChange={(event) => onChange("quiz_options", event.target.value)}
            rows={4}
            placeholder={"Один вариант на строку"}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Правильный ответ
          </span>
          <input
            id={`${prefix}-quiz-answer`}
            type="text"
            value={values.quiz_answer}
            onChange={(event) => onChange("quiz_answer", event.target.value)}
            placeholder="Напишите правильный ответ"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
      </>
    );
  }

  if (values.block_type === "assignment") {
    return (
      <>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Описание задания
          </span>
          <textarea
            id={`${prefix}-assignment-description`}
            value={values.content_text}
            onChange={(event) => onChange("content_text", event.target.value)}
            rows={4}
            placeholder="Что нужно выполнить"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Срок или ориентир
          </span>
          <input
            id={`${prefix}-assignment-due`}
            type="text"
            value={values.assignment_due}
            onChange={(event) => onChange("assignment_due", event.target.value)}
            placeholder="Например: до конца недели"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
      </>
    );
  }

  if (values.block_type === "callout") {
    return (
      <>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Тон врезки
          </span>
          <select
            id={`${prefix}-callout-tone`}
            value={values.callout_tone}
            onChange={(event) => onChange("callout_tone", event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            {Object.entries(CALLOUT_TONE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Текст врезки
          </span>
          <textarea
            id={`${prefix}-callout-text`}
            value={values.content_text}
            onChange={(event) => onChange("content_text", event.target.value)}
            rows={4}
            placeholder="Важная заметка, предупреждение или подсказка"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
          />
        </label>
      </>
    );
  }

  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Текст блока
      </span>
      <textarea
        id={`${prefix}-rich-text`}
        value={values.content_text}
        onChange={(event) => onChange("content_text", event.target.value)}
        rows={5}
        placeholder="Основной текст урока"
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
      />
    </label>
  );
}

function LessonBlockPreview({ values }) {
  const facts = getBlockFormFacts(values);

  return (
    <section
      data-testid="stage82-lesson-block-preview"
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 md:col-span-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Предпросмотр блока
          </div>
          <h5 className="mt-1 text-sm font-bold text-slate-900">
            {values.title || "Без названия"}
          </h5>
        </div>
        <StatusBadge tone={facts.ready ? "green" : "red"}>
          {facts.ready ? "Готов к сохранению" : "Нужно заполнить"}
        </StatusBadge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge tone="blue">{facts.label}</StatusBadge>
        <StatusBadge tone={values.is_active ? "green" : "gray"}>
          {values.is_active ? "Активен" : "Отключён"}
        </StatusBadge>
        <StatusBadge tone={values.is_required ? "blue" : "gray"}>
          {values.is_required ? "Обязательный" : "Необязательный"}
        </StatusBadge>
      </div>

      {facts.missing.length ? (
        <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-200">
          Не заполнено: {facts.missing.join(", ")}.
        </div>
      ) : null}

      {values.block_type === "quiz" ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
          <div className="font-semibold text-slate-900">
            {values.quiz_question || "Вопрос не заполнен"}
          </div>
          {facts.options.length ? (
            <ul className="mt-2 list-disc pl-5">
              {facts.options.map((option) => <li key={option}>{option}</li>)}
            </ul>
          ) : null}
          {values.quiz_answer ? (
            <div className="mt-2 text-xs text-slate-500">
              Правильный ответ: {values.quiz_answer}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
          {values.content_text || values.content_url || "Контент пока не заполнен."}
        </div>
      )}

      {values.content_url ? (
        <div className="mt-2 break-all text-xs text-slate-500">
          URL: {values.content_url}
        </div>
      ) : null}

      {values.block_type === "callout" ? (
        <div className="mt-2 text-xs text-slate-500">
          Тон: {CALLOUT_TONE_LABELS[values.callout_tone] || values.callout_tone}
        </div>
      ) : null}

      {values.block_type === "assignment" && values.assignment_due ? (
        <div className="mt-2 text-xs text-slate-500">
          Срок: {values.assignment_due}
        </div>
      ) : null}
    </section>
  );
}

function QuickBlockPalette({ templates, onCreate, disabled, actionKey }) {
  return (
    <section
      data-testid="stage83-quick-block-palette"
      className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-blue-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 83.1 · Quick blocks
          </div>
          <h5 className="mt-1 text-sm font-bold text-slate-900">
            Быстро добавить блок
          </h5>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Создавайте типовые блоки урока в один клик, а затем редактируйте содержимое.
          </p>
        </div>

        <StatusBadge tone={disabled ? "gray" : "green"}>
          {disabled ? "недоступно" : "готово"}
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const templateActionKey = `quick-create:${template.key}`;
          const busy = actionKey === templateActionKey;

          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onCreate(template)}
              disabled={disabled}
              className="rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition hover:bg-white hover:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-900">
                  + {template.label}
                </div>
                <StatusBadge tone={template.tone}>
                  {getBlockTypeLabel(template.values.block_type)}
                </StatusBadge>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {template.hint}
              </p>

              {busy ? (
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


function LessonMap({ blocks, onSelect }) {
  if (!blocks.length) {
    return null;
  }

  return (
    <div
      data-testid="stage83-lesson-map"
      className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 83.1 · Lesson map
          </div>
          <h5 className="mt-1 text-sm font-bold text-slate-900">Карта урока</h5>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Быстрый переход к нужному блоку урока.
          </p>
        </div>
        <StatusBadge tone="gray">{blocks.length} блоков</StatusBadge>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((block, index) => {
          const legacy = isLegacyBlock(block);
          const title = getBlockDisplayTitle(block, index);

          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onSelect(block)}
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #{block.position || index + 1} · {getBlockTypeLabel(block.block_type)}
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900 group-hover:text-blue-800">
                    {title}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {legacy ? <StatusBadge tone="blue">legacy</StatusBadge> : null}
                  {!block.is_active ? <StatusBadge tone="gray">скрыт</StatusBadge> : null}
                  {block.is_required ? <StatusBadge tone="blue">обяз.</StatusBadge> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonBlockForm({ values, onChange, prefix }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Тип блока
        </span>
        <select
          id={`${prefix}-block-type`}
          value={values.block_type}
          onChange={(event) => onChange("block_type", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Заголовок
        </span>
        <input
          id={`${prefix}-block-title`}
          type="text"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Название блока"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100"
        />
      </label>

      <TypeSpecificFields values={values} onChange={onChange} prefix={prefix} />
      <LessonBlockPreview values={values} />

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <input
          id={`${prefix}-block-required`}
          type="checkbox"
          checked={values.is_required}
          onChange={(event) => onChange("is_required", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-semibold">Обязательный блок</span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <input
          id={`${prefix}-block-active`}
          type="checkbox"
          checked={values.is_active}
          onChange={(event) => onChange("is_active", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-semibold">Активен</span>
      </label>
    </div>
  );
}

export function LessonBlocksEditor({ lessonId, onBlocksChanged }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createForm, setCreateForm] = useState(EMPTY_BLOCK_FORM);
  const [editingBlockId, setEditingBlockId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_BLOCK_FORM);
  const [actionKey, setActionKey] = useState("");

  const loadBlocks = useCallback(async () => {
    if (!lessonId) {
      setBlocks([]);

      if (typeof onBlocksChanged === "function") {
        onBlocksChanged([]);
      }

      return;
    }

    setLoading(true);
    setActionError("");

    try {
      const data = await getAdminLessonBlocks(lessonId);
      const nextBlocks = Array.isArray(data) ? data : [];

      setBlocks(nextBlocks);

      if (typeof onBlocksChanged === "function") {
        onBlocksChanged(nextBlocks);
      }
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось загрузить блоки урока"));
    } finally {
      setLoading(false);
    }
  }, [lessonId, onBlocksChanged]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const stats = useMemo(() => {
    const required = blocks.filter((block) => block.is_required).length;
    const active = blocks.filter((block) => block.is_active).length;
    const legacy = blocks.some(isLegacyBlock);
    const realBlocks = blocks.filter((block) => !isLegacyBlock(block));

    return {
      total: blocks.length,
      required,
      active,
      legacy,
      realBlocks,
    };
  }, [blocks]);

  const createFacts = getBlockFormFacts(createForm);
  const editFacts = getBlockFormFacts(editForm);

  const handleCreateFieldChange = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    if (!createFacts.ready) {
      setActionError(buildMissingFieldsMessage(createFacts.missing));
      return;
    }

    const position = getNextBlockPosition(stats.realBlocks);

    setActionKey("create");
    setActionError("");
    setSuccessMessage("");

    try {
      await createAdminLessonBlock(lessonId, buildBlockPayload(createForm, position));
      setCreateForm(EMPTY_BLOCK_FORM);
      setSuccessMessage("Блок добавлен.");
      await loadBlocks();
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось добавить блок урока"));
    } finally {
      setActionKey("");
    }
  };

  const handleQuickCreateBlock = async (template) => {
    if (!lessonId || !template?.values) {
      setActionError("Не удалось определить урок или тип блока.");
      return;
    }

    const position = getNextBlockPosition(stats.realBlocks);
    const action = `quick-create:${template.key}`;

    setActionKey(action);
    setActionError("");
    setSuccessMessage("");

    try {
      await createAdminLessonBlock(
        lessonId,
        buildBlockPayload(
          {
            ...EMPTY_BLOCK_FORM,
            ...template.values,
          },
          position
        )
      );

      setCreateForm({
        ...EMPTY_BLOCK_FORM,
        block_type: template.values.block_type || "rich_text",
      });
      setSuccessMessage(`Блок добавлен: ${template.label}.`);
      await loadBlocks();
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось быстро добавить блок урока"));
    } finally {
      setActionKey("");
    }
  };

  const handleEditStart = (block) => {
    setEditingBlockId(block.id);
    setEditForm(buildBlockForm(block));
    setActionError("");
    setSuccessMessage("");
  };

  const handleEditCancel = () => {
    setEditingBlockId("");
    setEditForm(EMPTY_BLOCK_FORM);
    setActionError("");
  };

  const handleEditSubmit = async (event, block) => {
    event.preventDefault();

    if (!editFacts.ready) {
      setActionError(buildMissingFieldsMessage(editFacts.missing));
      return;
    }

    setActionKey(`update:${block.id}`);
    setActionError("");
    setSuccessMessage("");

    try {
      await updateAdminLessonBlock(block.id, buildBlockPayload(editForm, block.position));
      setEditingBlockId("");
      setEditForm(EMPTY_BLOCK_FORM);
      setSuccessMessage("Блок сохранён.");
      await loadBlocks();
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось сохранить блок урока"));
    } finally {
      setActionKey("");
    }
  };

  const handleDelete = async (block) => {
    const confirmed = window.confirm(`Удалить блок "${block.title || getBlockTypeLabel(block.block_type)}"?`);
    if (!confirmed) {
      return;
    }

    setActionKey(`delete:${block.id}`);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteAdminLessonBlock(block.id);
      setSuccessMessage("Блок удалён.");
      await loadBlocks();
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось удалить блок урока"));
    } finally {
      setActionKey("");
    }
  };

  const handleScrollToBlock = useCallback((block) => {
    const target = document.getElementById(`lesson-block-${block.id}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleMove = async (block, direction) => {
    const realBlocks = stats.realBlocks
      .slice()
      .sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0));

    const index = realBlocks.findIndex((item) => item.id === block.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= realBlocks.length) {
      return;
    }

    const reordered = realBlocks.slice();
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((item, itemIndex) => ({
      id: item.id,
      position: itemIndex + 1,
    }));

    setActionKey(`move:${block.id}`);
    setActionError("");
    setSuccessMessage("");

    try {
      await reorderAdminLessonBlocks(lessonId, payload);
      setSuccessMessage("Порядок блоков обновлён.");
      await loadBlocks();
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось изменить порядок блоков"));
    } finally {
      setActionKey("");
    }
  };

  if (!lessonId) {
    return null;
  }

  return (
    <section
      data-testid="stage82-lesson-blocks-editor-ux"
      data-stage={STAGE82_LESSON_EDITOR_UX}
      className="rounded-2xl bg-white p-4 ring-1 ring-blue-100 md:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 82.6 · Block editor UX
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">
            Новый редактор блоков урока
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Типовые поля под каждый тип блока и предпросмотр перед сохранением. Старый редактор урока остаётся ниже.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={stats.legacy ? "blue" : "green"}>
            {stats.legacy ? "legacy adapter" : "blocks API"}
          </StatusBadge>
          <StatusBadge tone="gray">{stats.total} блоков</StatusBadge>
          <ActionButton type="button" variant="secondary" onClick={loadBlocks} disabled={loading || Boolean(actionKey)}>
            Обновить
          </ActionButton>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Всего</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Активных</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{stats.active}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Обязательных</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{stats.required}</div>
        </div>
      </div>

      {actionError ? (
        <Alert className="mt-4" title="Ошибка" tone="red">
          {actionError}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert className="mt-4" title="Готово" tone="green">
          {successMessage}
        </Alert>
      ) : null}

      {loading ? (
        <LoadingBlock className="mt-4" text="Загружаем блоки урока..." />
      ) : null}

      {!loading ? (
        <QuickBlockPalette
          templates={QUICK_BLOCK_TEMPLATES}
          onCreate={handleQuickCreateBlock}
          disabled={!lessonId || loading || Boolean(actionKey)}
          actionKey={actionKey}
        />
      ) : null}

      {!loading && blocks.length > 0 ? (
        <LessonMap blocks={blocks} onSelect={handleScrollToBlock} />
      ) : null}

      <form
        data-testid="stage82-lesson-block-create-form"
        onSubmit={handleCreateSubmit}
        className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <div>
          <h5 className="text-sm font-bold text-slate-900">Добавить блок</h5>
          <p className="mt-1 text-xs text-slate-500">
            Выберите тип блока, заполните типовые поля и проверьте предпросмотр.
          </p>
        </div>

        <LessonBlockForm
          values={createForm}
          onChange={handleCreateFieldChange}
          prefix={`lesson-${lessonId}-block-create`}
        />

        <div className="flex flex-wrap gap-3">
          <ActionButton type="submit" tone="blue" disabled={loading || Boolean(actionKey) || !createFacts.ready}>
            {actionKey === "create" ? "Сохраняем..." : "Добавить блок"}
          </ActionButton>
          <ActionButton
            type="button"
            tone="light"
            onClick={() => setCreateForm(EMPTY_BLOCK_FORM)}
            disabled={loading || Boolean(actionKey)}
          >
            Очистить
          </ActionButton>
        </div>

        {stats.legacy ? (
          <div className="rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 ring-1 ring-blue-200">
            Урок сейчас отображается через legacy adapter. Создание первого реального блока переведёт урок на блочный режим.
          </div>
        ) : null}
      </form>

      {!loading && !actionError && blocks.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          Блоки пока не созданы. Добавьте первый блок через форму выше.
        </div>
      ) : null}

      {!loading && blocks.length > 0 ? (
        <div className="mt-4 space-y-3">
          {blocks.map((block) => {
            const legacy = isLegacyBlock(block);
            const editing = editingBlockId === block.id;
            const realBlocks = stats.realBlocks;
            const realIndex = realBlocks.findIndex((item) => item.id === block.id);
            const canMoveUp = !legacy && realIndex > 0;
            const canMoveDown = !legacy && realIndex >= 0 && realIndex < realBlocks.length - 1;
            const busy = Boolean(actionKey);

            return (
              <article
                id={`lesson-block-${block.id}`}
                key={block.id}
                data-testid="stage82-lesson-block-card"
                className="scroll-mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                {!editing ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          #{block.position} · {getBlockTypeLabel(block.block_type)}
                        </div>
                        <h5 className="mt-1 text-sm font-bold text-slate-900">
                          {block.title || "Без названия"}
                        </h5>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {legacy ? <StatusBadge tone="blue">legacy</StatusBadge> : null}
                        <StatusBadge tone={block.is_active ? "green" : "gray"}>
                          {block.is_active ? "Активен" : "Отключён"}
                        </StatusBadge>
                        <StatusBadge tone={block.is_required ? "blue" : "gray"}>
                          {block.is_required ? "Обязательный" : "Необязательный"}
                        </StatusBadge>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {getBlockSummary(block)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <ActionButton
                        type="button"
                        tone="blue"
                        onClick={() => handleEditStart(block)}
                        disabled={legacy || busy}
                      >
                        Редактировать
                      </ActionButton>
                      <ActionButton
                        type="button"
                        tone="light"
                        onClick={() => handleMove(block, "up")}
                        disabled={!canMoveUp || busy}
                      >
                        Выше
                      </ActionButton>
                      <ActionButton
                        type="button"
                        tone="light"
                        onClick={() => handleMove(block, "down")}
                        disabled={!canMoveDown || busy}
                      >
                        Ниже
                      </ActionButton>
                      <ActionButton
                        type="button"
                        tone="red"
                        onClick={() => handleDelete(block)}
                        disabled={legacy || busy}
                      >
                        Удалить
                      </ActionButton>
                    </div>

                    {legacy ? (
                      <div className="mt-3 rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 ring-1 ring-blue-200">
                        Это синтетический legacy-блок. Его нельзя редактировать напрямую.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <form onSubmit={(event) => handleEditSubmit(event, block)} className="space-y-4">
                    <LessonBlockForm
                      values={editForm}
                      onChange={handleEditFieldChange}
                      prefix={`lesson-${lessonId}-block-${block.id}-edit`}
                    />

                    <div className="flex flex-wrap gap-3">
                      <ActionButton type="submit" tone="blue" disabled={actionKey === `update:${block.id}` || !editFacts.ready}>
                        {actionKey === `update:${block.id}` ? "Сохраняем..." : "Сохранить блок"}
                      </ActionButton>
                      <ActionButton type="button" tone="light" onClick={handleEditCancel} disabled={Boolean(actionKey)}>
                        Отмена
                      </ActionButton>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default LessonBlocksEditor;
