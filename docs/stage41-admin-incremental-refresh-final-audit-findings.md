# Stage 41 — Admin incremental refresh final audit findings

Status: draft
Branch: stage41-admin-incremental-refresh-final-audit-cleanup
Base checkpoint: e2cb3d6
Previous stage: v0.1.0-stage40-admin-rbac-audit-incremental-refresh-complete

## Goal

This document records the final audit of admin incremental refresh architecture after stages 34-40.

## Summary

- Users, organizations, groups, courses, enrollments, documents, roles, permissions and audit sections have dedicated refresh paths.
- Full admin reload remains available as a dashboard/auth/bootstrap/fallback path.
- Section pages may still keep `onRefreshAdminData` as fallback wiring, but toolbar refresh should prefer section-only refresh where available.
- No blocking full admin reload regression is expected from the audit pattern scan.

## Pattern scan

| File | Line | Pattern | Code |
| --- | ---: | --- | --- |
| `frontend/src/App.jsx` | 62 | `loadAdminData` | `loadAdminData,` |
| `frontend/src/App.jsx` | 63 | `refreshAdminRoles` | `refreshAdminRoles,` |
| `frontend/src/App.jsx` | 64 | `refreshAdminPermissions` | `refreshAdminPermissions,` |
| `frontend/src/App.jsx` | 65 | `refreshAdminAuditEvents` | `refreshAdminAuditEvents,` |
| `frontend/src/App.jsx` | 66 | `refreshAdminDocuments` | `refreshAdminDocuments,` |
| `frontend/src/App.jsx` | 67 | `refreshAdminEnrollments` | `refreshAdminEnrollments,` |
| `frontend/src/App.jsx` | 68 | `refreshAdminCourses` | `refreshAdminCourses,` |
| `frontend/src/App.jsx` | 69 | `refreshAdminGroups` | `refreshAdminGroups,` |
| `frontend/src/App.jsx` | 70 | `refreshAdminOrganizations` | `refreshAdminOrganizations,` |
| `frontend/src/App.jsx` | 71 | `refreshAdminUsers` | `refreshAdminUsers,` |
| `frontend/src/App.jsx` | 150 | `loadAdminData` | `loadAdminData,` |
| `frontend/src/App.jsx` | 276 | `loadAdminData` | `loadAdminData,` |
| `frontend/src/App.jsx` | 277 | `refreshAdminRoles` | `refreshAdminRoles,` |
| `frontend/src/App.jsx` | 278 | `refreshAdminPermissions` | `refreshAdminPermissions,` |
| `frontend/src/App.jsx` | 279 | `refreshAdminAuditEvents` | `refreshAdminAuditEvents,` |
| `frontend/src/App.jsx` | 280 | `refreshAdminDocuments` | `refreshAdminDocuments,` |
| `frontend/src/App.jsx` | 281 | `refreshAdminEnrollments` | `refreshAdminEnrollments,` |
| `frontend/src/App.jsx` | 282 | `refreshAdminCourses` | `refreshAdminCourses,` |
| `frontend/src/App.jsx` | 283 | `refreshAdminGroups` | `refreshAdminGroups,` |
| `frontend/src/App.jsx` | 284 | `refreshAdminOrganizations` | `refreshAdminOrganizations,` |
| `frontend/src/App.jsx` | 285 | `refreshAdminUsers` | `refreshAdminUsers,` |
| `frontend/src/components/auth/CurrentUserCard.jsx` | 8 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/components/auth/CurrentUserCard.jsx` | 51 | `onRefreshAdminData` | `onClick={onRefreshAdminData}` |
| `frontend/src/hooks/useAdminDataLoader.js` | 183 | `loadAdminData` | `async function loadAdminData(options = {}) {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 230 | `refreshAdminRoles` | `async function refreshAdminRoles() {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 249 | `refreshAdminPermissions` | `async function refreshAdminPermissions() {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 268 | `refreshAdminAuditEvents` | `async function refreshAdminAuditEvents(auditFilters = {}) {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 290 | `refreshAdminDocuments` | `async function refreshAdminDocuments(documentsFilters = {}) {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 311 | `refreshAdminEnrollments` | `async function refreshAdminEnrollments(enrollmentsFilters = {}) {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 332 | `refreshAdminCourses` | `async function refreshAdminCourses(coursesFilters = {}) {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 351 | `refreshAdminGroups` | `async function refreshAdminGroups() {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 370 | `refreshAdminOrganizations` | `async function refreshAdminOrganizations() {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 389 | `refreshAdminUsers` | `async function refreshAdminUsers(usersFilters = {}, roles = []) {` |
| `frontend/src/hooks/useAdminDataLoader.js` | 409 | `loadAdminData` | `loadAdminData,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 410 | `refreshAdminRoles` | `refreshAdminRoles,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 411 | `refreshAdminPermissions` | `refreshAdminPermissions,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 412 | `refreshAdminAuditEvents` | `refreshAdminAuditEvents,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 413 | `refreshAdminDocuments` | `refreshAdminDocuments,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 414 | `refreshAdminEnrollments` | `refreshAdminEnrollments,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 415 | `refreshAdminCourses` | `refreshAdminCourses,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 416 | `refreshAdminGroups` | `refreshAdminGroups,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 417 | `refreshAdminOrganizations` | `refreshAdminOrganizations,` |
| `frontend/src/hooks/useAdminDataLoader.js` | 418 | `refreshAdminUsers` | `refreshAdminUsers,` |
| `frontend/src/hooks/useAuthFlow.js` | 36 | `loadAdminData` | `loadAdminData,` |
| `frontend/src/hooks/useAuthFlow.js` | 60 | `loadAdminData` | `await loadAdminData();` |
| `frontend/src/hooks/useAuthFlow.js` | 89 | `loadAdminData` | `await loadAdminData();` |
| `frontend/src/hooks/useAuthFlow.js` | 121 | `loadAdminData` | `await loadAdminData();` |
| `frontend/src/pages/DashboardPage.jsx` | 318 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/pages/DashboardPage.jsx` | 583 | `onRefreshAdminData` | `onRefreshAdminData={onRefreshAdminData}` |
| `frontend/src/pages/GroupsPage.jsx` | 1240 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/pages/GroupsPage.jsx` | 1372 | `onRefreshAdminData` | `onRefreshAdminData();` |
| `frontend/src/pages/OrganizationsPage.jsx` | 134 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/pages/OrganizationsPage.jsx` | 232 | `onRefreshAdminData` | `onRefreshAdminData();` |
| `frontend/src/pages/PermissionsPage.jsx` | 159 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/pages/PermissionsPage.jsx` | 260 | `onRefreshAdminData` | `onRefresh={onRefreshPermissions \|\| onRefreshAdminData}` |
| `frontend/src/pages/RolesPage.jsx` | 219 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/pages/RolesPage.jsx` | 320 | `onRefreshAdminData` | `onRefresh={onRefreshRoles \|\| onRefreshAdminData}` |
| `frontend/src/pages/UsersPage.jsx` | 136 | `onRefreshAdminData` | `onRefreshAdminData,` |
| `frontend/src/pages/UsersPage.jsx` | 232 | `onRefreshAdminData` | `onRefreshAdminData({ usersFilters: filters });` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 31 | `loadAdminData` | `loadAdminData,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 32 | `refreshAdminRoles` | `refreshAdminRoles,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 33 | `refreshAdminPermissions` | `refreshAdminPermissions,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 34 | `refreshAdminAuditEvents` | `refreshAdminAuditEvents,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 35 | `refreshAdminDocuments` | `refreshAdminDocuments,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 36 | `refreshAdminEnrollments` | `refreshAdminEnrollments,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 37 | `refreshAdminCourses` | `refreshAdminCourses,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 38 | `refreshAdminGroups` | `refreshAdminGroups,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 39 | `refreshAdminOrganizations` | `refreshAdminOrganizations,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 40 | `refreshAdminUsers` | `refreshAdminUsers,` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 94 | `refreshAdminCourses` | `return <AdminCoursesPage onRefreshCourses={refreshAdminCourses} />;` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 98 | `refreshAdminEnrollments` | `return <AdminEnrollmentsPage onRefreshEnrollments={refreshAdminEnrollments} />;` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 121 | `onRefreshAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 121 | `loadAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 122 | `refreshAdminUsers` | `onRefreshUsers={refreshAdminUsers}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 141 | `onRefreshAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 141 | `loadAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 142 | `refreshAdminOrganizations` | `onRefreshOrganizations={refreshAdminOrganizations}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 162 | `onRefreshAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 162 | `loadAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 163 | `refreshAdminGroups` | `onRefreshGroups={refreshAdminGroups}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 183 | `onRefreshAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 183 | `loadAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 184 | `refreshAdminRoles` | `onRefreshRoles={refreshAdminRoles}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 202 | `onRefreshAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 202 | `loadAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 203 | `refreshAdminPermissions` | `onRefreshPermissions={refreshAdminPermissions}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 209 | `refreshAdminDocuments` | `return <DocumentsPage onRefreshDocuments={refreshAdminDocuments} />;` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 224 | `refreshAdminAuditEvents` | `onRefreshAuditEvents={refreshAdminAuditEvents}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 245 | `onRefreshAdminData` | `onRefreshAdminData={loadAdminData}` |
| `frontend/src/routes/AdminPageRenderer.jsx` | 245 | `loadAdminData` | `onRefreshAdminData={loadAdminData}` |

## Expected remaining full reload paths

- `loadAdminData` in app/auth/bootstrap/dashboard contexts is intentional.
- `onRefreshAdminData` in admin section pages is acceptable only as a fallback when section-only refresh is unavailable.
- Dashboard refresh may continue to use full admin data load because dashboard is the aggregate admin entry point.

## Decision

No blocking cleanup item is identified by the final audit pattern scan.

