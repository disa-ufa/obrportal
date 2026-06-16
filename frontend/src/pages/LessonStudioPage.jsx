import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminCourseLessonDetail } from "../api/client";
import { LessonBlocksEditor } from "../components/admin/LessonBlocksEditor";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiErrors";

function formatLessonStudioError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);

  return [status, message || fallback].filter(Boolean).join(" ");
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

function LessonStudioTopbar({ lesson, loading, error, onReload }) {
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
            Отдельное рабочее место автора урока. Сейчас здесь подключён текущий
            редактор блоков, дальше этот экран станет canvas-first редактором:
            структура слева, полотно урока по центру, настройки справа.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {loading ? "Загрузка..." : "Черновик"}
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            {lesson ? getLessonContentTypeLabel(lesson.content_type) : "Урок"}
          </span>
          {lesson?.is_required ? (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
              Обязательный
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Дополнительный
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <div className="font-semibold">Не удалось загрузить данные урока.</div>
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

function LessonStudioStructurePanel({ lesson }) {
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
        На следующих этапах здесь будет дерево блоков как в современных
        редакторах: секции, ошибки, скрытые и обязательные элементы.
      </p>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs font-semibold text-slate-500">Текущий урок</div>
        <div className="mt-1 text-sm font-bold text-slate-900">
          {lesson?.title || "Урок загружается"}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-slate-600">
        <div className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-700 ring-1 ring-blue-100">
          Блоки урока
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
          Быстрое добавление
        </div>
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
          Карта урока
        </div>
      </div>
    </aside>
  );
}

function LessonStudioInspector({ lesson }) {
  const facts = useMemo(
    () => [
      ["ID урока", lesson?.id || "—"],
      ["Тип", getLessonContentTypeLabel(lesson?.content_type)],
      ["Позиция", lesson?.position || "—"],
      ["Активен", lesson?.is_active === false ? "Нет" : "Да"],
      ["Обязательный", lesson?.is_required ? "Да" : "Нет"],
    ],
    [lesson]
  );

  return (
    <aside
      data-testid="lesson-studio-inspector"
      className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Инспектор
      </div>
      <h2 className="mt-1 text-sm font-bold text-slate-900">Настройки урока</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Позже здесь появятся контекстные настройки выбранного блока. Пока
        показываем основные свойства урока.
      </p>

      <div className="mt-4 space-y-2">
        {facts.map(([label, value]) => (
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
    </aside>
  );
}

export function LessonStudioPage({ lessonId }) {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  return (
    <main data-testid="lesson-studio-page" className="space-y-5">
      <LessonStudioTopbar
        lesson={lesson}
        loading={loading}
        error={error}
        onReload={loadLesson}
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <LessonStudioStructurePanel lesson={lesson} />

        <section
          data-testid="lesson-studio-canvas"
          className="min-w-0 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div className="mb-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
            <div className="font-bold">Полотно урока</div>
            <div className="mt-1">
              В этом месте пока работает текущий редактор блоков. Следующие
              этапы заменят форму на визуальное полотно с блоками, вставками и
              правым инспектором.
            </div>
          </div>

          <LessonBlocksEditor lessonId={lessonId} />
        </section>

        <LessonStudioInspector lesson={lesson} />
      </div>
    </main>
  );
}

export default LessonStudioPage;
