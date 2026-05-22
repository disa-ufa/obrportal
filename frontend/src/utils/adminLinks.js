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

export const ADMIN_LINK_BUILDER_DIAGNOSTIC_CASES = [
  {
    key: "audit",
    builderName: "buildAuditPath",
    expectedPath: "/admin/audit-events?entity_type=document&limit=25",
    actualPath: buildAuditPath({ entity_type: "document", limit: "25" }),
  },
  {
    key: "audit-default-limit",
    builderName: "buildAuditPath",
    expectedPath: "/admin/audit-events",
    actualPath: buildAuditPath({ limit: "50" }),
  },
  {
    key: "users",
    builderName: "buildUsersPath",
    expectedPath: "/admin/users?activity=inactive",
    actualPath: buildUsersPath({ activity: "inactive" }),
  },
  {
    key: "users-default-activity",
    builderName: "buildUsersPath",
    expectedPath: "/admin/users",
    actualPath: buildUsersPath({ activity: "all" }),
  },
  {
    key: "organizations",
    builderName: "buildOrganizationsPath",
    expectedPath: "/admin/organizations?scope=with_kpp",
    actualPath: buildOrganizationsPath({ scope: "with_kpp" }),
  },
  {
    key: "groups",
    builderName: "buildGroupsPath",
    expectedPath: "/admin/groups?status=active&organization_id=00000000-0000-0000-0000-000000000000",
    actualPath: buildGroupsPath({
      status: "active",
      organization_id: "00000000-0000-0000-0000-000000000000",
    }),
  },
  {
    key: "groups-defaults",
    builderName: "buildGroupsPath",
    expectedPath: "/admin/groups",
    actualPath: buildGroupsPath({ status: "all", organization_id: "all" }),
  },
  {
    key: "courses",
    builderName: "buildCoursesPath",
    expectedPath: "/admin/courses?is_active=true&q=__routes_meta_course__",
    actualPath: buildCoursesPath({ is_active: "true", q: "__routes_meta_course__" }),
  },
  {
    key: "enrollments",
    builderName: "buildEnrollmentsPath",
    expectedPath: "/admin/enrollments?status=completed&action_required=true",
    actualPath: buildEnrollmentsPath({ status: "completed", action_required: "true" }),
  },
  {
    key: "documents",
    builderName: "buildDocumentsPath",
    expectedPath: "/admin/documents?status=available&type=certificate",
    actualPath: buildDocumentsPath({ status: "available", type: "certificate" }),
  },
  {
    key: "roles",
    builderName: "buildRolesPath",
    expectedPath: "/admin/roles?type=system",
    actualPath: buildRolesPath({ type: "system" }),
  },
  {
    key: "permissions",
    builderName: "buildPermissionsPath",
    expectedPath: "/admin/permissions?group=audit",
    actualPath: buildPermissionsPath({ group: "audit" }),
  },
];

export const ENTITY_ADMIN_PATH_DIAGNOSTIC_CASES = [
  { entity_type: "user", entity_id: "__routes_meta_user__", expectedPath: "/admin/users?q=__routes_meta_user__" },
  { entity_type: "organization", entity_id: "__routes_meta_org__", expectedPath: "/admin/organizations?q=__routes_meta_org__" },
  { entity_type: "learning_group", entity_id: "__routes_meta_group__", expectedPath: "/admin/groups?q=__routes_meta_group__" },
  { entity_type: "course", entity_id: "__routes_meta_course__", expectedPath: "/admin/courses?q=__routes_meta_course__" },
  { entity_type: "enrollment", entity_id: "__routes_meta_enrollment__", expectedPath: "/admin/enrollments?q=__routes_meta_enrollment__" },
  { entity_type: "document", entity_id: "__routes_meta_document__", expectedPath: "/admin/documents?q=__routes_meta_document__" },
  { entity_type: "role", entity_id: "__routes_meta_role__", expectedPath: "/admin/roles?q=__routes_meta_role__" },
  { entity_type: "permission", entity_id: "__routes_meta_permission__", expectedPath: "/admin/permissions?q=__routes_meta_permission__" },
];

export function getAdminLinkBuilderDiagnostics() {
  const brokenBuilderCases = ADMIN_LINK_BUILDER_DIAGNOSTIC_CASES.filter(
    (item) => item.actualPath !== item.expectedPath
  );
  const duplicateBuilderPaths = ADMIN_LINK_BUILDER_DIAGNOSTIC_CASES
    .map((item) => item.actualPath)
    .filter((path, index, paths) => paths.indexOf(path) !== index);

  return {
    casesTotal: ADMIN_LINK_BUILDER_DIAGNOSTIC_CASES.length,
    brokenBuilderCases,
    duplicateBuilderPaths: [...new Set(duplicateBuilderPaths)],
    ok: brokenBuilderCases.length === 0,
  };
}

export function getEntityAdminPathDiagnostics() {
  const cases = ENTITY_ADMIN_PATH_DIAGNOSTIC_CASES.map((item) => ({
    ...item,
    actualPath: buildEntityAdminPath(item),
  }));
  const brokenEntityCases = cases.filter((item) => item.actualPath !== item.expectedPath);

  return {
    casesTotal: cases.length,
    brokenEntityCases,
    ok: brokenEntityCases.length === 0,
  };
}
