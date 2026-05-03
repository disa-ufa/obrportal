export const TABLE_LINK_CLASS =
  "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

export const LINK_PILL_CLASS =
  "inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

export const PANEL_LINK_CLASS =
  "rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

export function buildPath(pathname, filters = {}, defaults = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (defaults[key] !== undefined && String(value) === String(defaults[key])) {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function buildAuditPath(filters = {}) {
  return buildPath("/admin/audit-events", filters, {
    limit: "50",
  });
}

export function buildUsersPath(filters = {}) {
  return buildPath("/admin/users", filters, {
    activity: "all",
  });
}

export function buildOrganizationsPath(filters = {}) {
  return buildPath("/admin/organizations", filters, {
    scope: "all",
  });
}

export function buildGroupsPath(filters = {}) {
  return buildPath("/admin/groups", filters, {
    organization_id: "all",
    status: "all",
  });
}

export function buildCoursesPath(filters = {}) {
  return buildPath("/admin/courses", filters);
}

export function buildEnrollmentsPath(filters = {}) {
  return buildPath("/admin/enrollments", filters);
}

export function buildDocumentsPath(filters = {}) {
  return buildPath("/admin/documents", filters);
}

export function buildRolesPath(filters = {}) {
  return buildPath("/admin/roles", filters, {
    type: "all",
  });
}

export function buildPermissionsPath(filters = {}) {
  return buildPath("/admin/permissions", filters, {
    group: "all",
  });
}

export function buildEntityAdminPath(event) {
  if (!event?.entity_type || !event?.entity_id) {
    return "";
  }

  const query = event.entity_id;

  if (event.entity_type === "user") {
    return buildUsersPath({ q: query });
  }

  if (event.entity_type === "organization") {
    return buildOrganizationsPath({ q: query });
  }

  if (event.entity_type === "learning_group") {
    return buildGroupsPath({ q: query });
  }

  if (event.entity_type === "course") {
    return buildCoursesPath({ q: query });
  }

  if (event.entity_type === "enrollment") {
    return buildEnrollmentsPath({ q: query });
  }

  if (event.entity_type === "document") {
    return buildDocumentsPath({ q: query });
  }

  if (event.entity_type === "role") {
    return buildRolesPath({ q: query });
  }

  if (event.entity_type === "permission") {
    return buildPermissionsPath({ q: query });
  }

  return "";
}
