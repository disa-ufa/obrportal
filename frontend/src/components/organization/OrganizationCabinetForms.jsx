import { useEffect, useState } from "react";
import { formatApiError } from "../../utils/apiErrors";
import {
  buildLearningGroupFormData,
  buildOrganizationProfileFormData,
  formatDate,
  formatEnrollmentStatus,
  formatOptional,
  formatUserOrganizations,
  formatUserRoles,
  getOrganizationLabel,
  shortId,
} from "../../utils/organizationCabinet";


export function OrganizationProfileCard({ organization, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() => buildOrganizationProfileFormData(organization));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(buildOrganizationProfileFormData(organization));
    setError("");
  }, [organization]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const updated = await onSave(organization.id, formData);
      setFormData(buildOrganizationProfileFormData(updated));
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err, "Не удалось сохранить реквизиты организации."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Организация
          </div>
          <div className="mt-1 text-lg font-bold text-slate-950">
            {organization.label}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Доступ по роли
          </span>
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            {editing ? "Отменить" : "Редактировать"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">КПП</span>
              <input
                name="kpp"
                value={formData.kpp}
                onChange={handleChange}
                maxLength={9}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="КПП"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">ОГРН</span>
              <input
                name="ogrn"
                value={formData.ogrn}
                onChange={handleChange}
                maxLength={15}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="ОГРН"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Юридический адрес</span>
            <textarea
              name="legal_address"
              value={formData.legal_address}
              onChange={handleChange}
              maxLength={1024}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Юридический адрес"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Фактический адрес</span>
            <textarea
              name="actual_address"
              value={formData.actual_address}
              onChange={handleChange}
              maxLength={1024}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Фактический адрес"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить реквизиты"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(buildOrganizationProfileFormData(organization));
                setEditing(false);
                setError("");
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">ИНН</div>
          <div className="mt-1 font-semibold text-slate-950">{formatOptional(organization.inn)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">КПП</div>
          <div className="mt-1 font-semibold text-slate-950">{formatOptional(organization.kpp)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">ОГРН</div>
          <div className="mt-1 font-semibold text-slate-950">{formatOptional(organization.ogrn)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">Юридический адрес</div>
          <div className="mt-1 leading-6 text-slate-900">
            {formatOptional(organization.legal_address)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">Фактический адрес</div>
          <div className="mt-1 leading-6 text-slate-900">
            {formatOptional(organization.actual_address)}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}


export function LearningGroupEditForm({ group, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() => buildLearningGroupFormData(group));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEditing(false);
    setError("");
    setMessage("");
    setFormData(buildLearningGroupFormData(group));
  }, [group]);

  function handleChange(event) {
    const { checked, name, type, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Укажите название учебной группы.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await onSave(group.id, formData);

      setFormData(buildLearningGroupFormData(updated));
      setEditing(false);
      setMessage("Учебная группа обновлена.");
    } catch (err) {
      setError(formatApiError(err, "Не удалось обновить учебную группу."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">Настройки группы</div>
          <div className="mt-1 text-xs text-slate-500">
            Название, код, описание и активность группы.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((current) => !current);
            setError("");
            setMessage("");
            setFormData(buildLearningGroupFormData(group));
          }}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          {editing ? "Отменить" : "Редактировать группу"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {message && !editing && (
        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
          {message}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Название группы</span>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              maxLength={255}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Название группы"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Код группы</span>
            <input
              name="code"
              value={formData.code}
              onChange={handleChange}
              maxLength={64}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Код группы"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Описание</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={1024}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Описание группы"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <input
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-semibold text-slate-700">Группа активна</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить группу"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
                setMessage("");
                setFormData(buildLearningGroupFormData(group));
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


export function EmptyState({ title, text }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div className="text-lg font-semibold text-slate-950">{title}</div>
      <div className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}


export function OrganizationCabinetHero({ children }) {
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm md:p-8">
      {children}
    </section>
  );
}





export function OrganizationSelectedGroupPanelHeader({
  selectedGroup,
  organizations,
  deletingGroupId,
  groupDeleteError,
  groupDeleteMessage,
  onDeleteGroup,
}) {
  return (
    <>
            <h2 className="text-xl font-bold text-slate-950">Участники группы</h2>

            {selectedGroup ? (
              <div className="mt-2 text-sm text-slate-500">
                {selectedGroup.name}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">Группа не выбрана.</div>
            )}

            {selectedGroup && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                <div>
                  <span className="text-slate-500">Организация:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {getOrganizationLabel(selectedGroup.organization_id, organizations)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-500">Создана:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDate(selectedGroup.created_at)}
                  </span>
                </div>
              </div>
            )}

            {selectedGroup && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-red-950">Опасная зона</div>
                    <div className="mt-1 text-xs leading-5 text-red-700">
                      Удаление группы доступно только если это разрешено текущими связями и ограничениями backend.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteGroup(selectedGroup)}
                    disabled={deletingGroupId === selectedGroup.id}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:text-slate-400 disabled:ring-slate-200"
                  >
                    {deletingGroupId === selectedGroup.id ? "Удаляем..." : "Удалить группу"}
                  </button>
                </div>

                {groupDeleteError && (
                  <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-red-800 ring-1 ring-red-200">
                    {groupDeleteError}
                  </div>
                )}

                {groupDeleteMessage && (
                  <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-green-800 ring-1 ring-green-200">
                    {groupDeleteMessage}
                  </div>
                )}
              </div>
            )}

    </>
  );
}



export function OrganizationSelectedGroupAside({
  selectedGroup,
  organizations,
  deletingGroupId,
  groupDeleteError,
  groupDeleteMessage,
  handleDeleteGroup,
  handleSaveGroup,
  handleCreateGroupEnrollments,
  courseSearchQuery,
  handleCourseSearchQueryChange,
  handleSearchCourseCandidates,
  courseSearchLoading,
  courseSearchResults,
  handleSelectCourse,
  groupEnrollmentForm,
  handleGroupEnrollmentFormChange,
  assigningGroupCourse,
  groupEnrollmentError,
  groupEnrollmentResult,
  groupEnrollmentsLoading,
  groupEnrollmentsError,
  groupEnrollmentDeleteMessage,
  groupEnrollmentSearchQuery,
  setGroupEnrollmentSearchQuery,
  groupEnrollmentStatusFilter,
  setGroupEnrollmentStatusFilter,
  groupEnrollmentFiltersActive,
  setGroupEnrollmentsRefreshKey,
  groupEnrollments,
  visibleGroupEnrollments,
  deletingGroupEnrollmentId,
  handleDeleteGroupEnrollment,
  membersLoading,
  membersError,
  memberSearchQuery,
  setMemberSearchQuery,
  memberSearchLoading,
  handleSearchMemberCandidates,
  memberSearchResults,
  memberUserId,
  setMemberUserId,
  addingMember,
  handleAddMember,
  memberActionError,
  memberActionMessage,
  members,
  deletingMemberId,
  handleDeleteMember,
}) {
  return (
    <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <OrganizationSelectedGroupPanelHeader
              selectedGroup={selectedGroup}
              organizations={organizations}
              deletingGroupId={deletingGroupId}
              groupDeleteError={groupDeleteError}
              groupDeleteMessage={groupDeleteMessage}
              onDeleteGroup={handleDeleteGroup}
            />
            {selectedGroup && (
              <LearningGroupEditForm
                group={selectedGroup}
                onSave={handleSaveGroup}
              />
            )}

            {selectedGroup && (
              <form
                onSubmit={handleCreateGroupEnrollments}
                className="mt-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
              >
                <div className="text-sm font-bold text-slate-950">Назначить курс группе</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  Курс будет назначен всем активным участникам выбранной группы. Уже существующие назначения будут пропущены.
                </div>

                <div className="mt-3 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={courseSearchQuery}
                      onChange={handleCourseSearchQueryChange}
                      className="min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="Название, код или описание курса"
                    />
                    <button
                      type="button"
                      onClick={handleSearchCourseCandidates}
                      disabled={courseSearchLoading}
                      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
                    >
                      {courseSearchLoading ? "Ищем..." : "Найти курс"}
                    </button>
                  </div>

                  {courseSearchResults.length > 0 && (
                    <div className="grid gap-2">
                      {courseSearchResults.map((course) => {
                        const active = groupEnrollmentForm.course_id === course.id;

                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => handleSelectCourse(course)}
                            className={`rounded-2xl px-4 py-3 text-left text-sm ring-1 transition ${
                              active
                                ? "bg-blue-100 text-blue-950 ring-blue-300"
                                : "bg-white text-slate-700 ring-blue-100 hover:bg-blue-50"
                            }`}
                          >
                            <span className="block font-semibold">
                              {course.title || course.slug || course.id}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {course.slug || shortId(course.id)}
                              {course.hours ? ` · ${course.hours} ч.` : ""}
                              {course.format ? ` · ${course.format}` : ""}
                              {course.document_type ? ` · ${course.document_type}` : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {groupEnrollmentForm.course_id && (
                    <div className="rounded-2xl bg-white px-4 py-3 text-xs text-blue-900 ring-1 ring-blue-100">
                      Выбранный курс:{" "}
                      <span className="font-semibold">
                        {courseSearchQuery || shortId(groupEnrollmentForm.course_id)}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                      name="status"
                      value={groupEnrollmentForm.status}
                      onChange={handleGroupEnrollmentFormChange}
                      className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="assigned">Назначен</option>
                      <option value="in_progress">В процессе</option>
                      <option value="completed">Завершён</option>
                    </select>

                    <button
                      type="submit"
                      disabled={assigningGroupCourse || !groupEnrollmentForm.course_id}
                      className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      {assigningGroupCourse ? "Назначаем..." : "Назначить"}
                    </button>
                  </div>
                </div>

                {groupEnrollmentError && (
                  <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                    {groupEnrollmentError}
                  </div>
                )}

                {groupEnrollmentResult && (
                  <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-blue-100">
                    <div className="font-semibold text-slate-950">Результат назначения</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-slate-500">Создано:</span>{" "}
                        <span className="font-semibold text-slate-950">
                          {groupEnrollmentResult.created_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Пропущено:</span>{" "}
                        <span className="font-semibold text-slate-950">
                          {groupEnrollmentResult.skipped_count}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(groupEnrollmentResult.skipped) &&
                      groupEnrollmentResult.skipped.length > 0 && (
                        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Пропущенные участники
                          </div>
                          <div className="mt-2 grid gap-2">
                            {groupEnrollmentResult.skipped.slice(0, 5).map((item) => (
                              <div key={item.user_id} className="text-xs text-slate-600">
                                {item.user_full_name || item.user_email || item.user_id} — уже назначен
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </form>
            )}

            {selectedGroup && (
              <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-950">Назначения группы</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Курсы, уже назначенные участникам выбранной учебной группы.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupEnrollmentsRefreshKey((current) => current + 1)}
                      disabled={groupEnrollmentsLoading}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {groupEnrollmentsLoading ? "Обновляем..." : "Обновить"}
                    </button>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      {visibleGroupEnrollments.length} / {groupEnrollments.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                  <input
                    value={groupEnrollmentSearchQuery}
                    onChange={(event) => setGroupEnrollmentSearchQuery(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    placeholder="Поиск по курсу, участнику или email"
                  />
                  <select
                    value={groupEnrollmentStatusFilter}
                    onChange={(event) => setGroupEnrollmentStatusFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Все статусы</option>
                    <option value="assigned">Назначен</option>
                    <option value="in_progress">В процессе</option>
                    <option value="completed">Завершён</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupEnrollmentSearchQuery("");
                      setGroupEnrollmentStatusFilter("");
                    }}
                    disabled={!groupEnrollmentFiltersActive}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Сбросить
                  </button>
                </div>

                {groupEnrollmentDeleteMessage && (
                  <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
                    {groupEnrollmentDeleteMessage}
                  </div>
                )}

                {groupEnrollmentsError && (
                  <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                    {groupEnrollmentsError}
                  </div>
                )}

                {groupEnrollmentsLoading ? (
                  <div className="mt-3 text-sm text-slate-500">Загружаем назначения...</div>
                ) : groupEnrollments.length === 0 ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                    У выбранной группы пока нет назначенных курсов.
                  </div>
                ) : visibleGroupEnrollments.length === 0 ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                    По заданным фильтрам назначений не найдено.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {visibleGroupEnrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200"
                      >
                        <div className="font-semibold text-slate-950">
                          {enrollment.course_title || enrollment.course_slug || enrollment.course_id}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Участник: {enrollment.user_full_name || enrollment.user_email || enrollment.user_id}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Статус: {formatEnrollmentStatus(enrollment.status)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Создано: {formatDate(enrollment.created_at)}
                        </div>
                        {enrollment.status === "assigned" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroupEnrollment(enrollment)}
                            disabled={deletingGroupEnrollmentId === enrollment.id}
                            className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {deletingGroupEnrollmentId === enrollment.id ? "Снимаем..." : "Снять назначение"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedGroup && (
              <form
                onSubmit={handleAddMember}
                className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
              >
                <div className="text-sm font-bold text-slate-950">Добавить участника</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Найдите пользователя по email или ФИО. В результатах показываются только пользователи из доступной организации.
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={memberSearchQuery}
                    onChange={(event) => setMemberSearchQuery(event.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    placeholder="Email или ФИО пользователя"
                  />
                  <button
                    type="button"
                    onClick={handleSearchMemberCandidates}
                    disabled={memberSearchLoading}
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
                  >
                    {memberSearchLoading ? "Ищем..." : "Найти"}
                  </button>
                </div>

                {memberSearchResults.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {memberSearchResults.map((candidate) => {
                      const active = memberUserId === candidate.id;

                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => setMemberUserId(candidate.id)}
                          className={`rounded-2xl px-4 py-3 text-left text-sm ring-1 transition ${
                            active
                              ? "bg-blue-50 text-blue-900 ring-blue-200"
                              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block font-semibold">
                            {candidate.full_name || candidate.email}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {candidate.email}
                          </span>
                          {formatUserOrganizations(candidate.organizations, candidate.organization_ids) && (
                            <span className="mt-2 block text-xs text-slate-500">
                              Организация: {formatUserOrganizations(candidate.organizations, candidate.organization_ids)}
                            </span>
                          )}
                          {formatUserRoles(candidate.roles) && (
                            <span className="mt-1 block text-xs text-slate-500">
                              Роли: {formatUserRoles(candidate.roles)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={addingMember || !memberUserId}
                    className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    {addingMember ? "Добавляем..." : "Добавить в группу"}
                  </button>
                </div>

                {memberActionError && (
                  <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
                    {memberActionError}
                  </div>
                )}

                {memberActionMessage && (
                  <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-200">
                    {memberActionMessage}
                  </div>
                )}
              </form>
            )}

            {membersError && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                {membersError}
              </div>
            )}

            {membersLoading ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Загружаем участников...
              </div>
            ) : members.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                В выбранной группе пока нет участников.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="font-semibold text-slate-950">
                      {member.user_full_name || member.user_email || member.user_id}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {member.user_email || "Email не указан"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Добавлен: {formatDate(member.created_at)}
                    </div>
                    {formatUserOrganizations(member.user_organizations) && (
                      <div className="mt-2 text-xs text-slate-500">
                        Организация: {formatUserOrganizations(member.user_organizations)}
                      </div>
                    )}
                    {formatUserRoles(member.user_roles) && (
                      <div className="mt-1 text-xs text-slate-500">
                        Роли: {formatUserRoles(member.user_roles)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
    </aside>
  );
}


export function OrganizationUsersSection({
  organizations,
  organizationUsers,
  organizationUsersQuery,
  organizationUsersLoading,
  organizationUsersError,
  organizationUsersMessage,
  addingOrganizationUserId,
  selectedGroupId,
  onSearchOrganizationUsers,
  onAddOrganizationUserToSelectedGroup,
  setOrganizationUsersQuery,
  setOrganizationUsers,
  setOrganizationUsersError,
}) {
  return (
    <>
      {organizations.length > 0 && (
        <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Обучающиеся организации</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Список пользователей, привязанных к доступным организациям. Здесь удобно проверить роли,
                активность аккаунта и принадлежность перед добавлением в учебные группы.
              </p>
            </div>
            <button
              type="button"
              onClick={onSearchOrganizationUsers}
              disabled={organizationUsersLoading}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
            >
              {organizationUsersLoading ? "Загружаем..." : "Загрузить список"}
            </button>
          </div>

          <form onSubmit={onSearchOrganizationUsers} className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              value={organizationUsersQuery}
              onChange={(event) => setOrganizationUsersQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Поиск по email или ФИО"
            />
            <button
              type="submit"
              disabled={organizationUsersLoading}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              Найти
            </button>
            <button
              type="button"
              onClick={() => {
                setOrganizationUsersQuery("");
                setOrganizationUsers([]);
                setOrganizationUsersError("");
              }}
              disabled={organizationUsersLoading && organizationUsers.length === 0}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              Сбросить
            </button>
          </form>

          {organizationUsersError && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              {organizationUsersError}
            </div>
          )}

          {organizationUsersMessage && (
            <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
              {organizationUsersMessage}
            </div>
          )}

          {organizationUsers.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
              Пользователи пока не загружены. Нажмите «Загрузить список» или выполните поиск.
              Если выбрана учебная группа, уже добавленные в неё пользователи будут скрыты.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {organizationUsers.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {item.full_name || item.email}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{item.email}</div>
                      {formatUserOrganizations(item.organizations, item.organization_ids) && (
                        <div className="mt-2 text-xs text-slate-500">
                          Организация: {formatUserOrganizations(item.organizations, item.organization_ids)}
                        </div>
                      )}
                      {formatUserRoles(item.roles) && (
                        <div className="mt-1 text-xs text-slate-500">
                          Роли: {formatUserRoles(item.roles)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.is_active
                            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        {item.is_active ? "Активен" : "Неактивен"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddOrganizationUserToSelectedGroup(item)}
                        disabled={!selectedGroupId || addingOrganizationUserId === item.id}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 disabled:text-slate-400 disabled:ring-slate-200"
                      >
                        {addingOrganizationUserId === item.id ? "Добавляем..." : "Добавить в группу"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}


export function OrganizationGroupListSection({
  groups,
  selectedGroupId,
  onSelectGroup,
}) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Учебные группы</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Выберите группу, чтобы посмотреть участников, настройки и назначения курсов.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {groups.length}
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {groups.map((group) => {
          const selected = group.id === selectedGroupId;
          const statusText = group.is_active ? "Активна" : "Неактивна";

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className={`rounded-2xl p-4 text-left ring-1 transition ${
                selected
                  ? "bg-blue-50 ring-blue-200"
                  : "bg-slate-50 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">{group.name}</div>
                  {group.code && (
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.code}
                    </div>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    group.is_active
                      ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {statusText}
                </span>
              </div>

              {group.description && (
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {group.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}


export function OrganizationGroupCreateSection({
  organizations,
  groupForm,
  creatingGroup,
  groupActionError,
  groupActionMessage,
  onCreateGroup,
  onGroupFormChange,
}) {
  if (organizations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Создать учебную группу</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Группа будет создана только в организации, доступной текущему представителю.
          </p>
        </div>
      </div>

      {groupActionError && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {groupActionError}
        </div>
      )}

      {groupActionMessage && (
        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
          {groupActionMessage}
        </div>
      )}

      <form onSubmit={onCreateGroup} className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Организация</span>
          <select
            name="organization_id"
            value={groupForm.organization_id}
            onChange={onGroupFormChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Название группы</span>
          <input
            name="name"
            value={groupForm.name}
            onChange={onGroupFormChange}
            maxLength={255}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Например: Сотрудники филиала №1"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Код группы</span>
          <input
            name="code"
            value={groupForm.code}
            onChange={onGroupFormChange}
            maxLength={64}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Например: FILIAL-1-2026"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <input
            name="is_active"
            type="checkbox"
            checked={groupForm.is_active}
            onChange={onGroupFormChange}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-semibold text-slate-700">Группа активна</span>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-500">Описание</span>
          <textarea
            name="description"
            value={groupForm.description}
            onChange={onGroupFormChange}
            maxLength={1024}
            rows={3}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Комментарий для внутренней навигации по группе"
          />
        </label>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={creatingGroup}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
          >
            {creatingGroup ? "Создаём..." : "Создать группу"}
          </button>
        </div>
      </form>
    </section>
  );
}


export function OrganizationProfileSection({
  organizations,
  onSaveOrganization,
}) {
  if (organizations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-slate-50 p-1">
      <div className="rounded-[1.8rem] bg-white/70 p-5 ring-1 ring-slate-200 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Реквизиты организации</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Данные берутся из профиля организации и показываются только в рамках доступного org-scope.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            {organizations.length} в доступе
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          {organizations.map((organization) => (
            <OrganizationProfileCard
              key={organization.id}
              organization={organization}
              onSave={onSaveOrganization}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


export function OrganizationCabinetStats({
  summary,
  organizations,
  groups,
  activeGroupsCount,
  inactiveGroupsCount,
  selectedGroup,
  selectedGroupId,
  members,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard
        label="Организаций в доступе"
        value={summary.organizations_count ?? organizations.length}
        hint="По scope назначенной роли"
      />
      <SummaryCard
        label="Учебных групп"
        value={summary.groups_count ?? groups.length}
        hint={`${summary.active_groups_count ?? activeGroupsCount} активных / ${inactiveGroupsCount} неактивных`}
      />
      <SummaryCard
        label="Участников выбранной группы"
        value={selectedGroupId ? members.length : "—"}
        hint={selectedGroup ? selectedGroup.name : "Выберите группу"}
      />
    </div>
  );
}


export function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
      {hint && <div className="mt-2 text-sm text-slate-500">{hint}</div>}
    </div>
  );
}
