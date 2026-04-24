import { useEffect, useState } from "react";
import {
  activateAdminCourse,
  createAdminCourse,
  deactivateAdminCourse,
  deleteAdminCourse,
  getAdminCourses,
  updateAdminCourse,
} from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeHoursInput(value) {
  if (`${value}`.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function buildEditForm(course) {
  return {
    slug: course.slug || "",
    title: course.title || "",
    description: course.description || "",
    hours: course.hours ?? "",
    format: course.format || "",
    document_type: course.document_type || "",
    is_active: Boolean(course.is_active),
  };
}

function EmptyState({ onReset }) {
  return (
    <div className="rounded-[2rem] bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-900">Программы не найдены</div>
      <p className="mt-2 leading-6">
        Попробуйте изменить фильтры или создайте первую образовательную программу.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}

function CourseFormFields({ values, onChange, prefix = "" }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Slug
        </span>
        <input
          type="text"
          value={values.slug}
          onChange={(event) => onChange("slug", event.target.value)}
          placeholder="povyshenie-kvalifikatsii"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Название
        </span>
        <input
          type="text"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Название программы"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Описание
        </span>
        <textarea
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={4}
          placeholder="Краткое описание программы для каталога и личного кабинета"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Объем, часов
        </span>
        <input
          type="number"
          min="1"
          max="10000"
          value={values.hours}
          onChange={(event) => onChange("hours", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Формат
        </span>
        <input
          type="text"
          value={values.format}
          onChange={(event) => onChange("format", event.target.value)}
          placeholder="online / mixed / очно-заочно"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Итоговый документ
        </span>
        <input
          type="text"
          value={values.document_type}
          onChange={(event) => onChange("document_type", event.target.value)}
          placeholder="Сертификат / Удостоверение"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <input
          id={`${prefix}is-active`}
          type="checkbox"
          checked={values.is_active}
          onChange={(event) => onChange("is_active", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-semibold">Активна</span>
      </label>
    </div>
  );
}

export function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionCourseId, setActionCourseId] = useState("");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    slug: "",
    title: "",
    description: "",
    hours: "",
    format: "",
    document_type: "Сертификат",
    is_active: true,
  });

  const [editForm, setEditForm] = useState({
    slug: "",
    title: "",
    description: "",
    hours: "",
    format: "",
    document_type: "",
    is_active: true,
  });

  function buildFilters(overrides = {}) {
    return {
      q: overrides.q ?? filterQuery,
      is_active: overrides.is_active ?? filterActive,
    };
  }

  async function loadData(filters = null) {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminCourses(filters ?? buildFilters());
      setCourses(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось загрузить программы."}`.trim());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      slug: "",
      title: "",
      description: "",
      hours: "",
      format: "",
      document_type: "Сертификат",
      is_active: true,
    });
  }

  function resetEditState() {
    setEditingCourseId("");
    setEditForm({
      slug: "",
      title: "",
      description: "",
      hours: "",
      format: "",
      document_type: "",
      is_active: true,
    });
  }

  function buildPayload(values) {
    return {
      slug: values.slug.trim(),
      title: values.title.trim(),
      description: values.description.trim() || null,
      hours: normalizeHoursInput(values.hours),
      format: values.format.trim() || null,
      document_type: values.document_type.trim() || null,
      is_active: Boolean(values.is_active),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.slug.trim()) {
      setError("Введите slug программы.");
      return;
    }

    if (!form.title.trim()) {
      setError("Введите название программы.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const created = await createAdminCourse(buildPayload(form));

      setSuccessMessage(`Программа создана: ${created.title}`);
      resetForm();
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось создать программу."}`.trim());
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(course) {
    setError("");
    setSuccessMessage("");
    setEditingCourseId(course.id);
    setEditForm(buildEditForm(course));
  }

  async function handleEditSubmit(event, courseId) {
    event.preventDefault();

    if (!editForm.slug.trim()) {
      setError("Введите slug программы.");
      return;
    }

    if (!editForm.title.trim()) {
      setError("Введите название программы.");
      return;
    }

    try {
      setActionCourseId(courseId);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminCourse(courseId, buildPayload(editForm));

      setSuccessMessage(`Программа обновлена: ${updated.title}`);
      resetEditState();
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось обновить программу."}`.trim());
    } finally {
      setActionCourseId("");
    }
  }

  async function handleToggleActive(course) {
    try {
      setActionCourseId(course.id);
      setError("");
      setSuccessMessage("");

      const updated = course.is_active
        ? await deactivateAdminCourse(course.id)
        : await activateAdminCourse(course.id);

      setSuccessMessage(
        updated.is_active
          ? `Программа активирована: ${updated.title}`
          : `Программа деактивирована: ${updated.title}`
      );

      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось изменить статус программы."}`.trim());
    } finally {
      setActionCourseId("");
    }
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Удалить программу "${course.title}"? Действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionCourseId(course.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminCourse(course.id);

      if (editingCourseId === course.id) {
        resetEditState();
      }

      setSuccessMessage(`Программа удалена: ${course.title}`);
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось удалить программу."}`.trim());
    } finally {
      setActionCourseId("");
    }
  }

  async function handleApplyFilter(event) {
    event.preventDefault();
    await loadData(buildFilters());
  }

  async function handleResetFilter() {
    setFilterQuery("");
    setFilterActive("");
    await loadData({});
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Администрирование
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Программы обучения
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Управление курсами из backend: создание карточек программ, редактирование
          объема, формата, итогового документа и активности для каталога.
        </p>
      </section>

      {error && (
        <Alert title="Ошибка" tone="red">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert title="Готово" tone="green">
          {successMessage}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)]">
        <SectionCard title="Создать программу" subtitle="POST /api/v1/admin/courses">
          <form onSubmit={handleSubmit} className="space-y-4">
            <CourseFormFields values={form} onChange={updateField} prefix="create-" />

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Сохраняем..." : "Создать программу"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Очистить
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Список программ" subtitle="GET /api/v1/admin/courses">
          <form onSubmit={handleApplyFilter} className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
            <input
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Поиск: slug, название, формат, документ"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <select
              value={filterActive}
              onChange={(event) => setFilterActive(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Все статусы</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>

            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Применить
            </button>

            <button
              type="button"
              onClick={handleResetFilter}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Сбросить
            </button>
          </form>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загружаем программы...
            </div>
          ) : courses.length === 0 ? (
            <EmptyState onReset={handleResetFilter} />
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                const isEditing = editingCourseId === course.id;
                const isActionRunning = actionCourseId === course.id;

                return (
                  <article
                    key={course.id}
                    className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${
                          course.is_active
                            ? "bg-green-50 text-green-700 ring-green-200"
                            : "bg-slate-100 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {course.is_active ? "Активна" : "Неактивна"}
                      </span>

                      {course.format && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                          {course.format}
                        </span>
                      )}

                      {course.document_type && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                          {course.document_type}
                        </span>
                      )}
                    </div>

                    {!isEditing ? (
                      <>
                        <div className="mt-4">
                          <h2 className="text-xl font-bold text-slate-900">
                            {course.title}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">
                            /courses/{course.slug}
                          </div>
                          {course.description && (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {course.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Объем
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {course.hours ? `${course.hours} ч.` : "-"}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Создана
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(course.created_at)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Обновлена
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(course.updated_at)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(course)}
                            disabled={isActionRunning}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Редактировать
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(course)}
                            disabled={isActionRunning}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isActionRunning
                              ? "Выполняем..."
                              : course.is_active
                                ? "Деактивировать"
                                : "Активировать"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(course)}
                            disabled={isActionRunning}
                            className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Удалить
                          </button>
                        </div>
                      </>
                    ) : (
                      <form
                        onSubmit={(event) => handleEditSubmit(event, course.id)}
                        className="mt-5 space-y-4 rounded-[2rem] bg-white p-5 ring-1 ring-blue-100"
                      >
                        <CourseFormFields values={editForm} onChange={updateEditField} prefix="edit-" />

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isActionRunning}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isActionRunning ? "Сохраняем..." : "Сохранить"}
                          </button>

                          <button
                            type="button"
                            onClick={resetEditState}
                            disabled={isActionRunning}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}