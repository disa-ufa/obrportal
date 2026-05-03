import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  activateAdminCourse,
  createAdminCourse,
  deactivateAdminCourse,
  deleteAdminCourse,
  getAdminCourses,
  updateAdminCourse,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminMetricCard } from "../components/admin/AdminWorkCenter";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildCoursesPath, buildEnrollmentsPath } from "../utils/adminLinks";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";

const COURSE_ACTIVE_FILTERS = [
  { value: "", label: "Все" },
  { value: "true", label: "Активные" },
  { value: "false", label: "Неактивные" },
];

const EMPTY_COURSE_FORM = {
  slug: "",
  title: "",
  description: "",
  hours: "",
  format: "",
  document_type: "Сертификат",
  is_active: true,
};

const EMPTY_EDIT_FORM = {
  slug: "",
  title: "",
  description: "",
  hours: "",
  format: "",
  document_type: "",
  is_active: true,
};

const CARD_LINK_CLASS =
  "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

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

function getCourseFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    is_active: params.get("is_active") || "",
  };
}

function calculateCourseCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    active: 0,
    inactive: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((course) => {
    if (course.is_active) {
      counts.active += 1;
    } else {
      counts.inactive += 1;
    }
  });

  return counts;
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

function getCourseStatusTone(course) {
  return course.is_active ? "green" : "gray";
}

function getCourseStatusLabel(course) {
  return course.is_active ? "active" : "inactive";
}

function QuickActiveFilters({ activeValue, counts, disabled, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COURSE_ACTIVE_FILTERS.map((item) => {
        const isActive = activeValue === item.value;
        const count =
          item.value === "true"
            ? counts.active || 0
            : item.value === "false"
              ? counts.inactive || 0
              : counts.all || 0;

        return (
          <button
            key={item.value || "all"}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
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

function CourseCard({
  course,
  isEditing,
  isActionRunning,
  editForm,
  onEditFieldChange,
  onStartEdit,
  onEditSubmit,
  onCancelEdit,
  onToggleActive,
  onDelete,
}) {
  return (
    <article className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={getCourseStatusTone(course)}>
          {getCourseStatusLabel(course)}
        </StatusBadge>

        {course.format && (
          <StatusBadge tone="blue">
            {course.format}
          </StatusBadge>
        )}

        {course.document_type && (
          <StatusBadge tone="violet">
            {course.document_type}
          </StatusBadge>
        )}
      </div>

      {!isEditing ? (
        <>
          <div className="mt-4">
            <h2 className="text-xl font-bold text-slate-900">{course.title}</h2>
            <div className="mt-1 break-all text-sm text-slate-500">
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
            {course.slug && (
              <Link
                to={`/courses/${encodeURIComponent(course.slug)}`}
                className={CARD_LINK_CLASS}
              >
                Публичная карточка
              </Link>
            )}

            <Link
              to={buildEnrollmentsPath({ course_id: course.id })}
              className={CARD_LINK_CLASS}
            >
              Назначения курса
            </Link>

            <ActionButton
              type="button"
              tone="blue"
              onClick={() => onStartEdit(course)}
              disabled={isActionRunning}
            >
              Редактировать
            </ActionButton>

            <ActionButton
              type="button"
              tone="light"
              onClick={() => onToggleActive(course)}
              disabled={isActionRunning}
            >
              {isActionRunning
                ? "Выполняем..."
                : course.is_active
                  ? "Деактивировать"
                  : "Активировать"}
            </ActionButton>

            <ActionButton
              type="button"
              tone="red"
              onClick={() => onDelete(course)}
              disabled={isActionRunning}
            >
              Удалить
            </ActionButton>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => onEditSubmit(event, course.id)}
          className="mt-5 space-y-4 rounded-3xl bg-white p-5 ring-1 ring-blue-100"
        >
          <CourseFormFields
            values={editForm}
            onChange={onEditFieldChange}
            prefix="edit-"
          />

          <div className="flex flex-wrap gap-3">
            <ActionButton type="submit" tone="blue" disabled={isActionRunning}>
              {isActionRunning ? "Сохраняем..." : "Сохранить"}
            </ActionButton>

            <ActionButton
              type="button"
              tone="light"
              onClick={onCancelEdit}
              disabled={isActionRunning}
            >
              Отмена
            </ActionButton>
          </div>
        </form>
      )}
    </article>
  );
}

export function AdminCoursesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getCourseFiltersFromSearch(location.search);

  const [courses, setCourses] = useState([]);
  const [courseCounts, setCourseCounts] = useState({
    all: 0,
    active: 0,
    inactive: 0,
  });
  const [filterQuery, setFilterQuery] = useState(initialFilters.q);
  const [filterActive, setFilterActive] = useState(initialFilters.is_active);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionCourseId, setActionCourseId] = useState("");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState(EMPTY_COURSE_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const hasActiveFilters = Boolean(filterQuery || filterActive);
  const activeCount = courseCounts.active || 0;
  const inactiveCount = courseCounts.inactive || 0;

  function buildFilters(overrides = {}) {
    return {
      q: overrides.q ?? filterQuery,
      is_active: overrides.is_active ?? filterActive,
    };
  }

  async function navigateToCourseFilters(filters, options = {}) {
    const nextPath = buildCoursesPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      await loadData(filters);
      return;
    }

    navigate(nextPath, options);
  }

  async function loadData(filters = null) {
    try {
      setLoading(true);
      setError("");

      const activeFilters = { limit: 300, ...(filters ?? buildFilters()) };
      const countFilters = { ...activeFilters, is_active: "" };

      const [response, countResponse] = await Promise.all([
        getAdminCourses(activeFilters),
        getAdminCourses(countFilters),
      ]);

      setCourses(Array.isArray(response) ? response : []);
      setCourseCounts(calculateCourseCounts(Array.isArray(countResponse) ? countResponse : []));
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось загрузить программы."}`.trim());
      setCourseCounts({ all: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nextFilters = getCourseFiltersFromSearch(location.search);

    setFilterQuery(nextFilters.q);
    setFilterActive(nextFilters.is_active);

    loadData(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
    setForm(EMPTY_COURSE_FORM);
  }

  function resetEditState() {
    setEditingCourseId("");
    setEditForm(EMPTY_EDIT_FORM);
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
      setShowCreateForm(false);
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
    await navigateToCourseFilters(buildFilters());
  }

  async function handleQuickActiveFilter(nextActive) {
    setFilterActive(nextActive);
    await navigateToCourseFilters(buildFilters({ is_active: nextActive }));
  }

  async function handleResetFilter() {
    setFilterQuery("");
    setFilterActive("");
    await navigateToCourseFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Программы обучения"
        subtitle="Управление курсами, активностью, публичными карточками и переходом к назначениям."
        action={
          <AdminPageActions
            loading={loading}
            onRefresh={() => loadData(buildFilters())}
            primaryLabel={showCreateForm ? "Скрыть форму" : "Добавить программу"}
            primaryTone={showCreateForm ? "light" : "blue"}
            onPrimaryClick={() => setShowCreateForm((current) => !current)}
          />
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminMetricCard
              title="Всего программ"
              value={courseCounts.all || 0}
              hint="По текущему поиску без фильтра активности"
              to={buildCoursesPath()}
              tone="blue"
            />
            <AdminMetricCard
              title="Активные"
              value={activeCount}
              hint="Доступны в каталоге и назначениях"
              to={buildCoursesPath({ is_active: "true" })}
              tone="green"
            />
            <AdminMetricCard
              title="Неактивные"
              value={inactiveCount}
              hint="Скрыты или временно отключены"
              to={buildCoursesPath({ is_active: "false" })}
              tone={inactiveCount ? "amber" : "gray"}
            />
          </div>

          {showCreateForm && (
            <AdminCreatePanel
              title="Новая программа"
              subtitle="Создаёт карточку образовательной программы в Admin API."
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <CourseFormFields values={form} onChange={updateField} prefix="create-" />

                <div className="flex flex-wrap gap-3 pt-2">
                  <ActionButton type="submit" tone="blue" disabled={saving}>
                    {saving ? "Сохраняем..." : "Создать программу"}
                  </ActionButton>

                  <ActionButton
                    type="button"
                    tone="light"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Очистить
                  </ActionButton>
                </div>
              </form>
            </AdminCreatePanel>
          )}

          <AdminFilterPanel
            columnsClassName="lg:grid-cols-[1fr_220px_auto]"
            onReset={handleResetFilter}
            resetDisabled={!hasActiveFilters}
            summary={getShownSummary(courses.length, courseCounts.all || courses.length)}
          >
            <AdminFilterField label="Поиск" className="block space-y-2">
              <input
                type="search"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Slug, название, формат, документ"
                className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
              />
            </AdminFilterField>

            <AdminFilterField label="Статус" className="block space-y-2">
              <select
                value={filterActive}
                onChange={(event) => setFilterActive(event.target.value)}
                className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
              >
                <option value="">Все статусы</option>
                <option value="true">Активные</option>
                <option value="false">Неактивные</option>
              </select>
            </AdminFilterField>

            <ActionButton type="button" tone="blue" onClick={handleApplyFilter} disabled={loading}>
              {loading ? "Загружаем..." : "Применить"}
            </ActionButton>
          </AdminFilterPanel>

          <QuickActiveFilters
            activeValue={filterActive}
            counts={courseCounts}
            disabled={loading}
            onChange={handleQuickActiveFilter}
          />

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
        </div>
      </SectionCard>

      <SectionCard
        title="Список программ"
        subtitle="Карточки из GET /api/v1/admin/courses с быстрыми действиями."
      >
        {loading ? (
          <LoadingBlock text="Загружаем программы..." />
        ) : courses.length === 0 ? (
          <AdminEmptyState
            title="Программы не найдены"
            description={getFilteredEmptyText(
              hasActiveFilters,
              "Под текущие фильтры программы не подходят.",
              "Создайте первую образовательную программу."
            )}
            onReset={handleResetFilter}
            showReset={hasActiveFilters}
          />
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isEditing={editingCourseId === course.id}
                isActionRunning={actionCourseId === course.id}
                editForm={editForm}
                onEditFieldChange={updateEditField}
                onStartEdit={handleStartEdit}
                onEditSubmit={handleEditSubmit}
                onCancelEdit={resetEditState}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
