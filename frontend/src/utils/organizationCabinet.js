export function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatOptional(value) {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return "—";
  }

  return value;
}

export function shortId(value) {
  if (!value) {
    return "—";
  }

  return `${value.slice(0, 8)}…`;
}

export function formatUserOrganizations(organizations = [], organizationIds = []) {
  if (Array.isArray(organizations) && organizations.length > 0) {
    return organizations
      .map((organization) => organization.name || shortId(organization.id))
      .join(", ");
  }

  if (Array.isArray(organizationIds) && organizationIds.length > 0) {
    return organizationIds.map((id) => shortId(id)).join(", ");
  }

  return "";
}

export function formatUserRoles(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return "";
  }

  return roles.map((role) => role.name || role.code).join(", ");
}

export function buildOrganizationOptions(profileOrganizations = [], groups = []) {
  if (Array.isArray(profileOrganizations) && profileOrganizations.length > 0) {
    return profileOrganizations.map((organization) => ({
      id: organization.id,
      label: organization.name || shortId(organization.id),
      inn: organization.inn,
      kpp: organization.kpp,
      ogrn: organization.ogrn,
      legal_address: organization.legal_address,
      actual_address: organization.actual_address,
    }));
  }

  const uniqueIds = [];

  groups.forEach((group) => {
    if (group.organization_id && !uniqueIds.includes(group.organization_id)) {
      uniqueIds.push(group.organization_id);
    }
  });

  return uniqueIds.map((id, index) => ({
    id,
    label: uniqueIds.length === 1 ? "Моя организация" : `Организация ${index + 1}`,
  }));
}

// Organization cabinet summary helpers.
export function buildActiveGroupsCount(groups = []) {
  const items = Array.isArray(groups) ? groups : [];

  return items.filter((group) => group.is_active).length;
}

export function buildFallbackOrganizationSummary({
  organizations,
  groups,
  activeGroupsCount,
}) {
  return {
    organizations_count: organizations.length,
    groups_count: groups.length,
    active_groups_count: activeGroupsCount,
    members_count: 0,
  };
}

export function buildInactiveGroupsCount({
  summary,
  groups,
  activeGroupsCount,
}) {
  return Math.max(
    (summary.groups_count ?? groups.length) - (summary.active_groups_count ?? activeGroupsCount),
    0
  );
}

export function getOrganizationLabel(organizationId, organizations) {
  return organizations.find((item) => item.id === organizationId)?.label || shortId(organizationId);
}

export function getGroupStatus(group) {
  return group.is_active
    ? { label: "Активная", className: "bg-green-50 text-green-700 ring-green-200" }
    : { label: "Неактивная", className: "bg-slate-100 text-slate-600 ring-slate-200" };
}

export function sortEnrollments(items) {
  return [...items].sort((left, right) =>
    `${left.course_title || ""} ${left.user_email || ""}`.localeCompare(
      `${right.course_title || ""} ${right.user_email || ""}`,
      "ru"
    )
  );
}

export function formatEnrollmentStatus(status) {
  const statuses = {
    assigned: "Назначен",
    in_progress: "В процессе",
    completed: "Завершён",
  };

  return statuses[status] || status || "—";
}

export function mergeUniqueEnrollments(currentItems = [], newItems = []) {
  const itemsById = new Map();

  [...currentItems, ...newItems].forEach((item) => {
    if (!item?.id) {
      return;
    }

    itemsById.set(item.id, item);
  });

  return sortEnrollments([...itemsById.values()]);
}

export function enrollmentMatchesFilters(enrollment, searchQuery, statusFilter) {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  if (statusFilter && enrollment.status !== statusFilter) {
    return false;
  }

  if (!normalizedSearch) {
    return true;
  }

  const searchableText = [
    enrollment.course_title,
    enrollment.course_slug,
    enrollment.course_id,
    enrollment.user_full_name,
    enrollment.user_email,
    enrollment.user_id,
    formatEnrollmentStatus(enrollment.status),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

export function hasActiveEnrollmentFilters(searchQuery, statusFilter) {
  return searchQuery.trim() !== "" || statusFilter !== "";
}

export function sortOrganizationUsers(items) {
  return [...items].sort((left, right) =>
    (left.full_name || left.email || left.id).localeCompare(
      right.full_name || right.email || right.id,
      "ru"
    )
  );
}

export function buildOrganizationUserFromMember(member) {
  const organizations = Array.isArray(member.user_organizations)
    ? member.user_organizations
    : [];

  return {
    id: member.user_id,
    email: member.user_email,
    full_name: member.user_full_name,
    is_active: member.user_is_active,
    organization_ids: organizations.map((organization) => organization.id),
    organizations,
    roles: Array.isArray(member.user_roles) ? member.user_roles : [],
  };
}

export function organizationUserMatchesQuery(userItem, query) {
  const normalizedQuery = (query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [userItem.email, userItem.full_name]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function sortMembers(items) {
  return [...items].sort((left, right) =>
    (left.user_full_name || left.user_email || left.user_id).localeCompare(
      right.user_full_name || right.user_email || right.user_id,
      "ru"
    )
  );
}

export function buildEmptyGroupEnrollmentForm() {
  return {
    course_id: "",
    status: "assigned",
  };
}

export function buildEmptyGroupForm(organizationId = "") {
  return {
    organization_id: organizationId,
    name: "",
    code: "",
    description: "",
    is_active: true,
  };
}

export function buildLearningGroupFormData(group) {
  return {
    name: group?.name || "",
    code: group?.code || "",
    description: group?.description || "",
    is_active: group?.is_active ?? true,
  };
}

export function buildOrganizationProfileFormData(organization) {
  return {
    kpp: organization.kpp || "",
    ogrn: organization.ogrn || "",
    legal_address: organization.legal_address || "",
    actual_address: organization.actual_address || "",
  };
}
