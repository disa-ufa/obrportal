const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function getStoredToken() {
  return localStorage.getItem("obrportal_access_token");
}

export function storeToken(token) {
  localStorage.setItem("obrportal_access_token", token);
}

export function clearToken() {
  localStorage.removeItem("obrportal_access_token");
}

async function request(path, options = {}) {
  const token = getStoredToken();

  const headers = {
    "Accept": "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.detail || `HTTP ${response.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export async function login(email, password) {
  const data = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  storeToken(data.access_token);

  return data;
}

export async function getCurrentUser() {
  return request("/api/v1/auth/me");
}

export async function checkAdminRbac() {
  return request("/api/v1/admin/rbac-check");
}

export async function getHealth() {
  return request("/health");
}

export async function getReady() {
  return request("/api/v1/ready");
}

export async function getAdminUsers() {
  return request("/api/v1/admin/users");
}

export async function getAdminUserDetail(userId) {
  return request(`/api/v1/admin/users/${userId}`);
}

export async function createAdminUser(payload) {
  return request("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(userId, payload) {
  return request(`/api/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function activateAdminUser(userId) {
  return request(`/api/v1/admin/users/${userId}/activate`, {
    method: "POST",
  });
}

export async function deactivateAdminUser(userId) {
  return request(`/api/v1/admin/users/${userId}/deactivate`, {
    method: "POST",
  });
}

export async function assignAdminUserRole(userId, payload) {
  return request(`/api/v1/admin/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeAdminUserRole(userId, userRoleId) {
  return request(`/api/v1/admin/users/${userId}/roles/${userRoleId}`, {
    method: "DELETE",
  });
}

export async function getAdminOrganizations() {
  return request("/api/v1/admin/organizations");
}

export async function getAdminOrganizationDetail(organizationId) {
  return request(`/api/v1/admin/organizations/${organizationId}`);
}

export async function createAdminOrganization(payload) {
  return request("/api/v1/admin/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminOrganization(organizationId, payload) {
  return request(`/api/v1/admin/organizations/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAdminRoles() {
  return request("/api/v1/admin/roles");
}

export async function getAdminRoleDetail(roleId) {
  return request(`/api/v1/admin/roles/${roleId}`);
}

export async function getAdminPermissions() {
  return request("/api/v1/admin/permissions");
}

export async function getAdminPermissionDetail(permissionId) {
  return request(`/api/v1/admin/permissions/${permissionId}`);
}

export async function getAdminAuditEvents() {
  return request("/api/v1/admin/audit-events");
}

export async function getAdminAuditEventDetail(auditEventId) {
  return request(`/api/v1/admin/audit-events/${auditEventId}`);
}
