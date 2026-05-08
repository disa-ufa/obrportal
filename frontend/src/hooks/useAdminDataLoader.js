import { formatApiError } from "../utils/apiErrors";
import {
  getAdminAuditEvents,
  getAdminCourses,
  getAdminDocuments,
  getAdminEnrollments,
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
        courses,
        enrollments,
        documents,
        roles,
        permissions,
        auditEvents,
      ] = await Promise.all([
        getAdminUsers(),
        getAdminOrganizations(),
        getOrgLearningGroups(),
        getAdminCourses({ limit: 300 }),
        getAdminEnrollments({ limit: 300 }),
        getAdminDocuments({ limit: 300 }),
        getAdminRoles(),
        getAdminPermissions(),
        getAdminAuditEvents(),
      ]);

      setAdminData({
        users,
        organizations,
        groups: sortGroups(groups),
        courses,
        enrollments,
        documents,
        roles,
        permissions,
        auditEvents,
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
