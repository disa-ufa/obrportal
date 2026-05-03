import { useState } from "react";

export function useAdminSelections() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState("");

  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedOrganizationLoading, setSelectedOrganizationLoading] = useState(false);
  const [selectedOrganizationError, setSelectedOrganizationError] = useState("");

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupLoading, setSelectedGroupLoading] = useState(false);
  const [selectedGroupError, setSelectedGroupError] = useState("");

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRoleLoading, setSelectedRoleLoading] = useState(false);
  const [selectedRoleError, setSelectedRoleError] = useState("");

  const [selectedPermission, setSelectedPermission] = useState(null);
  const [selectedPermissionLoading, setSelectedPermissionLoading] = useState(false);
  const [selectedPermissionError, setSelectedPermissionError] = useState("");

  const [selectedAuditEvent, setSelectedAuditEvent] = useState(null);
  const [selectedAuditEventLoading, setSelectedAuditEventLoading] = useState(false);
  const [selectedAuditEventError, setSelectedAuditEventError] = useState("");

  function clearSelectedUser() {
    setSelectedUser(null);
    setSelectedUserLoading(false);
    setSelectedUserError("");
  }

  function clearSelectedOrganization() {
    setSelectedOrganization(null);
    setSelectedOrganizationLoading(false);
    setSelectedOrganizationError("");
  }

  function clearSelectedGroup() {
    setSelectedGroup(null);
    setSelectedGroupLoading(false);
    setSelectedGroupError("");
  }

  function clearSelectedRole() {
    setSelectedRole(null);
    setSelectedRoleLoading(false);
    setSelectedRoleError("");
  }

  function clearSelectedPermission() {
    setSelectedPermission(null);
    setSelectedPermissionLoading(false);
    setSelectedPermissionError("");
  }

  function clearSelectedAuditEvent() {
    setSelectedAuditEvent(null);
    setSelectedAuditEventLoading(false);
    setSelectedAuditEventError("");
  }

  function clearAllSelections() {
    clearSelectedUser();
    clearSelectedOrganization();
    clearSelectedGroup();
    clearSelectedRole();
    clearSelectedPermission();
    clearSelectedAuditEvent();
  }

  async function openSelection({ setValue, setLoading, setError, load }) {
    setValue(null);
    setError("");
    setLoading(true);

    try {
      const detail = await load();
      setValue(detail);

      return detail;
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`);

      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    openSelection,
    clearAllSelections,
    selectedUser,
    setSelectedUser,
    selectedUserLoading,
    setSelectedUserLoading,
    selectedUserError,
    setSelectedUserError,
    clearSelectedUser,

    selectedOrganization,
    setSelectedOrganization,
    selectedOrganizationLoading,
    setSelectedOrganizationLoading,
    selectedOrganizationError,
    setSelectedOrganizationError,
    clearSelectedOrganization,

    selectedGroup,
    setSelectedGroup,
    selectedGroupLoading,
    setSelectedGroupLoading,
    selectedGroupError,
    setSelectedGroupError,
    clearSelectedGroup,

    selectedRole,
    setSelectedRole,
    selectedRoleLoading,
    setSelectedRoleLoading,
    selectedRoleError,
    setSelectedRoleError,
    clearSelectedRole,

    selectedPermission,
    setSelectedPermission,
    selectedPermissionLoading,
    setSelectedPermissionLoading,
    selectedPermissionError,
    setSelectedPermissionError,
    clearSelectedPermission,

    selectedAuditEvent,
    setSelectedAuditEvent,
    selectedAuditEventLoading,
    setSelectedAuditEventLoading,
    selectedAuditEventError,
    setSelectedAuditEventError,
    clearSelectedAuditEvent,
  };
}
