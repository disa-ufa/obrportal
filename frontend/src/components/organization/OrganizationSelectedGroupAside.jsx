import {
  EmptyState,
  LearningGroupEditForm,
  OrganizationSelectedGroupPanelHeader,
} from "./OrganizationCabinetForms";
import {
  formatDate,
  formatEnrollmentStatus,
  formatUserOrganizations,
  formatUserRoles,
  shortId,
} from "../../utils/organizationCabinet";

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
