import {
  activateAdminUser,
  assignAdminRolePermission,
  assignAdminUserRole,
  createAdminOrganization,
  createAdminRole,
  createAdminUser,
  createOrgLearningGroup,
  deactivateAdminUser,
  deleteAdminOrganization,
  deleteAdminRole,
  deleteOrgLearningGroup,
  removeAdminRolePermission,
  removeAdminUserRole,
  resetAdminUserPassword,
  updateAdminOrganization,
  updateAdminRole,
  updateAdminUser,
  updateOrgLearningGroup,
} from "../api/client";
import {
  removeAdminCollectionItem,
  replaceAdminCollectionItem,
  upsertAdminCollectionItem,
} from "../utils/adminCollectionState";
import {
  sortGroups,
  sortOrganizations,
  sortRoles,
  sortUsers,
} from "../utils/adminState";

export function useAdminEntityActions({
  setAdminData,
  setSelectedUser,
  setSelectedOrganization,
  setSelectedGroup,
  selectedGroup,
  clearSelectedGroup,
  setSelectedRole,
  selectedRole,
  clearSelectedRole,
  clearSelectedOrganization,
}) {
  async function handleCreateUser(payload) {
    const created = await createAdminUser(payload);

    upsertAdminCollectionItem(setAdminData, "users", created, sortUsers);
    setSelectedUser(created);

    return created;
  }

  async function handleUpdateUser(userId, payload) {
    const updated = await updateAdminUser(userId, payload);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleResetUserPassword(userId, password) {
    const updated = await resetAdminUserPassword(userId, password);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleActivateUser(userId) {
    const updated = await activateAdminUser(userId);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleDeactivateUser(userId) {
    const updated = await deactivateAdminUser(userId);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleAssignUserRole(userId, payload) {
    const updated = await assignAdminUserRole(userId, payload);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleRemoveUserRole(userId, userRoleId) {
    const updated = await removeAdminUserRole(userId, userRoleId);

    replaceAdminCollectionItem(setAdminData, "users", updated, sortUsers);
    setSelectedUser(updated);

    return updated;
  }

  async function handleCreateOrganization(payload) {
    const created = await createAdminOrganization(payload);

    upsertAdminCollectionItem(setAdminData, "organizations", created, sortOrganizations);
    setSelectedOrganization(created);

    return created;
  }

  async function handleUpdateOrganization(organizationId, payload) {
    const updated = await updateAdminOrganization(organizationId, payload);

    replaceAdminCollectionItem(setAdminData, "organizations", updated, sortOrganizations);
    setSelectedOrganization(updated);

    return updated;
  }

  async function handleDeleteOrganization(organizationId) {
    const deleted = await deleteAdminOrganization(organizationId);

    removeAdminCollectionItem(setAdminData, "organizations", organizationId);
    clearSelectedOrganization();

    return deleted;
  }

  async function handleCreateGroup(payload) {
    const created = await createOrgLearningGroup(payload);

    upsertAdminCollectionItem(setAdminData, "groups", created, sortGroups);
    setSelectedGroup(created);

    return created;
  }

  async function handleUpdateGroup(groupId, payload) {
    const updated = await updateOrgLearningGroup(groupId, payload);

    replaceAdminCollectionItem(setAdminData, "groups", updated, sortGroups);
    setSelectedGroup(updated);

    return updated;
  }

  async function handleDeleteGroup(groupId) {
    const deleted = await deleteOrgLearningGroup(groupId);

    removeAdminCollectionItem(setAdminData, "groups", groupId, sortGroups);

    if (selectedGroup?.id === groupId) {
      clearSelectedGroup();
    }

    return deleted;
  }

  async function handleCreateRole(payload) {
    const created = await createAdminRole(payload);

    upsertAdminCollectionItem(setAdminData, "roles", created, sortRoles);
    setSelectedRole(created);

    return created;
  }

  async function handleUpdateRole(roleId, payload) {
    const updated = await updateAdminRole(roleId, payload);

    replaceAdminCollectionItem(setAdminData, "roles", updated, sortRoles);
    setSelectedRole(updated);

    return updated;
  }

  async function handleDeleteRole(roleId) {
    const deleted = await deleteAdminRole(roleId);

    removeAdminCollectionItem(setAdminData, "roles", roleId, sortRoles);

    if (selectedRole?.id === roleId) {
      clearSelectedRole();
    }

    return deleted;
  }

  async function handleAssignRolePermission(roleId, payload) {
    const updated = await assignAdminRolePermission(roleId, payload);

    replaceAdminCollectionItem(setAdminData, "roles", updated, sortRoles);
    setSelectedRole(updated);

    return updated;
  }

  async function handleRemoveRolePermission(roleId, rolePermissionId) {
    const updated = await removeAdminRolePermission(roleId, rolePermissionId);

    replaceAdminCollectionItem(setAdminData, "roles", updated, sortRoles);
    setSelectedRole(updated);

    return updated;
  }

  return {
    handleCreateUser,
    handleUpdateUser,
    handleResetUserPassword,
    handleActivateUser,
    handleDeactivateUser,
    handleAssignUserRole,
    handleRemoveUserRole,

    handleCreateOrganization,
    handleUpdateOrganization,
    handleDeleteOrganization,

    handleCreateGroup,
    handleUpdateGroup,
    handleDeleteGroup,

    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    handleAssignRolePermission,
    handleRemoveRolePermission,
  };
}
