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
      setError(`${err.status || ""} ${err.message}`);
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
