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
} from "../utils/adminState";

export function useAdminDataLoader({
  setAdminData,
  setAdminDataLoadedAt,
  setAdminLoading,
  setError,
}) {
  async function loadAdminData() {
    setAdminLoading(true);
    setError("");

    try {
      const [
        users,
        organizations,
        groups,
        roles,
        permissions,
        auditEvents,
        dashboardSummary,
      ] = await Promise.all([
        getAdminUsers(),
        getAdminOrganizations(),
        getOrgLearningGroups(),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
        getAdminDashboardSummary(),
      ]);

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

  return {
    loadAdminData,
  };
}
