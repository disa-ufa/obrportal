export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
  }
}

export function formatOptional(value) {
  if (value === undefined || value === null) {
    return "—";
  }

  const stringValue = `${value}`;

  if (stringValue.trim() === "") {
    return "—";
  }

  return value;
}

export function shortId(value) {
  if (!value) {
    return "—";
  }

  const stringValue = `${value}`;

  return `${stringValue.slice(0, 8)}…`;
}

export function formatUserOrganizations(organizations = [], organizationIds = []) {
  const organizationItems = normalizeItems(organizations);
  const organizationIdItems = normalizeItems(organizationIds);

  if (organizationItems.length > 0) {
    return organizationItems
      .map((organization) => {
        const item = normalizeObject(organization);

        return item.name || shortId(item.id);
      })
      .join(", ");
  }

  if (organizationIdItems.length > 0) {
    return organizationIdItems
      .map((id) => shortId(id))
      .join(", ");
  }

  return "";
}

export function formatUserRoles(roles = []) {
  const items = normalizeItems(roles);

  if (items.length === 0) {
    return "";
  }

  return items
    .map((role) => {
      const item = normalizeObject(role);

      return item.name || item.code;
    })
    .join(", ");
}

export function buildOrganizationOptions(profileOrganizations = [], groups = []) {
  const organizationItems = normalizeItems(profileOrganizations);
  const groupItems = normalizeItems(groups);

  if (organizationItems.length > 0) {
    return organizationItems
      .map((organization) => normalizeObject(organization))
      .filter((organization) => organization.id)
      .map((organization) => ({
        id: organization.id,
        label: organization.name || shortId(organization.id),
        inn: organization.inn,
        kpp: organization.kpp,
        ogrn: organization.ogrn,
        legal_address: organization.legal_address,
        actual_address: organization.actual_address,
      }));
  }

  const uniqueIds = new Set();

  groupItems.forEach((group) => {
    const organizationId = group?.organization_id;

    if (organizationId) {
      uniqueIds.add(organizationId);
    }
  });

  const organizationIds = [...uniqueIds];
  const hasSingleOrganization = organizationIds.length === 1;

  return organizationIds.map((id, index) => ({
    id,
    label: hasSingleOrganization ? "Моя организация" : `Организация ${index + 1}`,
  }));
}

// Organization cabinet summary helpers.
function normalizeItems(items) {
  return Array.isArray(items) ? items : [];
}

function normalizeObject(item) {
  return item && typeof item === "object" && !Array.isArray(item) ? item : {};
}

export function buildActiveGroupsCount(groups = []) {
  const items = normalizeItems(groups);

  return items.filter((group) => group?.is_active === true).length;
}

export function buildFallbackOrganizationSummary({
  organizations,
  groups,
  activeGroupsCount,
}) {
  const organizationItems = normalizeItems(organizations);
  const groupItems = normalizeItems(groups);
  const activeGroupsCountValue =
    typeof activeGroupsCount === "number" ? activeGroupsCount : buildActiveGroupsCount(groupItems);

  return {
    organizations_count: organizationItems.length,
    groups_count: groupItems.length,
    active_groups_count: activeGroupsCountValue,
    members_count: 0,
  };
}

export function buildInactiveGroupsCount({
  summary,
  groups,
  activeGroupsCount,
}) {
  const summaryItem = normalizeObject(summary);
  const groupItems = normalizeItems(groups);
  const fallbackActiveGroupsCount =
    typeof activeGroupsCount === "number" ? activeGroupsCount : buildActiveGroupsCount(groupItems);
  const totalGroupsCount = summaryItem.groups_count ?? groupItems.length;
  const activeGroupsCountValue =
    summaryItem.active_groups_count ?? fallbackActiveGroupsCount;

  return Math.max(totalGroupsCount - activeGroupsCountValue, 0);
}

export function getOrganizationLabel(organizationId, organizations) {
  const items = normalizeItems(organizations);

  return items.find((item) => item.id === organizationId)?.label || shortId(organizationId);
}

export function getGroupStatus(group) {
  return group?.is_active === true
    ? { label: "Активная", className: "bg-green-50 text-green-700 ring-green-200" }
    : { label: "Неактивная", className: "bg-slate-100 text-slate-600 ring-slate-200" };
}

export function sortEnrollments(items) {
  return normalizeItems(items).sort((left, right) =>
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
  const currentEnrollmentItems = normalizeItems(currentItems);
  const newEnrollmentItems = normalizeItems(newItems);

  [...currentEnrollmentItems, ...newEnrollmentItems].forEach((item) => {
    if (!item?.id) {
      return;
    }

    itemsById.set(item.id, item);
  });

  return sortEnrollments([...itemsById.values()]);
}

export function enrollmentMatchesFilters(enrollment, searchQuery, statusFilter) {
  const item = normalizeObject(enrollment);
  const normalizedSearch = (searchQuery || "").trim().toLowerCase();

  if (statusFilter && item.status !== statusFilter) {
    return false;
  }

  if (!normalizedSearch) {
    return true;
  }

  const searchableText = [
    item.course_title,
    item.course_slug,
    item.course_id,
    item.user_full_name,
    item.user_email,
    item.user_id,
    formatEnrollmentStatus(item.status),
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
  return normalizeItems(items).sort((left, right) =>
    (left.full_name || left.email || left.id).localeCompare(
      right.full_name || right.email || right.id,
      "ru"
    )
  );
}

export function buildOrganizationUserFromMember(member) {
  const item = normalizeObject(member);
  const organizations = normalizeItems(item.user_organizations);
  const roles = normalizeItems(item.user_roles);

  return {
    id: item.user_id,
    email: item.user_email,
    full_name: item.user_full_name,
    is_active: item.user_is_active,
    organization_ids: organizations.map((organization) => organization.id),
    organizations,
    roles,
  };
}

export function organizationUserMatchesQuery(userItem, query) {
  const item = normalizeObject(userItem);
  const normalizedQuery = (query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [item.email, item.full_name]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function sortMembers(items) {
  return normalizeItems(items).sort((left, right) =>
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
  const item = normalizeObject(group);

  return {
    name: item.name || "",
    code: item.code || "",
    description: item.description || "",
    is_active: item.is_active ?? true,
  };
}

export function buildOrganizationProfileFormData(organization) {
  const item = normalizeObject(organization);

  return {
    kpp: item.kpp || "",
    ogrn: item.ogrn || "",
    legal_address: item.legal_address || "",
    actual_address: item.actual_address || "",
  };
}
