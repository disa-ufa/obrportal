import { useEffect, useMemo, useState } from "react";
import {
  addOrgLearningGroupMember,
  createOrgGroupEnrollments,
  createOrgLearningGroup,
  deleteOrgGroupEnrollment,
  deleteOrgLearningGroup,
  getOrgGroupEnrollments,
  getOrgLearningGroupMembers,
  getOrgLearningGroups,
  getOrgProfile,
  getPublicCourses,
  removeOrgLearningGroupMember,
  searchOrgUsers,
  updateOrgLearningGroup,
  updateOrgProfile,
} from "../api/client";
import { formatApiError } from "../utils/apiErrors";
import {
  EmptyState,
  LearningGroupEditForm,
  OrganizationCabinetHero,
  OrganizationCabinetStats,
  OrganizationProfileCard,
} from "../components/organization/OrganizationCabinetForms";
import {
  buildEmptyGroupEnrollmentForm,
  buildEmptyGroupForm,
  buildLearningGroupFormData,
  buildOrganizationOptions,
  buildOrganizationProfileFormData,
  buildOrganizationUserFromMember,
  enrollmentMatchesFilters,
  formatDate,
  formatEnrollmentStatus,
  formatOptional,
  formatUserOrganizations,
  formatUserRoles,
  getGroupStatus,
  getOrganizationLabel,
  hasActiveEnrollmentFilters,
  mergeUniqueEnrollments,
  organizationUserMatchesQuery,
  shortId,
  sortEnrollments,
  sortMembers,
  sortOrganizationUsers,
} from "../utils/organizationCabinet";

export function OrganizationCabinetPage({ user, onPageChange, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState([]);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [organizationUsersQuery, setOrganizationUsersQuery] = useState("");
  const [organizationUsersLoading, setOrganizationUsersLoading] = useState(false);
  const [organizationUsersError, setOrganizationUsersError] = useState("");
  const [organizationUsersMessage, setOrganizationUsersMessage] = useState("");
  const [addingOrganizationUserId, setAddingOrganizationUserId] = useState("");
  const [memberActionError, setMemberActionError] = useState("");
  const [memberActionMessage, setMemberActionMessage] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState("");
  const [profile, setProfile] = useState(null);
  const [groupForm, setGroupForm] = useState(() => buildEmptyGroupForm());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupActionError, setGroupActionError] = useState("");
  const [groupActionMessage, setGroupActionMessage] = useState("");
  const [groupEnrollmentForm, setGroupEnrollmentForm] = useState(() => buildEmptyGroupEnrollmentForm());
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseSearchResults, setCourseSearchResults] = useState([]);
  const [courseSearchLoading, setCourseSearchLoading] = useState(false);
  const [assigningGroupCourse, setAssigningGroupCourse] = useState(false);
  const [groupEnrollmentError, setGroupEnrollmentError] = useState("");
  const [groupEnrollmentResult, setGroupEnrollmentResult] = useState(null);
  const [groupEnrollments, setGroupEnrollments] = useState([]);
  const [groupEnrollmentsLoading, setGroupEnrollmentsLoading] = useState(false);
  const [groupEnrollmentsError, setGroupEnrollmentsError] = useState("");
  const [groupEnrollmentsRefreshKey, setGroupEnrollmentsRefreshKey] = useState(0);
  const [groupEnrollmentSearchQuery, setGroupEnrollmentSearchQuery] = useState("");
  const [groupEnrollmentStatusFilter, setGroupEnrollmentStatusFilter] = useState("");
  const [deletingGroupEnrollmentId, setDeletingGroupEnrollmentId] = useState("");
  const [groupEnrollmentDeleteMessage, setGroupEnrollmentDeleteMessage] = useState("");
  const [groupDeleteError, setGroupDeleteError] = useState("");
  const [groupDeleteMessage, setGroupDeleteMessage] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        setLoading(true);
        setError("");
        setGroupActionError("");
        setGroupActionMessage("");
        setGroupDeleteError("");
        setGroupDeleteMessage("");

        const [profileResponse, groupsResponse] = await Promise.all([
          getOrgProfile(),
          getOrgLearningGroups(),
        ]);
        const items = Array.isArray(groupsResponse) ? groupsResponse : [];

        if (cancelled) {
          return;
        }

        setGroups(items);
        setProfile(profileResponse && typeof profileResponse === "object" ? profileResponse : null);
        setSelectedGroupId((current) => current || items[0]?.id || "");
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Не удалось загрузить данные организации."));
          setGroups([]);
          setProfile(null);
          setSelectedGroupId("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      if (!selectedGroupId) {
        setMembers([]);
        setMembersError("");
        setMemberActionError("");
        setMemberActionMessage("");
        setMemberUserId("");
        setMemberSearchQuery("");
        setMemberSearchResults([]);
        return;
      }

      try {
        setMembersLoading(true);
        setMembersError("");
        setMemberActionError("");
        setMemberActionMessage("");
        setMemberUserId("");
        setMemberSearchQuery("");
        setMemberSearchResults([]);

        const response = await getOrgLearningGroupMembers(selectedGroupId);

        if (!cancelled) {
          setMembers(Array.isArray(response) ? sortMembers(response) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setMembers([]);
          setMembersError(formatApiError(err, "Не удалось загрузить участников группы."));
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, groupEnrollmentsRefreshKey]);

  const organizations = useMemo(() => buildOrganizationOptions(profile?.organizations || [], groups), [profile, groups]);
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const visibleGroupEnrollments = useMemo(
    () =>
      groupEnrollments.filter((enrollment) =>
        enrollmentMatchesFilters(
          enrollment,
          groupEnrollmentSearchQuery,
          groupEnrollmentStatusFilter
        )
      ),
    [groupEnrollments, groupEnrollmentSearchQuery, groupEnrollmentStatusFilter]
  );

  const groupEnrollmentFiltersActive = hasActiveEnrollmentFilters(
    groupEnrollmentSearchQuery,
    groupEnrollmentStatusFilter
  );

  const activeGroupsCount = useMemo(
    () => groups.filter((group) => group.is_active).length,
    [groups]
  );

  const summary = profile?.summary || {
    organizations_count: organizations.length,
    groups_count: groups.length,
    active_groups_count: activeGroupsCount,
    members_count: 0,
  };

  const inactiveGroupsCount = Math.max(
    (summary.groups_count ?? groups.length) - (summary.active_groups_count ?? activeGroupsCount),
    0
  );

  useEffect(() => {
    if (organizations.length === 0) {
      return;
    }

    setGroupForm((current) => {
      if (current.organization_id) {
        return current;
      }

      return {
        ...current,
        organization_id: organizations[0].id,
      };
    });
  }, [organizations]);

  useEffect(() => {
    setGroupEnrollmentError("");
    setGroupEnrollmentResult(null);
    setGroupEnrollmentForm(buildEmptyGroupEnrollmentForm());
    setCourseSearchQuery("");
    setCourseSearchResults([]);
    setGroupEnrollmentSearchQuery("");
    setGroupEnrollmentStatusFilter("");
    setGroupEnrollmentDeleteMessage("");
  }, [selectedGroupId]);

  useEffect(() => {
    let cancelled = false;

    async function loadGroupEnrollments() {
      if (!selectedGroupId) {
        setGroupEnrollments([]);
        setGroupEnrollmentsError("");
        return;
      }

      try {
        setGroupEnrollmentsLoading(true);
        setGroupEnrollmentsError("");

        const response = await getOrgGroupEnrollments(selectedGroupId);

        if (!cancelled) {
          setGroupEnrollments(Array.isArray(response) ? sortEnrollments(response) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setGroupEnrollments([]);
          setGroupEnrollmentsError(formatApiError(err, "Не удалось загрузить назначения группы."));
        }
      } finally {
        if (!cancelled) {
          setGroupEnrollmentsLoading(false);
        }
      }
    }

    loadGroupEnrollments();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  async function handleSaveOrganization(organizationId, payload) {
    const updated = await updateOrgProfile(organizationId, payload);

    setProfile((current) => {
      if (!current || !Array.isArray(current.organizations)) {
        return current;
      }

      return {
        ...current,
        organizations: current.organizations.map((organization) =>
          organization.id === updated.id ? updated : organization
        ),
      };
    });

    return updated;
  }

  function handleGroupFormChange(event) {
    const { checked, name, type, value } = event.target;

    setGroupForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleCreateGroup(event) {
    event.preventDefault();

    if (!groupForm.organization_id) {
      setGroupActionError("Выберите организацию для учебной группы.");
      return;
    }

    if (!groupForm.name.trim()) {
      setGroupActionError("Укажите название учебной группы.");
      return;
    }

    try {
      setCreatingGroup(true);
      setGroupActionError("");
      setGroupActionMessage("");

      const created = await createOrgLearningGroup({
        organization_id: groupForm.organization_id,
        name: groupForm.name,
        code: groupForm.code,
        description: groupForm.description,
        is_active: groupForm.is_active,
      });

      setGroups((current) =>
        [...current, created].sort((left, right) =>
          left.name.localeCompare(right.name, "ru")
        )
      );
      setSelectedGroupId(created.id);
      setGroupForm(buildEmptyGroupForm(created.organization_id));
      setGroupActionMessage("Учебная группа создана.");
    } catch (err) {
      setGroupActionError(formatApiError(err, "Не удалось создать учебную группу."));
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleSaveGroup(groupId, payload) {
    const updated = await updateOrgLearningGroup(groupId, payload);

    setGroups((current) =>
      current
        .map((group) => (group.id === updated.id ? { ...group, ...updated } : group))
        .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    );

    return updated;
  }


  async function handleDeleteGroupEnrollment(enrollment) {
    if (!selectedGroupId || !enrollment?.id) {
      return;
    }

    const courseTitle = enrollment.course_title || "курс";
    const learnerName = enrollment.user_full_name || enrollment.user_email || "участника";

    if (!window.confirm(`Снять назначение курса "${courseTitle}" для ${learnerName}?`)) {
      return;
    }

    try {
      setDeletingGroupEnrollmentId(enrollment.id);
      setGroupEnrollmentsError("");
      setGroupEnrollmentDeleteMessage("");

      await deleteOrgGroupEnrollment(selectedGroupId, enrollment.id);

      setGroupEnrollments((current) =>
        current.filter((item) => item.id !== enrollment.id)
      );
      setGroupEnrollmentDeleteMessage("Назначение курса снято.");
    } catch (err) {
      setGroupEnrollmentsError(formatApiError(err, "Не удалось снять назначение курса."));
    } finally {
      setDeletingGroupEnrollmentId("");
    }
  }

  async function handleDeleteGroup(group) {
    if (!group?.id) {
      return;
    }

    if (!window.confirm(`Удалить учебную группу "${group.name}"? Действие нельзя отменить.`)) {
      return;
    }

    try {
      setDeletingGroupId(group.id);
      setGroupDeleteError("");
      setGroupDeleteMessage("");
      setGroupActionError("");
      setGroupActionMessage("");

      await deleteOrgLearningGroup(group.id);

      const remainingGroups = groups.filter((item) => item.id !== group.id);
      setGroups(remainingGroups);

      if (selectedGroupId === group.id) {
        setSelectedGroupId(remainingGroups[0]?.id || "");
        setMembers([]);
        setMembersError("");
        setMemberUserId("");
        setMemberSearchQuery("");
        setMemberSearchResults([]);
        setMemberActionError("");
        setMemberActionMessage("");
      }

      setGroupDeleteMessage("Учебная группа удалена.");
    } catch (err) {
      setGroupDeleteError(formatApiError(err, "Не удалось удалить учебную группу."));
    } finally {
      setDeletingGroupId("");
    }
  }

  useEffect(() => {
    setOrganizationUsers([]);
    setOrganizationUsersError("");
    setOrganizationUsersMessage("");
    setAddingOrganizationUserId("");
  }, [selectedGroupId]);


  async function handleSearchOrganizationUsers(event) {
    event?.preventDefault?.();

    try {
      setOrganizationUsersLoading(true);
      setOrganizationUsersError("");

      const filters = {
        q: organizationUsersQuery,
        limit: 50,
      };

      if (selectedGroupId) {
        filters.exclude_group_id = selectedGroupId;
      }

      const results = await searchOrgUsers(filters);

      setOrganizationUsers(Array.isArray(results) ? sortOrganizationUsers(results) : []);
    } catch (err) {
      setOrganizationUsers([]);
      setOrganizationUsersError(formatApiError(err, "Не удалось загрузить пользователей организации."));
    } finally {
      setOrganizationUsersLoading(false);
    }
  }


  async function handleAddOrganizationUserToSelectedGroup(userItem) {
    if (!selectedGroupId) {
      setOrganizationUsersError("Выберите учебную группу, в которую нужно добавить пользователя.");
      return;
    }

    try {
      setAddingOrganizationUserId(userItem.id);
      setOrganizationUsersError("");
      setOrganizationUsersMessage("");

      const created = await addOrgLearningGroupMember(selectedGroupId, {
        user_id: userItem.id,
      });

      setMembers((current) => sortMembers([...current, created]));
      setOrganizationUsers((current) => current.filter((item) => item.id !== userItem.id));
      setMemberSearchResults((current) => current.filter((item) => item.id !== userItem.id));
      setOrganizationUsersMessage("Пользователь добавлен в выбранную группу.");
    } catch (err) {
      setOrganizationUsersError(formatApiError(err, "Не удалось добавить пользователя в выбранную группу."));
    } finally {
      setAddingOrganizationUserId("");
    }
  }


  async function handleSearchMemberCandidates() {
    const normalizedQuery = memberSearchQuery.trim();

    if (!selectedGroupId) {
      setMemberActionError("Выберите учебную группу.");
      setMemberSearchResults([]);
      setMemberUserId("");
      return;
    }

    if (!normalizedQuery) {
      setMemberActionError("Введите email или ФИО пользователя для поиска.");
      setMemberSearchResults([]);
      setMemberUserId("");
      return;
    }

    try {
      setMemberSearchLoading(true);
      setMemberActionError("");
      setMemberActionMessage("");
      setMemberUserId("");

      const results = await searchOrgUsers({
        q: normalizedQuery,
        limit: 20,
        exclude_group_id: selectedGroupId,
      });

      const items = Array.isArray(results) ? results : [];
      setMemberSearchResults(items);

      if (items.length === 0) {
        setMemberActionError("Пользователи не найдены в доступной организации.");
      }
    } catch (err) {
      setMemberSearchResults([]);
      setMemberActionError(formatApiError(err, "Не удалось выполнить поиск пользователей."));
    } finally {
      setMemberSearchLoading(false);
    }
  }

  function handleGroupEnrollmentFormChange(event) {
    const { name, value } = event.target;

    setGroupEnrollmentForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCourseSearchQueryChange(event) {
    setCourseSearchQuery(event.target.value);
    setCourseSearchResults([]);
    setGroupEnrollmentForm((current) => ({
      ...current,
      course_id: "",
    }));
    setGroupEnrollmentResult(null);
  }

  async function handleSearchCourseCandidates() {
    const normalizedQuery = courseSearchQuery.trim();

    if (!normalizedQuery) {
      setGroupEnrollmentError("Введите название, код или описание курса для поиска.");
      setCourseSearchResults([]);
      setGroupEnrollmentForm((current) => ({
        ...current,
        course_id: "",
      }));
      return;
    }

    try {
      setCourseSearchLoading(true);
      setGroupEnrollmentError("");
      setGroupEnrollmentResult(null);
      setGroupEnrollmentForm((current) => ({
        ...current,
        course_id: "",
      }));

      const results = await getPublicCourses({
        q: normalizedQuery,
        limit: 20,
      });

      const items = Array.isArray(results) ? results : [];
      setCourseSearchResults(items);

      if (items.length === 0) {
        setGroupEnrollmentError("Активные курсы не найдены.");
      }
    } catch (err) {
      setCourseSearchResults([]);
      setGroupEnrollmentError(formatApiError(err, "Не удалось выполнить поиск курсов."));
    } finally {
      setCourseSearchLoading(false);
    }
  }

  function handleSelectCourse(course) {
    setGroupEnrollmentForm((current) => ({
      ...current,
      course_id: course.id,
    }));
    setCourseSearchQuery(course.title || course.slug || course.id);
    setCourseSearchResults([]);
    setGroupEnrollmentError("");
    setGroupEnrollmentResult(null);
  }

  async function handleCreateGroupEnrollments(event) {
    event.preventDefault();

    if (!selectedGroupId) {
      setGroupEnrollmentError("Выберите учебную группу.");
      return;
    }

    const normalizedCourseId = groupEnrollmentForm.course_id.trim();

    if (!normalizedCourseId) {
      setGroupEnrollmentError("Выберите курс из результатов поиска.");
      return;
    }

    try {
      setAssigningGroupCourse(true);
      setGroupEnrollmentError("");
      setGroupEnrollmentResult(null);

      const result = await createOrgGroupEnrollments({
        learning_group_id: selectedGroupId,
        course_id: normalizedCourseId,
        status: groupEnrollmentForm.status,
      });

      setGroupEnrollmentResult(result);
      setGroupEnrollmentForm(buildEmptyGroupEnrollmentForm());
      setCourseSearchQuery("");
      setCourseSearchResults([]);

      if (Array.isArray(result.created) && result.created.length > 0) {
        setGroupEnrollments((current) => mergeUniqueEnrollments(current, result.created));
      }
    } catch (err) {
      setGroupEnrollmentError(formatApiError(err, "Не удалось назначить курс группе."));
    } finally {
      setAssigningGroupCourse(false);
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();

    const normalizedUserId = memberUserId.trim();

    if (!selectedGroupId) {
      setMemberActionError("Выберите учебную группу.");
      return;
    }

    if (!normalizedUserId) {
      setMemberActionError("Выберите пользователя из результатов поиска.");
      return;
    }

    try {
      setAddingMember(true);
      setMemberActionError("");
      setMemberActionMessage("");

      const created = await addOrgLearningGroupMember(selectedGroupId, {
        user_id: normalizedUserId,
      });

      setMembers((current) => sortMembers([...current, created]));
      setMemberUserId("");
      setMemberSearchQuery("");
      setMemberSearchResults([]);
      setMemberActionMessage("Участник добавлен в группу.");
    } catch (err) {
      setMemberActionError(formatApiError(err, "Не удалось добавить участника в группу."));
    } finally {
      setAddingMember(false);
    }
  }

  async function handleDeleteMember(member) {
    if (!selectedGroupId) {
      setMemberActionError("Выберите учебную группу.");
      return;
    }

    const displayName = member.user_full_name || member.user_email || member.user_id;

    if (!window.confirm(`Удалить участника "${displayName}" из группы?`)) {
      return;
    }

    try {
      setDeletingMemberId(member.id);
      setMemberActionError("");
      setMemberActionMessage("");

      await removeOrgLearningGroupMember(selectedGroupId, member.user_id);

      const restoredUser = buildOrganizationUserFromMember(member);

      setMembers((current) => current.filter((item) => item.id !== member.id));

      if (organizationUserMatchesQuery(restoredUser, organizationUsersQuery)) {
        setOrganizationUsers((current) => {
          if (current.some((item) => item.id === restoredUser.id)) {
            return current;
          }

          return sortOrganizationUsers([...current, restoredUser]);
        });
      }

      if (memberSearchQuery.trim() && organizationUserMatchesQuery(restoredUser, memberSearchQuery)) {
        setMemberSearchResults((current) => {
          if (current.some((item) => item.id === restoredUser.id)) {
            return current;
          }

          return sortOrganizationUsers([...current, restoredUser]);
        });
      }

      setMemberActionMessage("Участник удалён из группы.");
    } catch (err) {
      setMemberActionError(formatApiError(err, "Не удалось удалить участника из группы."));
    } finally {
      setDeletingMemberId("");
    }
  }

  return (
    <div className="space-y-6">
      <OrganizationCabinetHero>
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-200">
          Кабинет организации
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Управление обучением сотрудников
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 md:text-base">
              Здесь представитель юридического лица видит учебные группы своей организации,
              участников групп и дальнейшие корпоративные назначения.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                {user?.full_name || user?.email || "Пользователь"}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                Роль: представитель ЮЛ
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onPageChange("catalog")}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Каталог программ
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              Выйти
            </button>
          </div>
        </div>
      </OrganizationCabinetHero>

      {error && (
        <div className="rounded-3xl bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <OrganizationCabinetStats
        summary={summary}
        organizations={organizations}
        groups={groups}
        activeGroupsCount={activeGroupsCount}
        inactiveGroupsCount={inactiveGroupsCount}
        selectedGroup={selectedGroup}
        selectedGroupId={selectedGroupId}
        members={members}
      />

      {organizations.length > 0 && (
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
                  onSave={handleSaveOrganization}
                />
              ))}
            </div>
          </div>
        </section>
      )}

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
              onClick={handleSearchOrganizationUsers}
              disabled={organizationUsersLoading}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
            >
              {organizationUsersLoading ? "Загружаем..." : "Загрузить список"}
            </button>
          </div>

          <form onSubmit={handleSearchOrganizationUsers} className="mt-5 flex flex-col gap-3 md:flex-row">
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
                        onClick={() => handleAddOrganizationUserToSelectedGroup(item)}
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

      {organizations.length > 0 && (
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

          <form onSubmit={handleCreateGroup} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Организация</span>
              <select
                name="organization_id"
                value={groupForm.organization_id}
                onChange={handleGroupFormChange}
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
                onChange={handleGroupFormChange}
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
                onChange={handleGroupFormChange}
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
                onChange={handleGroupFormChange}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-semibold text-slate-700">Группа активна</span>
            </label>

            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Описание</span>
              <textarea
                name="description"
                value={groupForm.description}
                onChange={handleGroupFormChange}
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
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-8 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          Загружаем кабинет организации...
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Учебные группы пока не созданы"
          text="После добавления групп они появятся в этом кабинете. Представитель ЮЛ будет видеть только группы организаций, к которым привязана его роль."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Учебные группы</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Доступ ограничен организациями, назначенными текущему представителю.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Группа</th>
                      <th className="px-4 py-3">Организация</th>
                      <th className="px-4 py-3">Код</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {groups.map((group) => {
                      const status = getGroupStatus(group);
                      const isSelected = group.id === selectedGroupId;

                      return (
                        <tr key={group.id} className={isSelected ? "bg-blue-50/60" : ""}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-950">{group.name}</div>
                            {group.description && (
                              <div className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                                {group.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getOrganizationLabel(group.organization_id, organizations)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{group.code || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setSelectedGroupId(group.id)}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
                              disabled={isSelected}
                            >
                              {isSelected ? "Открыта" : "Открыть"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
                    onClick={() => handleDeleteGroup(selectedGroup)}
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
        </div>
      )}

      <section className="rounded-[2rem] bg-blue-50 p-6 ring-1 ring-blue-100">
        <div className="text-lg font-bold text-slate-950">Следующие разделы кабинета ЮЛ</div>
        <div className="mt-2 text-sm leading-6 text-slate-700">
          На этом шаге подключён безопасный маршрут и чтение групп по org-scope.
          Далее можно добавить корпоративные заявки на обучение, массовые назначения и документы по сотрудникам.
        </div>
      </section>
    </div>
  );
}
