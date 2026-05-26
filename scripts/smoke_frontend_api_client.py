from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_occurs(relative_path: str, fragment: str, minimum: int) -> None:
    text = read_text(relative_path)
    count = text.count(fragment)

    if count < minimum:
        print(f"{relative_path} has too few occurrences of required fragment:")
        print(f" - fragment: {fragment}")
        print(f" - expected at least: {minimum}")
        print(f" - actual: {count}")
        raise SystemExit(1)


def main() -> None:
    relative_path = "frontend/src/api/client.js"

    require_contains(
        relative_path,
        [
            "const RAW_API_BASE_URL = (",
            "import.meta.env.VITE_API_BASE_URL ??",
            "import.meta.env.VITE_API_URL ??",
            'import.meta.env.PROD ? "" : "http://localhost:8000"',
            'const API_BASE_URL = `${RAW_API_BASE_URL || ""}`.trim().replace(/\\/+$/, "");',
            "function buildApiUrl(path)",
            'throw new Error(`API path must start with "/": ${path}`);',
            "return API_BASE_URL ? `${API_BASE_URL}${path}` : path;",
            'export function getStoredToken()',
            'return localStorage.getItem("obrportal_access_token");',
            'export function storeToken(token)',
            'localStorage.setItem("obrportal_access_token", token);',
            'export function clearToken()',
            'localStorage.removeItem("obrportal_access_token");',
        ],
    )

    require_contains(
        relative_path,
        [
            "async function request(path, options = {})",
            "const token = getStoredToken();",
            'const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;',
            '"Accept": "application/json"',
            '"Content-Type": "application/json"',
            '"Authorization": `Bearer ${token}`',
            "...(options.headers || {}),",
            "const response = await fetch(buildApiUrl(path), {",
            "...options,",
            "headers,",
            "const text = await response.text();",
            "const data = text ? JSON.parse(text) : null;",
            "if (!response.ok)",
            "const message = data?.detail || `HTTP ${response.status}`;",
            "const error = new Error(typeof message === \"string\" ? message : JSON.stringify(message));",
            "error.status = response.status;",
            "error.payload = data;",
            "throw error;",
            "return data;",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function login(email, password)",
            'return request("/api/v1/auth/register",',
            "export async function registerUser(payload)",
            "export async function getCurrentUser()",
            'return request("/api/v1/auth/me");',
            "export async function checkAdminRbac()",
            'return request("/api/v1/admin/rbac-check");',
            "export async function getHealth()",
            'return request("/health");',
            "export async function getReady()",
            'return request("/api/v1/ready");',
            "storeToken(data.access_token);",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAccountSummary()",
            'return request("/api/v1/account/summary");',
            "export async function getAccountCourses()",
            'return request("/api/v1/account/courses");',
            "export async function enrollAccountCourse(courseId)",
            "return request(`/api/v1/account/courses/${courseId}/enroll`,",
            "export async function startAccountCourse(enrollmentId)",
            "return request(`/api/v1/account/courses/${enrollmentId}/start`,",
            "export async function completeAccountCourse(enrollmentId)",
            "return request(`/api/v1/account/courses/${enrollmentId}/complete`,",
            "export async function getAccountDocuments()",
            'return request("/api/v1/account/documents");',
        ],
    )

    require_contains(
        relative_path,
        [
            "function extractDownloadFilename(response, fallback = \"document.bin\")",
            'const disposition = response.headers.get("Content-Disposition") || "";',
            "const utf8Match = disposition.match(/filename\\*=UTF-8''([^;]+)/i);",
            "return decodeURIComponent(utf8Match[1]);",
            'const plainMatch = disposition.match(/filename="([^"]+)"/i) || disposition.match(/filename=([^;]+)/i);',
            'return plainMatch[1].trim().replace(/^"|"$/g, "");',
            "function normalizeDownloadedFilename(filename, blob)",
            'if (blob?.type === "application/pdf" && !safeFilename.toLowerCase().endsWith(".pdf"))',
            'return safeFilename.replace(/\\.[^./\\\\]+$/, "") + ".pdf";',
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function downloadAccountDocument(documentId)",
            "export async function downloadAdminDocument(documentId)",
            "const token = getStoredToken();",
            '"Accept": "application/pdf, application/octet-stream"',
            "const text = await response.text();",
            "try {",
            "data = text ? JSON.parse(text) : null;",
            "const blob = await response.blob();",
            "const objectUrl = window.URL.createObjectURL(blob);",
            'const link = document.createElement("a");',
            "link.href = objectUrl;",
            "link.download = filename;",
            "document.body.appendChild(link);",
            "link.click();",
            "link.remove();",
            "window.URL.revokeObjectURL(objectUrl);",
            "extractDownloadFilename(response, `document-${documentId}.bin`)",
            "extractDownloadFilename(response, `admin-document-${documentId}.bin`)",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function verifyPublicDocument(number)",
            "const query = new URLSearchParams({ number });",
            "return request(`/api/v1/public/documents/verify?${query.toString()}`);",
            "export async function getPublicCourses(filters = {})",
            "return request(`/api/v1/public/courses${query ? `?${query}` : \"\"}`);",
            "export async function getPublicCourseDetail(slug)",
            "return request(`/api/v1/public/courses/${slug}`);",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminUsers()",
            'return request("/api/v1/admin/users");',
            "export async function getAdminUserDetail(userId)",
            "return request(`/api/v1/admin/users/${userId}`);",
            "export async function createAdminUser(payload)",
            'return request("/api/v1/admin/users",',
            "export async function updateAdminUser(userId, payload)",
            "return request(`/api/v1/admin/users/${userId}`,",
            "export async function resetAdminUserPassword(userId, password)",
            "return request(`/api/v1/admin/users/${userId}/password`,",
            "body: JSON.stringify({ password }),",
            "export async function activateAdminUser(userId)",
            "return request(`/api/v1/admin/users/${userId}/activate`,",
            "export async function deactivateAdminUser(userId)",
            "return request(`/api/v1/admin/users/${userId}/deactivate`,",
            "export async function assignAdminUserRole(userId, payload)",
            "return request(`/api/v1/admin/users/${userId}/roles`,",
            "export async function removeAdminUserRole(userId, userRoleId)",
            "return request(`/api/v1/admin/users/${userId}/roles/${userRoleId}`,",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminOrganizations()",
            'return request("/api/v1/admin/organizations");',
            "export async function getAdminOrganizationDetail(organizationId)",
            "return request(`/api/v1/admin/organizations/${organizationId}`);",
            "export async function createAdminOrganization(payload)",
            'return request("/api/v1/admin/organizations",',
            "export async function updateAdminOrganization(organizationId, payload)",
            "return request(`/api/v1/admin/organizations/${organizationId}`,",
            "export async function deleteAdminOrganization(organizationId)",
            "return request(`/api/v1/admin/organizations/${organizationId}`,",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getOrgProfile()",
            'return request("/api/v1/org/profile");',
            "export async function updateOrgProfile(organizationId, payload)",
            "return request(`/api/v1/org/profile/${organizationId}`,",
            "export async function searchOrgUsers(filters = {})",
            "return request(`/api/v1/org/users${query ? `?${query}` : \"\"}`);",
            "export async function getOrgLearningGroups(filters = {})",
            "return request(`/api/v1/org/groups${query ? `?${query}` : \"\"}`);",
            "export async function getOrgLearningGroupDetail(groupId)",
            "return request(`/api/v1/org/groups/${groupId}`);",
            "export async function createOrgLearningGroup(payload)",
            'return request("/api/v1/org/groups",',
            "export async function updateOrgLearningGroup(groupId, payload)",
            "return request(`/api/v1/org/groups/${groupId}`,",
            "export async function deleteOrgLearningGroup(groupId)",
            "return request(`/api/v1/org/groups/${groupId}`,",
            "export async function getOrgLearningGroupMembers(groupId)",
            "return request(`/api/v1/org/groups/${groupId}/members`);",
            "export async function addOrgLearningGroupMember(groupId, payload)",
            "return request(`/api/v1/org/groups/${groupId}/members`,",
            "export async function removeOrgLearningGroupMember(groupId, userId)",
            "return request(`/api/v1/org/groups/${groupId}/members/${userId}`,",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function createOrgGroupEnrollments(payload)",
            'return request("/api/v1/org/enrollments/group",',
            "export async function getOrgGroupEnrollments(groupId)",
            "return request(`/api/v1/org/groups/${groupId}/enrollments`);",
            "export async function deleteOrgGroupEnrollment(groupId, enrollmentId)",
            "return request(`/api/v1/org/groups/${groupId}/enrollments/${enrollmentId}`,",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminRoles()",
            'return request("/api/v1/admin/roles");',
            "export async function getAdminRoleDetail(roleId)",
            "return request(`/api/v1/admin/roles/${roleId}`);",
            "export async function createAdminRole(payload)",
            'return request("/api/v1/admin/roles",',
            "export async function updateAdminRole(roleId, payload)",
            "return request(`/api/v1/admin/roles/${roleId}`,",
            "export async function deleteAdminRole(roleId)",
            "return request(`/api/v1/admin/roles/${roleId}`,",
            "export async function assignAdminRolePermission(roleId, payload)",
            "return request(`/api/v1/admin/roles/${roleId}/permissions`,",
            "export async function removeAdminRolePermission(roleId, rolePermissionId)",
            "return request(`/api/v1/admin/roles/${roleId}/permissions/${rolePermissionId}`,",
            "export async function getAdminPermissions()",
            'return request("/api/v1/admin/permissions");',
            "export async function getAdminPermissionDetail(permissionId)",
            "return request(`/api/v1/admin/permissions/${permissionId}`);",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminAuditEvents(filters = {})",
            "return request(`/api/v1/admin/audit-events${query ? `?${query}` : \"\"}`);",
            "export async function getAdminAuditEventDetail(auditEventId)",
            "return request(`/api/v1/admin/audit-events/${auditEventId}`);",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminDocuments(filters = {})",
            "return request(`/api/v1/admin/documents${query ? `?${query}` : \"\"}`);",
            "export async function createAdminDocument(payload)",
            'return request("/api/v1/admin/documents",',
            "body: payload,",
            "export async function updateAdminDocument(documentId, payload)",
            "return request(`/api/v1/admin/documents/${documentId}`,",
            "export async function deleteAdminDocument(documentId)",
            "return request(`/api/v1/admin/documents/${documentId}`,",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminCourses(filters = {})",
            "return request(`/api/v1/admin/courses${query ? `?${query}` : \"\"}`);",
            "export async function getAdminCourseDetail(courseId)",
            "return request(`/api/v1/admin/courses/${courseId}`);",
            "export async function createAdminCourse(payload)",
            'return request("/api/v1/admin/courses",',
            "export async function updateAdminCourse(courseId, payload)",
            "return request(`/api/v1/admin/courses/${courseId}`,",
            "export async function activateAdminCourse(courseId)",
            "return request(`/api/v1/admin/courses/${courseId}/activate`,",
            "export async function deactivateAdminCourse(courseId)",
            "return request(`/api/v1/admin/courses/${courseId}/deactivate`,",
            "export async function deleteAdminCourse(courseId)",
            "return request(`/api/v1/admin/courses/${courseId}`,",
        ],
    )

    require_contains(
        relative_path,
        [
            "export async function getAdminEnrollments(filters = {})",
            "return request(`/api/v1/admin/enrollments${query ? `?${query}` : \"\"}`);",
            "export async function getAdminEnrollmentDetail(enrollmentId)",
            "return request(`/api/v1/admin/enrollments/${enrollmentId}`);",
            "export async function createAdminEnrollment(payload)",
            'return request("/api/v1/admin/enrollments",',
            "export async function createAdminGroupEnrollments(payload)",
            'return request("/api/v1/admin/enrollments/group",',
            "export async function updateAdminEnrollment(enrollmentId, payload)",
            "return request(`/api/v1/admin/enrollments/${enrollmentId}`,",
            "export async function deleteAdminEnrollment(enrollmentId)",
            "return request(`/api/v1/admin/enrollments/${enrollmentId}`,",
        ],
    )

    require_occurs(relative_path, "Object.entries(filters).forEach(([key, value]) => {", 6)
    require_occurs(relative_path, "if (value === undefined || value === null || `${value}`.trim() === \"\")", 6)
    require_occurs(relative_path, "params.set(key, value);", 6)
    require_occurs(relative_path, "const query = params.toString();", 6)
    require_occurs(relative_path, "method: \"POST\"", 15)
    require_occurs(relative_path, "method: \"PATCH\"", 7)
    require_occurs(relative_path, "method: \"DELETE\"", 10)
    require_occurs(relative_path, "body: JSON.stringify(payload)", 15)

    print("Frontend API client behavior smoke passed")


if __name__ == "__main__":
    main()
