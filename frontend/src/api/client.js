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
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    "Accept": "application/json",
    ...(options.body && !isFormDataBody ? { "Content-Type": "application/json" } : {}),
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

export async function registerUser(payload) {
  return request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  return request("/api/v1/auth/me");
}

export async function getAccountSummary() {
  return request("/api/v1/account/summary");
}

export async function getAccountCourses() {
  return request("/api/v1/account/courses");
}

export async function enrollAccountCourse(courseId) {
  return request(`/api/v1/account/courses/${courseId}/enroll`, {
    method: "POST",
  });
}

export async function startAccountCourse(enrollmentId) {
  return request(`/api/v1/account/courses/${enrollmentId}/start`, {
    method: "POST",
  });
}

export async function completeAccountCourse(enrollmentId) {
  return request(`/api/v1/account/courses/${enrollmentId}/complete`, {
    method: "POST",
  });
}

export async function getAccountDocuments() {
  return request("/api/v1/account/documents");
}

function extractDownloadFilename(response, fallback = "document.bin") {
  const disposition = response.headers.get("Content-Disposition") || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = disposition.match(/filename="([^"]+)"/i) || disposition.match(/filename=([^;]+)/i);

  if (plainMatch?.[1]) {
    return plainMatch[1].trim().replace(/^"|"$/g, "");
  }

  return fallback;
}

function normalizeDownloadedFilename(filename, blob) {
  const safeFilename = filename || "document.bin";

  if (blob?.type === "application/pdf" && !safeFilename.toLowerCase().endsWith(".pdf")) {
    return safeFilename.replace(/\.[^./\\]+$/, "") + ".pdf";
  }

  return safeFilename;
}

export async function downloadAccountDocument(documentId) {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE_URL}/api/v1/account/documents/${documentId}/download`, {
    method: "GET",
    headers: {
      "Accept": "application/pdf, application/octet-stream",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    const message = data?.detail || `HTTP ${response.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  const blob = await response.blob();
  const filename = normalizeDownloadedFilename(
    extractDownloadFilename(response, `document-${documentId}.bin`),
    blob
  );
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}

export async function verifyPublicDocument(number) {
  const query = new URLSearchParams({ number });
  return request(`/api/v1/public/documents/verify?${query.toString()}`);
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

export async function resetAdminUserPassword(userId, password) {
  return request(`/api/v1/admin/users/${userId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
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

export async function deleteAdminOrganization(organizationId) {
  return request(`/api/v1/admin/organizations/${organizationId}`, {
    method: "DELETE",
  });
}

export async function getOrgProfile() {
  return request("/api/v1/org/profile");
}

export async function searchOrgUsers(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();
  return request(`/api/v1/org/users${query ? `?${query}` : ""}`);
}


export async function createOrgGroupEnrollments(payload) {
  return request("/api/v1/org/enrollments/group", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrgGroupEnrollments(groupId) {
  return request(`/api/v1/org/groups/${groupId}/enrollments`);
}

export async function deleteOrgGroupEnrollment(groupId, enrollmentId) {
  return request(`/api/v1/org/groups/${groupId}/enrollments/${enrollmentId}`, {
    method: "DELETE",
  });
}

export async function updateOrgProfile(organizationId, payload) {
  return request(`/api/v1/org/profile/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getOrgLearningGroups(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/org/groups${query ? `?${query}` : ""}`);
}

export async function getOrgLearningGroupDetail(groupId) {
  return request(`/api/v1/org/groups/${groupId}`);
}

export async function createOrgLearningGroup(payload) {
  return request("/api/v1/org/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrgLearningGroup(groupId, payload) {
  return request(`/api/v1/org/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrgLearningGroup(groupId) {
  return request(`/api/v1/org/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function getOrgLearningGroupMembers(groupId) {
  return request(`/api/v1/org/groups/${groupId}/members`);
}

export async function addOrgLearningGroupMember(groupId, payload) {
  return request(`/api/v1/org/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeOrgLearningGroupMember(groupId, userId) {
  return request(`/api/v1/org/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function getAdminRoles() {
  return request("/api/v1/admin/roles");
}

export async function getAdminRoleDetail(roleId) {
  return request(`/api/v1/admin/roles/${roleId}`);
}

export async function createAdminRole(payload) {
  return request("/api/v1/admin/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminRole(roleId, payload) {
  return request(`/api/v1/admin/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminRole(roleId) {
  return request(`/api/v1/admin/roles/${roleId}`, {
    method: "DELETE",
  });
}

export async function assignAdminRolePermission(roleId, payload) {
  return request(`/api/v1/admin/roles/${roleId}/permissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeAdminRolePermission(roleId, rolePermissionId) {
  return request(`/api/v1/admin/roles/${roleId}/permissions/${rolePermissionId}`, {
    method: "DELETE",
  });
}

export async function getAdminPermissions() {
  return request("/api/v1/admin/permissions");
}

export async function getAdminPermissionDetail(permissionId) {
  return request(`/api/v1/admin/permissions/${permissionId}`);
}

export async function getAdminAuditEvents(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/admin/audit-events${query ? `?${query}` : ""}`);
}

export async function getAdminAuditEventDetail(auditEventId) {
  return request(`/api/v1/admin/audit-events/${auditEventId}`);
}


export async function getAdminDocuments(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/admin/documents${query ? `?${query}` : ""}`);
}

export async function createAdminDocument(payload) {
  return request("/api/v1/admin/documents", {
    method: "POST",
    body: payload,
  });
}


export async function updateAdminDocument(documentId, payload) {
  return request(`/api/v1/admin/documents/${documentId}`, {
    method: "PATCH",
    body: payload,
  });
}


export async function deleteAdminDocument(documentId) {
  return request(`/api/v1/admin/documents/${documentId}`, {
    method: "DELETE",
  });
}


export async function downloadAdminDocument(documentId) {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${documentId}/download`, {
    method: "GET",
    headers: {
      "Accept": "application/pdf, application/octet-stream",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    const message = data?.detail || `HTTP ${response.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  const blob = await response.blob();
  const filename = normalizeDownloadedFilename(
    extractDownloadFilename(response, `admin-document-${documentId}.bin`),
    blob
  );
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}


export async function getAdminCourses(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/admin/courses${query ? `?${query}` : ""}`);
}

export async function getAdminCourseDetail(courseId) {
  return request(`/api/v1/admin/courses/${courseId}`);
}

export async function createAdminCourse(payload) {
  return request("/api/v1/admin/courses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCourse(courseId, payload) {
  return request(`/api/v1/admin/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function activateAdminCourse(courseId) {
  return request(`/api/v1/admin/courses/${courseId}/activate`, {
    method: "POST",
  });
}

export async function deactivateAdminCourse(courseId) {
  return request(`/api/v1/admin/courses/${courseId}/deactivate`, {
    method: "POST",
  });
}

export async function deleteAdminCourse(courseId) {
  return request(`/api/v1/admin/courses/${courseId}`, {
    method: "DELETE",
  });
}

export async function getAdminCourseModules(courseId, filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/admin/courses/${courseId}/modules${query ? `?${query}` : ""}`);
}

export async function createAdminCourseModule(courseId, payload) {
  return request(`/api/v1/admin/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminCourseModuleDetail(moduleId) {
  return request(`/api/v1/admin/course-modules/${moduleId}`);
}

export async function updateAdminCourseModule(moduleId, payload) {
  return request(`/api/v1/admin/course-modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCourseModule(moduleId) {
  return request(`/api/v1/admin/course-modules/${moduleId}`, {
    method: "DELETE",
  });
}

export async function getAdminCourseLessons(moduleId, filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/admin/course-modules/${moduleId}/lessons${query ? `?${query}` : ""}`);
}

export async function createAdminCourseLesson(moduleId, payload) {
  return request(`/api/v1/admin/course-modules/${moduleId}/lessons`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminCourseLessonDetail(lessonId) {
  return request(`/api/v1/admin/course-lessons/${lessonId}`);
}

export async function updateAdminCourseLesson(lessonId, payload) {
  return request(`/api/v1/admin/course-lessons/${lessonId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminCourseLesson(lessonId) {
  return request(`/api/v1/admin/course-lessons/${lessonId}`, {
    method: "DELETE",
  });
}


export async function getAdminEnrollments(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/admin/enrollments${query ? `?${query}` : ""}`);
}

export async function getAdminEnrollmentDetail(enrollmentId) {
  return request(`/api/v1/admin/enrollments/${enrollmentId}`);
}

export async function createAdminEnrollment(payload) {
  return request("/api/v1/admin/enrollments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createAdminGroupEnrollments(payload) {
  return request("/api/v1/admin/enrollments/group", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminEnrollment(enrollmentId, payload) {
  return request(`/api/v1/admin/enrollments/${enrollmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminEnrollment(enrollmentId) {
  return request(`/api/v1/admin/enrollments/${enrollmentId}`, {
    method: "DELETE",
  });
}


export async function getPublicCourses(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || `${value}`.trim() === "") {
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();

  return request(`/api/v1/public/courses${query ? `?${query}` : ""}`);
}

export async function getPublicCourseDetail(slug) {
  return request(`/api/v1/public/courses/${slug}`);
}