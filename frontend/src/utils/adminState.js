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

export function sortRoles(roles) {
  return [...roles].sort((left, right) =>
    left.code.localeCompare(right.code, "ru-RU")
  );
}
