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

const STAGE82_LESSON_EDITOR_ACTIONS = "stage82_5_lesson_block_editor_actions";

const BLOCK_TYPE_LABELS = {
  rich_text: "Текст",
  video: "Видео",
  file_link: "Файл/ссылка",
  quiz: "Тест",
  assignment: "Задание",
  callout: "Врезка",
};

const EMPTY_BLOCK_FORM = {
  block_type: "rich_text",
  title: "",
  content_text: "",
  is_required: false,
  is_active: true,
};

function getBlockTypeLabel(blockType) {
  return BLOCK_TYPE_LABELS[blockType] || blockType || "Блок";
}

function isLegacyBlock(block) {
  return `${block?.id || ""}`.startsWith("legacy:");
}

function buildBlockForm(block) {
  const content = block?.content_json || {};

  return {
    block_type: block?.block_type || "rich_text",
    title: block?.title || "",
    content_text: content.text || content.body || content.description || content.url || "",
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
    content.title,
  ];

  const value = candidates.find((item) => `${item || ""}`.trim());

  if (!value) {
    return "Контент блока пока не заполнен или хранится в расширенном JSON.";
  }

  const text = `${value}`.replace(/\s+/g, " ").trim();

  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

function buildBlockPayload(values, position) {
  const text = `${values.content_text || ""}`.trim();

  return {
    block_type: values.block_type || "rich_text",
    title: `${values.title || ""}`.trim() || null,
    content_json: text ? { text } : {},
    position,
    is_required: Boolean(values.is_required),
    is_active: Boolean(values.is_active),
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

function LessonBlockForm({ values, onChange, prefix }) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Тип блока
        </span>
        <select
          id={`${prefix}-block-type`}
          value={values.block_type}
          onChange={(event) => onChange("block_type", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Контент
        </span>
        <textarea
          id={`${prefix}-block-content`}
          value={values.content_text}
          onChange={(event) => onChange("content_text", event.target.value)}
          rows={4}
          placeholder="Текст, ссылка или краткое содержание блока"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

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

export function LessonBlocksEditor({ lessonId }) {
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
      return;
    }

    setLoading(true);
    setActionError("");

    try {
      const data = await getAdminLessonBlocks(lessonId);
      setBlocks(Array.isArray(data) ? data : []);
    } catch (err) {
      setActionError(formatLessonBlocksError(err, "Не удалось загрузить блоки урока"));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

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

  const handleCreateFieldChange = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

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
      data-testid="stage82-lesson-blocks-editor-actions"
      data-stage={STAGE82_LESSON_EDITOR_ACTIONS}
      className="rounded-2xl bg-white p-4 ring-1 ring-blue-100 md:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 82.5 · Block editor actions
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">
            Новый редактор блоков урока
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Добавление, редактирование, удаление и изменение порядка блоков через новый Admin API. Старый редактор урока остаётся ниже.
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
        <Alert className="mt-4" variant="error">
          {actionError}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert className="mt-4" variant="success">
          {successMessage}
        </Alert>
      ) : null}

      {loading ? (
        <LoadingBlock className="mt-4" text="Загружаем блоки урока..." />
      ) : null}

      <form
        data-testid="stage82-lesson-block-create-form"
        onSubmit={handleCreateSubmit}
        className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <div>
          <h5 className="text-sm font-bold text-slate-900">Добавить блок</h5>
          <p className="mt-1 text-xs text-slate-500">
            POST /api/v1/admin/course-lessons/{lessonId}/blocks
          </p>
        </div>

        <LessonBlockForm
          values={createForm}
          onChange={handleCreateFieldChange}
          prefix={`lesson-${lessonId}-block-create`}
        />

        <div className="flex flex-wrap gap-3">
          <ActionButton type="submit" tone="blue" disabled={loading || Boolean(actionKey) || stats.legacy}>
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
            Урок сейчас отображается через legacy adapter. Чтобы перейти на реальные блоки, сначала сохраните урок и добавьте первый блок после обновления данных.
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
                key={block.id}
                data-testid="stage82-lesson-block-card"
                className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
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
                      <ActionButton type="submit" tone="blue" disabled={actionKey === `update:${block.id}`}>
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
