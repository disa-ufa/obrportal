import { formatApiError } from "../utils/apiErrors";
import {
  getAdminAuditEvents,
  getAdminDashboardSummary,
  getAdminOrganizations,
  getAdminPermissions,
  getAdminRoles,
  getAdminUsers,
  getOrgLearningGroups,
} from "../api/client";
import {
  EMPTY_ADMIN_DATA,
  getNowLabel,
  sortGroups,
  sortOrganizations,
  sortUsers,
} from "../utils/adminState";

export const ADMIN_USERS_FAST_PATH_LIMIT = 200;

export function getAdminUsersRoleCode(roles = [], roleId = "") {
  if (!roleId) {
    return "";
  }

  const role = roles.find((item) => item.id === roleId);

  return role?.code || "";
}

export function buildAdminUsersFastPathFilters(usersFilters = {}, roles = []) {
  const filters = {
    limit: ADMIN_USERS_FAST_PATH_LIMIT,
  };

  const searchQuery = `${usersFilters.q || ""}`.trim();

  if (searchQuery) {
    filters.q = searchQuery;
  }

  if (usersFilters.activity === "active") {
    filters.is_active = true;
  }

  if (usersFilters.activity === "inactive") {
    filters.is_active = false;
  }

  const roleCode = getAdminUsersRoleCode(roles, usersFilters.role_id || "");

  if (roleCode) {
    filters.role = roleCode;
  }

  return filters;
}

export function useAdminDataLoader({
  setAdminData,
  setAdminDataLoadedAt,
  setAdminLoading,
  setError,
}) {
  async function loadAdminData(options = {}) {
    const { usersFilters = {} } = options || {};

    setAdminLoading(true);
    setError("");

    try {
      const [
        organizations,
        groups,
        roles,
        permissions,
        auditEvents,
        dashboardSummary,
      ] = await Promise.all([
        getAdminOrganizations(),
        getOrgLearningGroups(),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
        getAdminDashboardSummary(),
      ]);

      const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));

      setAdminData({
        users,
        organizations,
        groups: sortGroups(groups),
        courses: [],
        enrollments: [],
        documents: [],
        roles,
        permissions,
        auditEvents,
        dashboardSummary,
      });
      setAdminDataLoadedAt(getNowLabel());
    } catch (err) {
      setError(formatApiError(err, "Не удалось загрузить административные данные."));
      setAdminData(EMPTY_ADMIN_DATA);
      setAdminDataLoadedAt("");
    } finally {
      setAdminLoading(false);
    }
  }

  async function refreshAdminGroups() {
    setAdminLoading(true);
    setError("");

    try {
      const groups = await getOrgLearningGroups();

      setAdminData((current) => ({
        ...current,
        groups: sortGroups(groups),
      }));
      setAdminDataLoadedAt(getNowLabel());
    } catch (err) {
      setError(formatApiError(err, "Не удалось обновить список учебных групп."));
    } finally {
      setAdminLoading(false);
    }
  }

  async function refreshAdminOrganizations() {
    setAdminLoading(true);
    setError("");

    try {
      const organizations = await getAdminOrganizations();

      setAdminData((current) => ({
        ...current,
        organizations: sortOrganizations(organizations),
      }));
      setAdminDataLoadedAt(getNowLabel());
    } catch (err) {
      setError(formatApiError(err, "Не удалось обновить список организаций."));
    } finally {
      setAdminLoading(false);
    }
  }

  async function refreshAdminUsers(usersFilters = {}, roles = []) {
    setAdminLoading(true);
    setError("");

    try {
      const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));

      setAdminData((current) => ({
        ...current,
        users: sortUsers(users),
      }));
      setAdminDataLoadedAt(getNowLabel());
    } catch (err) {
      setError(formatApiError(err, "Не удалось обновить список пользователей."));
    } finally {
      setAdminLoading(false);
    }
  }

  return {
    loadAdminData,
    refreshAdminGroups,
    refreshAdminOrganizations,
    refreshAdminUsers,
  };
}
