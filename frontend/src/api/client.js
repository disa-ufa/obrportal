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

export async function getAdminRoles() {
  return request("/api/v1/admin/roles");
}

export async function getAdminPermissions() {
  return request("/api/v1/admin/permissions");
}

export async function getAdminAuditEvents() {
  return request("/api/v1/admin/audit-events");
}
