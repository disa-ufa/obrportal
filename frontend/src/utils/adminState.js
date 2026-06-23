export const EMPTY_ADMIN_DATA = {
  users: [],
  organizations: [],
  groups: [],
  courses: [],
  enrollments: [],
  documents: [],
  roles: [],
  permissions: [],
  auditEvents: [],
  dashboardSummary: null,
};

export function userHasRole(user, roleCode) {
  return user?.roles?.some((role) => role.code === roleCode) || false;
}

export function getNowLabel() {
  return new Date().toLocaleString("ru-RU");
}

export function sortOrganizations(organizations) {
  return [...organizations].sort((left, right) =>
    left.name.localeCompare(right.name, "ru-RU")
  );
}

export function sortGroups(groups) {
  return [...groups].sort((left, right) =>
    left.name.localeCompare(right.name, "ru-RU")
  );
}

export function sortUsers(users) {
  return [...users].sort((left, right) =>
    left.email.localeCompare(right.email, "ru-RU")
  );
}

export function sortCourses(courses) {
  return [...courses].sort((left, right) =>
    left.title.localeCompare(right.title, "ru-RU")
  );
}

export function sortEnrollments(enrollments) {
  return [...enrollments].sort((left, right) => {
    const leftLabel = `${left.user_email || ""} ${left.course_title || ""}`;
    const rightLabel = `${right.user_email || ""} ${right.course_title || ""}`;

    return leftLabel.localeCompare(rightLabel, "ru-RU");
  });
}

export function sortDocuments(documents) {
  return [...documents].sort((left, right) => {
    const leftLabel = `${left.document_number || ""} ${left.title || ""}`;
    const rightLabel = `${right.document_number || ""} ${right.title || ""}`;

    return leftLabel.localeCompare(rightLabel, "ru-RU");
  });
}

export function sortRoles(roles) {
  return [...roles].sort((left, right) =>
    left.code.localeCompare(right.code, "ru-RU")
  );
}

export function sortPermissions(permissions) {
  return [...permissions].sort((left, right) =>
    left.code.localeCompare(right.code, "ru-RU")
  );
}

export function sortAuditEvents(auditEvents) {
  return [...auditEvents].sort((left, right) =>
    String(right.created_at || "").localeCompare(String(left.created_at || ""), "ru-RU")
  );
}
