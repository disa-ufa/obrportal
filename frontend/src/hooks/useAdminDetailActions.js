import {
  getAdminAuditEventDetail,
  getAdminOrganizationDetail,
  getAdminPermissionDetail,
  getAdminRoleDetail,
  getAdminUserDetail,
  getOrgLearningGroupDetail,
} from "../api/client";

export function useAdminDetailActions({
  openSelection,

  setSelectedUser,
  setSelectedUserLoading,
  setSelectedUserError,

  setSelectedOrganization,
  setSelectedOrganizationLoading,
  setSelectedOrganizationError,

  setSelectedGroup,
  setSelectedGroupLoading,
  setSelectedGroupError,

  setSelectedRole,
  setSelectedRoleLoading,
  setSelectedRoleError,

  setSelectedPermission,
  setSelectedPermissionLoading,
  setSelectedPermissionError,

  setSelectedAuditEvent,
  setSelectedAuditEventLoading,
  setSelectedAuditEventError,
}) {
  async function handleOpenUser(userId) {
    return openSelection({
      setValue: setSelectedUser,
      setLoading: setSelectedUserLoading,
      setError: setSelectedUserError,
      load: () => getAdminUserDetail(userId),
    });
  }

  async function handleOpenOrganization(organizationId) {
    return openSelection({
      setValue: setSelectedOrganization,
      setLoading: setSelectedOrganizationLoading,
      setError: setSelectedOrganizationError,
      load: () => getAdminOrganizationDetail(organizationId),
    });
  }

  async function handleOpenGroup(groupId) {
    return openSelection({
      setValue: setSelectedGroup,
      setLoading: setSelectedGroupLoading,
      setError: setSelectedGroupError,
      load: () => getOrgLearningGroupDetail(groupId),
    });
  }

  async function handleOpenRole(roleId) {
    return openSelection({
      setValue: setSelectedRole,
      setLoading: setSelectedRoleLoading,
      setError: setSelectedRoleError,
      load: () => getAdminRoleDetail(roleId),
    });
  }

  async function handleOpenPermission(permissionId) {
    return openSelection({
      setValue: setSelectedPermission,
      setLoading: setSelectedPermissionLoading,
      setError: setSelectedPermissionError,
      load: () => getAdminPermissionDetail(permissionId),
    });
  }

  async function handleOpenAuditEvent(auditEventId) {
    return openSelection({
      setValue: setSelectedAuditEvent,
      setLoading: setSelectedAuditEventLoading,
      setError: setSelectedAuditEventError,
      load: () => getAdminAuditEventDetail(auditEventId),
    });
  }

  return {
    handleOpenUser,
    handleOpenOrganization,
    handleOpenGroup,
    handleOpenRole,
    handleOpenPermission,
    handleOpenAuditEvent,
  };
}
