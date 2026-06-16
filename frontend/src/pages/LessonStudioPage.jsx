import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminCourseLessonDetail,
  getAdminLessonBlocks,
  updateAdminLessonBlock,
} from "../api/client";
import { LessonBlocksEditor } from "../components/admin/LessonBlocksEditor";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

function formatLessonStudioError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);

  return [status, message || fallback].filter(Boolean).join(" ");
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

function LessonStudioTopbar({ lesson, blocks, loading, blocksLoading, error, onReload }) {
  const requiredBlocks = blocks.filter((block) => block.is_required).length;
  const activeBlocks = blocks.filter((block) => block.is_active !== false).length;

  return (
    <section
      data-testid="lesson-studio-topbar"
      className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <a
            href="/admin/courses"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← К программам
          </a>

          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 83.2 · Lesson Studio
          </div>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            {lesson?.title || "Студия урока"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Отдельное рабочее место автора урока. Теперь студия показывает структуру
            и визуальное полотно блоков, а технический редактор остаётся ниже для действий.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <LessonStudioBadge tone={loading || blocksLoading ? "amber" : "slate"}>
            {loading || blocksLoading ? "Загрузка..." : "Черновик"}
          </LessonStudioBadge>
          <LessonStudioBadge tone="blue">
            {lesson ? getLessonContentTypeLabel(lesson.content_type) : "Урок"}
          </LessonStudioBadge>
          <LessonStudioBadge tone={lesson?.is_required ? "green" : "slate"}>
            {lesson?.is_required ? "Обязательный" : "Дополнительный"}
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
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <div className="font-semibold">Не удалось загрузить данные студии.</div>
          <div className="mt-1">{error}</div>
          <button
            type="button"
            onClick={onReload}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Повторить
          </button>
        </div>
      ) : null}
    </section>
  );
}

function LessonStudioStructurePanel({ lesson, blocks, selectedBlockId, onSelectBlock }) {
  return (
    <aside
      data-testid="lesson-studio-structure"
      className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Структура
      </div>
      <h2 className="mt-1 text-sm font-bold text-slate-900">Навигация урока</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Реальная карта блоков урока. Нажмите на блок, чтобы выделить его на полотне
        и увидеть краткие свойства в инспекторе.
      </p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs font-semibold text-slate-500">Текущий урок</div>
        <div className="mt-1 text-sm font-bold text-slate-900">
          {lesson?.title || "Урок загружается"}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {blocks.length ? (
          blocks.map((block, index) => {
            const selected = block.id === selectedBlockId;
            const issues = getBlockValidationIssues(block);

            return (
              <button
                key={block.id}
                type="button"
                onClick={() => onSelectBlock(block.id)}
                className={`w-full rounded-2xl p-3 text-left ring-1 transition ${
                  selected
                    ? "bg-blue-50 ring-blue-200"
                    : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #{block.position || index + 1} · {getLessonBlockTypeLabel(block.block_type)}
                  </span>
                  {issues.length ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                      !
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-200">
                      ✓
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {getBlockDisplayTitle(block, index)}
                </div>
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

function LessonCanvasBlock({ block, index, selected, onSelect }) {
  const issues = getBlockValidationIssues(block);
  const typeTone = getLessonBlockTone(block.block_type);
  const title = getBlockDisplayTitle(block, index);
  const preview = getBlockTextPreview(block);

  return (
    <article
      id={`studio-block-${block.id}`}
      data-testid="lesson-studio-canvas-block"
      className={`rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 transition ${
        selected ? "ring-blue-300" : "ring-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(block.id)}
        className="block w-full text-left"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              #{block.position || index + 1} · {getLessonBlockTypeLabel(block.block_type)}
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <LessonStudioBadge tone={typeTone}>
              {getLessonBlockTypeLabel(block.block_type)}
            </LessonStudioBadge>
            {block.is_required ? (
              <LessonStudioBadge tone="green">Обязательный</LessonStudioBadge>
            ) : (
              <LessonStudioBadge tone="slate">Дополнительный</LessonStudioBadge>
            )}
            {block.is_active === false ? (
              <LessonStudioBadge tone="red">Скрыт</LessonStudioBadge>
            ) : (
              <LessonStudioBadge tone="green">Активен</LessonStudioBadge>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
          {preview}
        </div>

        {issues.length ? (
          <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Нужно заполнить: {issues.join(", ")}.
          </div>
        ) : null}
      </button>
    </article>
  );
}

function LessonStudioCanvas({ blocks, selectedBlockId, onSelectBlock, onRefreshBlocks, blocksLoading }) {
  return (
    <section data-testid="lesson-studio-visual-canvas" className="space-y-3">
      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-bold">Визуальное полотно урока</div>
            <div className="mt-1">
              Первый canvas-first слой: блоки отображаются как учебный материал.
              Редактирование пока остаётся в техническом редакторе ниже.
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshBlocks}
            disabled={blocksLoading}
            className="rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {blocksLoading ? "Обновляем..." : "Обновить полотно"}
          </button>
        </div>
      </div>

      {blocks.length ? (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <LessonCanvasBlock
              key={block.id}
              block={block}
              index={index}
              selected={block.id === selectedBlockId}
              onSelect={onSelectBlock}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-dashed ring-slate-300">
          Урок пока пустой. Используйте технический редактор ниже, чтобы добавить первый блок.
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

  const blockIssues = selectedBlock ? getBlockValidationIssues(selectedBlock) : [];
  const saving = Boolean(selectedBlock?.id && savingBlockId === selectedBlock.id);

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
      className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
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
          <div className="mt-4 rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Блок
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {getBlockDisplayTitle(selectedBlock)}
            </div>
          </div>

          <form
            data-testid="lesson-studio-inspector-form"
            onSubmit={handleSubmit}
            className="mt-4 space-y-3"
          >
            <label className="block">
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

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Текст / содержимое
              </span>
              <textarea
                value={form.content_text}
                onChange={(event) => handleFieldChange("content_text", event.target.value)}
                rows={6}
                placeholder="Основной текст, ссылка или описание блока"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(event) => handleFieldChange("is_required", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="font-semibold">Обязательный блок</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => handleFieldChange("is_active", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="font-semibold">Активен</span>
            </label>

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

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Сохраняем..." : "Сохранить блок"}
            </button>
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

      {selectedBlock ? (
        <div className="mt-4 space-y-2">
          {blockFacts.map(([label, value]) => (
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
      ) : null}

      {blockIssues.length ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Нужно заполнить: {blockIssues.join(", ")}.
        </div>
      ) : null}
    </aside>
  );
}

export function LessonStudioPage({ lessonId }) {
  const [lesson, setLesson] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blockActionId, setBlockActionId] = useState("");
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
        onReload={reloadStudio}
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <LessonStudioStructurePanel
          lesson={lesson}
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
        />

        <section
          data-testid="lesson-studio-canvas"
          className="min-w-0 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <LessonStudioCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onRefreshBlocks={loadBlocks}
            blocksLoading={blocksLoading}
          />

          <details
            data-testid="lesson-studio-technical-editor"
            className="mt-5 rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <summary className="cursor-pointer text-sm font-bold text-slate-900">
              Технический редактор блоков
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Временный рабочий редактор для создания, изменения и сортировки блоков.
              После стабилизации canvas-first режима этот блок будет заменён инспектором.
            </p>

            <div className="mt-4">
              <LessonBlocksEditor
                lessonId={lessonId}
                onBlocksChanged={handleEditorBlocksChanged}
              />
            </div>
          </details>
        </section>

        <LessonStudioInspector
          lesson={lesson}
          selectedBlock={selectedBlock}
          onSaveBlock={handleInspectorSaveBlock}
          savingBlockId={blockActionId}
        />
      </div>
    </main>
  );
}

export default LessonStudioPage;
