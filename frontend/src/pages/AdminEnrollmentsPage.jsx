import { useEffect, useMemo, useState } from "react";
import {
  createAdminEnrollment,
  deleteAdminEnrollment,
  getAdminCourses,
  getAdminEnrollments,
  getAdminOrganizations,
  getAdminUsers,
  getOrgLearningGroups,
  updateAdminEnrollment,
} from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

const ENROLLMENT_STATUSES = [
  { value: "assigned", label: "Назначен" },
  { value: "active", label: "В процессе" },
  { value: "completed", label: "Завершен" },
  { value: "cancelled", label: "Отменен" },
];

const INPUT_CLASS =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const BUTTON_PRIMARY_CLASS =
  "rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_DARK_CLASS =
  "rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_LIGHT_CLASS =
  "rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_RED_CLASS =
  "rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60";

function getStatusLabel(value) {
  return ENROLLMENT_STATUSES.find((item) => item.value === value)?.label || value;
}

function getStatusTone(value) {
  if (value === "completed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (value === "active") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (value === "cancelled") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

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

function buildUserLabel(user) {
  if (!user) {
    return "";
  }

  return `${user.email}${user.full_name ? ` - ${user.full_name}` : ""}`;
}

function buildCourseLabel(course) {
  if (!course) {
    return "";
  }

  return `${course.title}${course.slug ? ` - ${course.slug}` : ""}`;
}

function buildOrganizationsMap(organizations) {
  return organizations.reduce((acc, organization) => {
    acc[organization.id] = organization;
    return acc;
  }, {});
}

function buildGroupsMap(groups) {
  return groups.reduce((acc, group) => {
    acc[group.id] = group;
    return acc;
  }, {});
}

function buildGroupLabel(group, organizationsById = {}) {
  if (!group) {
    return "";
  }

  const organization = organizationsById[group.organization_id];
  const code = group.code ? ` - ${group.code}` : "";
  const organizationName = organization?.name ? ` (${organization.name})` : "";

  return `${group.name}${code}${organizationName}`;
}

function sortByLabel(left, right, getLabel) {
  return getLabel(left).localeCompare(getLabel(right), "ru-RU");
}

function getAvailableGroups(groups, organizationId, selectedGroupId = "") {
  return groups
    .filter((group) => group.is_active || group.id === selectedGroupId)
    .filter((group) => !organizationId || group.organization_id === organizationId)
    .sort((left, right) => left.name.localeCompare(right.name, "ru-RU"));
}

function buildEditForm(enrollment) {
  return {
    organization_id: enrollment.organization_id || "",
    learning_group_id: enrollment.learning_group_id || "",
    status: enrollment.status || "assigned",
    started_at: enrollment.started_at ? enrollment.started_at.slice(0, 16) : "",
    completed_at: enrollment.completed_at ? enrollment.completed_at.slice(0, 16) : "",
  };
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="rounded-[2rem] bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-900">Назначения не найдены</div>
      <p className="mt-2 leading-6">
        Измените фильтры или назначьте пользователя на образовательную программу.
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

export function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [groups, setGroups] = useState([]);

  const [filterQuery, setFilterQuery] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionEnrollmentId, setActionEnrollmentId] = useState("");
  const [editingEnrollmentId, setEditingEnrollmentId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    course_id: "",
    organization_id: "",
    learning_group_id: "",
    status: "assigned",
    started_at: "",
    completed_at: "",
  });

  const [editForm, setEditForm] = useState({
    organization_id: "",
    learning_group_id: "",
    status: "assigned",
    started_at: "",
    completed_at: "",
  });

  const activeCourses = useMemo(
    () => courses.filter((course) => course.is_active),
    [courses]
  );

  const organizationsById = useMemo(
    () => buildOrganizationsMap(organizations),
    [organizations]
  );

  const groupsById = useMemo(
    () => buildGroupsMap(groups),
    [groups]
  );

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => sortByLabel(left, right, buildUserLabel)),
    [users]
  );

  const sortedCourses = useMemo(
    () => [...courses].sort((left, right) => sortByLabel(left, right, buildCourseLabel)),
    [courses]
  );

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [organizations]
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((left, right) =>
      buildGroupLabel(left, organizationsById).localeCompare(buildGroupLabel(right, organizationsById), "ru-RU")
    ),
    [groups, organizationsById]
  );

  const createFormGroups = useMemo(
    () => getAvailableGroups(groups, form.organization_id, form.learning_group_id),
    [groups, form.organization_id, form.learning_group_id]
  );

  const editFormGroups = useMemo(
    () => getAvailableGroups(groups, editForm.organization_id, editForm.learning_group_id),
    [groups, editForm.organization_id, editForm.learning_group_id]
  );

  const visibleEnrollments = useMemo(
    () => enrollments,
    [enrollments]
  );

  function buildFilters(overrides = {}) {
    return {
      q: overrides.q ?? filterQuery,
      user_id: overrides.user_id ?? filterUserId,
      course_id: overrides.course_id ?? filterCourseId,
      status: overrides.status ?? filterStatus,
      learning_group_id: overrides.learning_group_id ?? filterGroupId,
    };
  }

  async function loadData(filters = null) {
    try {
      setLoading(true);
      setError("");

      const [
        enrollmentsResponse,
        usersResponse,
        coursesResponse,
        organizationsResponse,
        groupsResponse,
      ] = await Promise.all([
        getAdminEnrollments(filters ?? buildFilters()),
        getAdminUsers(),
        getAdminCourses({ limit: 300 }),
        getAdminOrganizations(),
        getOrgLearningGroups(),
      ]);

      setEnrollments(Array.isArray(enrollmentsResponse) ? enrollmentsResponse : []);
      setUsers(Array.isArray(usersResponse) ? usersResponse : []);
      setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
      setOrganizations(Array.isArray(organizationsResponse) ? organizationsResponse : []);
      setGroups(Array.isArray(groupsResponse) ? groupsResponse : []);
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось загрузить назначения."}`.trim());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "organization_id") {
        const selectedGroup = groupsById[next.learning_group_id];

        if (!value || (selectedGroup && selectedGroup.organization_id !== value)) {
          next.learning_group_id = "";
        }
      }

      if (field === "learning_group_id") {
        const selectedGroup = groupsById[value];

        if (selectedGroup) {
          next.organization_id = selectedGroup.organization_id;
        }
      }

      return next;
    });
  }

  function updateEditField(field, value) {
    setEditForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "organization_id") {
        const selectedGroup = groupsById[next.learning_group_id];

        if (!value || (selectedGroup && selectedGroup.organization_id !== value)) {
          next.learning_group_id = "";
        }
      }

      if (field === "learning_group_id") {
        const selectedGroup = groupsById[value];

        if (selectedGroup) {
          next.organization_id = selectedGroup.organization_id;
        }
      }

      return next;
    });
  }

  function resetForm() {
    setForm({
      user_id: "",
      course_id: "",
      organization_id: "",
      learning_group_id: "",
      status: "assigned",
      started_at: "",
      completed_at: "",
    });
  }

  function resetEditState() {
    setEditingEnrollmentId("");
    setEditForm({
      organization_id: "",
      learning_group_id: "",
      status: "assigned",
      started_at: "",
      completed_at: "",
    });
  }

  function buildCreatePayload(values) {
    return {
      user_id: values.user_id,
      course_id: values.course_id,
      organization_id: values.organization_id || null,
      learning_group_id: values.learning_group_id || null,
      status: values.status,
      started_at: normalizeDateTime(values.started_at),
      completed_at: normalizeDateTime(values.completed_at),
    };
  }

  function buildUpdatePayload(values) {
    return {
      organization_id: values.organization_id || null,
      learning_group_id: values.learning_group_id || null,
      status: values.status,
      started_at: normalizeDateTime(values.started_at),
      completed_at: normalizeDateTime(values.completed_at),
    };
  }

  function getEnrollmentGroupName(enrollment) {
    if (enrollment.learning_group_name) {
      return enrollment.learning_group_name;
    }

    return groupsById[enrollment.learning_group_id]?.name || "-";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.user_id) {
      setError("Выберите пользователя.");
      return;
    }

    if (!form.course_id) {
      setError("Выберите программу.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const created = await createAdminEnrollment(buildCreatePayload(form));

      setSuccessMessage(`Назначение создано: ${created.user_email} → ${created.course_title}`);
      resetForm();
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось создать назначение."}`.trim());
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(enrollment) {
    setError("");
    setSuccessMessage("");
    setEditingEnrollmentId(enrollment.id);
    setEditForm(buildEditForm(enrollment));
  }

  async function handleEditSubmit(event, enrollmentId) {
    event.preventDefault();

    try {
      setActionEnrollmentId(enrollmentId);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminEnrollment(enrollmentId, buildUpdatePayload(editForm));

      setSuccessMessage(`Назначение обновлено: ${updated.user_email} → ${updated.course_title}`);
      resetEditState();
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось обновить назначение."}`.trim());
    } finally {
      setActionEnrollmentId("");
    }
  }

  async function handleDelete(enrollment) {
    const confirmed = window.confirm(
      `Удалить назначение "${enrollment.user_email} → ${enrollment.course_title}"? Действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionEnrollmentId(enrollment.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminEnrollment(enrollment.id);

      if (editingEnrollmentId === enrollment.id) {
        resetEditState();
      }

      setSuccessMessage(`Назначение удалено: ${enrollment.user_email} → ${enrollment.course_title}`);
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось удалить назначение."}`.trim());
    } finally {
      setActionEnrollmentId("");
    }
  }

  async function handleApplyFilter(event) {
    event.preventDefault();
    await loadData(buildFilters());
  }

  async function handleResetFilter() {
    setFilterQuery("");
    setFilterUserId("");
    setFilterCourseId("");
    setFilterStatus("");
    setFilterGroupId("");
    await loadData({});
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Администрирование
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Назначения на программы
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Управление связкой пользователь → программа: назначение обучения,
          изменение статуса, привязка к организации и учебной группе.
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
        <SectionCard title="Создать назначение" subtitle="POST /api/v1/admin/enrollments">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <Field label="Пользователь">
                <select
                  value={form.user_id}
                  onChange={(event) => updateField("user_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Выберите пользователя</option>
                  {sortedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {buildUserLabel(user)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Программа">
                <select
                  value={form.course_id}
                  onChange={(event) => updateField("course_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Выберите программу</option>
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {buildCourseLabel(course)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Организация">
                <select
                  value={form.organization_id}
                  onChange={(event) => updateField("organization_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Без организации</option>
                  {sortedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Учебная группа">
                <select
                  value={form.learning_group_id}
                  onChange={(event) => updateField("learning_group_id", event.target.value)}
                  className={INPUT_CLASS}
                  disabled={groups.length === 0}
                >
                  <option value="">
                    {groups.length === 0 ? "Групп пока нет" : "Без группы"}
                  </option>
                  {createFormGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {buildGroupLabel(group, organizationsById)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Статус">
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className={INPUT_CLASS}
                >
                  {ENROLLMENT_STATUSES.map((statusItem) => (
                    <option key={statusItem.value} value={statusItem.value}>
                      {statusItem.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Начато">
                  <input
                    type="datetime-local"
                    value={form.started_at}
                    onChange={(event) => updateField("started_at", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="Завершено">
                  <input
                    type="datetime-local"
                    value={form.completed_at}
                    onChange={(event) => updateField("completed_at", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={saving} className={BUTTON_PRIMARY_CLASS}>
                {saving ? "Сохраняем..." : "Создать назначение"}
              </button>

              <button type="button" onClick={resetForm} disabled={saving} className={BUTTON_LIGHT_CLASS}>
                Очистить
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Список назначений" subtitle="GET /api/v1/admin/enrollments">
          <form onSubmit={handleApplyFilter} className="mb-5 grid gap-3 xl:grid-cols-[1.15fr_1fr_1fr_1fr_1fr_auto_auto]">
            <input
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Поиск: e-mail, ФИО, курс, группа"
              className={INPUT_CLASS}
            />

            <select
              value={filterUserId}
              onChange={(event) => setFilterUserId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все пользователи</option>
              {sortedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {buildUserLabel(user)}
                </option>
              ))}
            </select>

            <select
              value={filterCourseId}
              onChange={(event) => setFilterCourseId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все программы</option>
              {sortedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {buildCourseLabel(course)}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все статусы</option>
              {ENROLLMENT_STATUSES.map((statusItem) => (
                <option key={statusItem.value} value={statusItem.value}>
                  {statusItem.label}
                </option>
              ))}
            </select>

            <select
              value={filterGroupId}
              onChange={(event) => setFilterGroupId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все группы</option>
              {sortedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {buildGroupLabel(group, organizationsById)}
                </option>
              ))}
            </select>

            <button type="submit" className={BUTTON_DARK_CLASS}>
              Применить
            </button>

            <button type="button" onClick={handleResetFilter} className={BUTTON_LIGHT_CLASS}>
              Сбросить
            </button>
          </form>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загружаем назначения...
            </div>
          ) : visibleEnrollments.length === 0 ? (
            <EmptyState onReset={handleResetFilter} />
          ) : (
            <div className="space-y-4">
              {visibleEnrollments.map((enrollment) => {
                const isEditing = editingEnrollmentId === enrollment.id;
                const isActionRunning = actionEnrollmentId === enrollment.id;

                return (
                  <article
                    key={enrollment.id}
                    className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusTone(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {enrollment.course_slug}
                      </span>
                    </div>

                    {!isEditing ? (
                      <>
                        <div className="mt-4">
                          <h2 className="text-xl font-bold text-slate-900">
                            {enrollment.course_title}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">
                            {enrollment.user_email}
                            {enrollment.user_full_name ? ` - ${enrollment.user_full_name}` : ""}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Организация
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {enrollment.organization_name || "-"}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Группа
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {getEnrollmentGroupName(enrollment)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Начато
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(enrollment.started_at)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Завершено
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(enrollment.completed_at)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(enrollment)}
                            disabled={isActionRunning}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Редактировать
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(enrollment)}
                            disabled={isActionRunning}
                            className={BUTTON_RED_CLASS}
                          >
                            {isActionRunning ? "Удаляем..." : "Удалить"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <form
                        onSubmit={(event) => handleEditSubmit(event, enrollment.id)}
                        className="mt-5 space-y-4 rounded-[2rem] bg-white p-5 ring-1 ring-blue-100"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Организация">
                            <select
                              value={editForm.organization_id}
                              onChange={(event) => updateEditField("organization_id", event.target.value)}
                              className={INPUT_CLASS}
                            >
                              <option value="">Без организации</option>
                              {sortedOrganizations.map((organization) => (
                                <option key={organization.id} value={organization.id}>
                                  {organization.name}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Учебная группа">
                            <select
                              value={editForm.learning_group_id}
                              onChange={(event) => updateEditField("learning_group_id", event.target.value)}
                              className={INPUT_CLASS}
                              disabled={groups.length === 0}
                            >
                              <option value="">
                                {groups.length === 0 ? "Групп пока нет" : "Без группы"}
                              </option>
                              {editFormGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {buildGroupLabel(group, organizationsById)}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Статус">
                            <select
                              value={editForm.status}
                              onChange={(event) => updateEditField("status", event.target.value)}
                              className={INPUT_CLASS}
                            >
                              {ENROLLMENT_STATUSES.map((statusItem) => (
                                <option key={statusItem.value} value={statusItem.value}>
                                  {statusItem.label}
                                </option>
                              ))}
                            </select>
                          </Field>

                          <Field label="Начато">
                            <input
                              type="datetime-local"
                              value={editForm.started_at}
                              onChange={(event) => updateEditField("started_at", event.target.value)}
                              className={INPUT_CLASS}
                            />
                          </Field>

                          <Field label="Завершено">
                            <input
                              type="datetime-local"
                              value={editForm.completed_at}
                              onChange={(event) => updateEditField("completed_at", event.target.value)}
                              className={INPUT_CLASS}
                            />
                          </Field>
                        </div>

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