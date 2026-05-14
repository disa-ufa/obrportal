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
  OrganizationCabinetStats,
  OrganizationGroupCreateSection,
  OrganizationUsersSection,
  OrganizationProfileSection,
} from "../components/organization/OrganizationCabinetForms";
import { OrganizationCabinetNextSteps } from "../components/organization/OrganizationCabinetNextSteps";
import { OrganizationCabinetHeroSection } from "../components/organization/OrganizationCabinetHeroSection";
import { OrganizationCabinetErrorAlert } from "../components/organization/OrganizationCabinetErrorAlert";
import { OrganizationCabinetGroupsWorkspace } from "../components/organization/OrganizationCabinetGroupsWorkspace";
import {
  buildEmptyGroupEnrollmentForm,
  buildEmptyGroupForm,
  buildOrganizationOptions,
  buildOrganizationUserFromMember,
  enrollmentMatchesFilters,
  hasActiveEnrollmentFilters,
  mergeUniqueEnrollments,
  organizationUserMatchesQuery,
  sortEnrollments,
  sortMembers,
  sortOrganizationUsers,
} from "../utils/organizationCabinet";

function buildHeroSectionProps({ heroUserLabel, onPageChange, onLogout }) {
  return {
    heroUserLabel,
    onPageChange,
    onLogout,
  };
}

function buildCabinetStatsProps({
  summary,
  organizations,
  groups,
  activeGroupsCount,
  inactiveGroupsCount,
  selectedGroup,
  selectedGroupId,
  members,
}) {
  return {
    summary,
    organizations,
    groups,
    activeGroupsCount,
    inactiveGroupsCount,
    selectedGroup,
    selectedGroupId,
    members,
  };
}

function buildOrganizationProfileSectionProps({
  organizations,
  onSaveOrganization,
}) {
  return {
    organizations,
    onSaveOrganization,
  };
}

function buildOrganizationUsersSectionProps({
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
  return {
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
  };
}

function buildGroupCreateSectionProps({
  organizations,
  groupForm,
  creatingGroup,
  groupActionError,
  groupActionMessage,
  onCreateGroup,
  onGroupFormChange,
}) {
  return {
    organizations,
    groupForm,
    creatingGroup,
    groupActionError,
    groupActionMessage,
    onCreateGroup,
    onGroupFormChange,
  };
}

function buildGroupListProps({
  groups,
  selectedGroupId,
  onSelectGroup,
}) {
  return {
    groups,
    selectedGroupId,
    onSelectGroup,
  };
}

function buildGroupsWorkspaceProps({
  loading,
  hasGroups,
  groupListProps,
  selectedGroupAsideProps,
}) {
  return {
    loading,
    hasGroups,
    groupListProps,
    selectedGroupAsideProps,
  };
}

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
  const hasGroups = groups.length > 0;
  const heroUserLabel = user?.full_name || user?.email || "Пользователь";

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

  const heroSectionProps = buildHeroSectionProps({
    heroUserLabel,
    onPageChange,
    onLogout,
  });

  const cabinetStatsProps = buildCabinetStatsProps({
    summary,
    organizations,
    groups,
    activeGroupsCount,
    inactiveGroupsCount,
    selectedGroup,
    selectedGroupId,
    members,
  });

  const organizationProfileSectionProps = buildOrganizationProfileSectionProps({
    organizations,
    onSaveOrganization: handleSaveOrganization,
  });

  const organizationUsersSectionProps = buildOrganizationUsersSectionProps({
    organizations,
    organizationUsers,
    organizationUsersQuery,
    organizationUsersLoading,
    organizationUsersError,
    organizationUsersMessage,
    addingOrganizationUserId,
    selectedGroupId,
    onSearchOrganizationUsers: handleSearchOrganizationUsers,
    onAddOrganizationUserToSelectedGroup: handleAddOrganizationUserToSelectedGroup,
    setOrganizationUsersQuery,
    setOrganizationUsers,
    setOrganizationUsersError,
  });

  const groupCreateSectionProps = buildGroupCreateSectionProps({
    organizations,
    groupForm,
    creatingGroup,
    groupActionError,
    groupActionMessage,
    onCreateGroup: handleCreateGroup,
    onGroupFormChange: handleGroupFormChange,
  });

  const selectedGroupAsideProps = {
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
  };

  const groupListProps = buildGroupListProps({
    groups,
    selectedGroupId,
    onSelectGroup: setSelectedGroupId,
  });

  const groupsWorkspaceProps = buildGroupsWorkspaceProps({
    loading,
    hasGroups,
    groupListProps,
    selectedGroupAsideProps,
  });

  return (
    <div className="space-y-6">
      <OrganizationCabinetHeroSection {...heroSectionProps} />

      <OrganizationCabinetErrorAlert error={error} />

      <OrganizationCabinetStats {...cabinetStatsProps} />

      <OrganizationProfileSection {...organizationProfileSectionProps} />

      <OrganizationUsersSection {...organizationUsersSectionProps} />

      <OrganizationGroupCreateSection {...groupCreateSectionProps} />

      <OrganizationCabinetGroupsWorkspace {...groupsWorkspaceProps} />

      <OrganizationCabinetNextSteps />
    </div>
  );
}
