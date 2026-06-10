import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminLessonBlocks } from "../../api/client";
import { getApiErrorMessage, getApiErrorStatus, getSafeApiErrorMessage } from "../../utils/apiErrors";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { LoadingBlock } from "../ui/LoadingBlock";
import { StatusBadge } from "../ui/StatusBadge";

const STAGE82_LESSON_EDITOR_SHELL = "stage82_4_lesson_editor_shell";

const BLOCK_TYPE_LABELS = {
  rich_text: "Текст",
  video: "Видео",
  file_link: "Файл/ссылка",
  quiz: "Тест",
  assignment: "Задание",
  callout: "Врезка",
};

function getBlockTypeLabel(blockType) {
  return BLOCK_TYPE_LABELS[blockType] || blockType || "Блок";
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

function formatLessonBlocksError(err) {
  const status = getApiErrorStatus(err);
  const message = getSafeApiErrorMessage(
    getApiErrorMessage(err),
    "Не удалось загрузить блоки урока"
  );

  return `${status} ${message}`.trim();
}

export function LessonBlocksEditor({ lessonId }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBlocks = useCallback(async () => {
    if (!lessonId) {
      setBlocks([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getAdminLessonBlocks(lessonId);
      setBlocks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatLessonBlocksError(err));
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
    const legacy = blocks.some((block) => `${block.id || ""}`.startsWith("legacy:"));

    return {
      total: blocks.length,
      required,
      active,
      legacy,
    };
  }, [blocks]);

  if (!lessonId) {
    return null;
  }

  return (
    <section
      data-testid="stage82-lesson-blocks-editor-shell"
      data-stage={STAGE82_LESSON_EDITOR_SHELL}
      className="rounded-2xl bg-white p-4 ring-1 ring-blue-100 md:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 82.4 · Block editor shell
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">
            Новый редактор блоков урока
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Безопасный каркас: читает блоки из нового API и показывает legacy-блоки старых уроков. Старый редактор ниже остаётся рабочим.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={stats.legacy ? "blue" : "green"}>
            {stats.legacy ? "legacy adapter" : "blocks API"}
          </StatusBadge>
          <StatusBadge tone="gray">{stats.total} блоков</StatusBadge>
          <ActionButton type="button" variant="secondary" onClick={loadBlocks} disabled={loading}>
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

      {error ? (
        <Alert className="mt-4" variant="error">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <LoadingBlock className="mt-4" text="Загружаем блоки урока..." />
      ) : null}

      {!loading && !error && blocks.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          Блоки пока не созданы. На следующих этапах здесь появится добавление, редактирование и сортировка блоков.
        </div>
      ) : null}

      {!loading && !error && blocks.length > 0 ? (
        <div className="mt-4 space-y-3">
          {blocks.map((block) => (
            <article
              key={block.id}
              data-testid="stage82-lesson-block-card"
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
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
                  {`${block.id || ""}`.startsWith("legacy:") ? (
                    <StatusBadge tone="blue">legacy</StatusBadge>
                  ) : null}
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
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default LessonBlocksEditor;
