# Stage 42 — Frontend bundle optimization audit

Status: draft
Branch: stage42-frontend-bundle-optimization-audit
Baseline commit: 068146e
Previous stage: v0.1.0-stage41-admin-incremental-refresh-final-audit-complete

## Goal

This document records the initial frontend bundle optimization audit before code-splitting changes.

## Current build signal

- Frontend production build is green.
- Vite/Rolldown reports a non-blocking warning because the main index bundle is larger than 500 kB after minification.
- Stage 42 should reduce the main bundle or document a safe optimization path.

## Package overview

- Package name: `obrportal-frontend`
- Package version: `0.1.0-stage31-dev`

## Dist assets by size

| Asset | Bytes | KiB |
| --- | ---: | ---: |
| `dist/assets/index-Dc5O-HWH.js` | 712582 | 695.88 |
| `dist/assets/vendor-react-fClO6AZa.js` | 182155 | 177.89 |
| `dist/assets/vendor-DAnPq8KD.js` | 48654 | 47.51 |
| `dist/assets/index-CuHdPJUI.css` | 34988 | 34.17 |
| `dist/assets/vendor-qr-BwMgcWrR.js` | 16176 | 15.8 |
| `dist/index.html` | 741 | 0.72 |
| `dist/assets/rolldown-runtime-jpDsebLB.js` | 567 | 0.55 |

## Page modules

| File | Lines | Static imports |
| --- | ---: | ---: |
| `frontend/src/pages/AccountPage.jsx` | 2176 | 8 |
| `frontend/src/pages/AdminCoursesPage.jsx` | 2534 | 22 |
| `frontend/src/pages/AdminEnrollmentsPage.jsx` | 2577 | 14 |
| `frontend/src/pages/AdminNotFoundPage.jsx` | 52 | 4 |
| `frontend/src/pages/AuditPage.jsx` | 1118 | 17 |
| `frontend/src/pages/AuthPage.jsx` | 192 | 6 |
| `frontend/src/pages/CatalogPage.jsx` | 721 | 3 |
| `frontend/src/pages/ContactsPage.jsx` | 105 | 0 |
| `frontend/src/pages/CourseDetailPage.jsx` | 1075 | 5 |
| `frontend/src/pages/DashboardPage.jsx` | 1348 | 10 |
| `frontend/src/pages/DocumentsPage.jsx` | 3146 | 14 |
| `frontend/src/pages/FaqPage.jsx` | 104 | 0 |
| `frontend/src/pages/GroupsPage.jsx` | 1609 | 23 |
| `frontend/src/pages/HomePage.jsx` | 165 | 3 |
| `frontend/src/pages/NotFoundPage.jsx` | 42 | 0 |
| `frontend/src/pages/OfferPage.jsx` | 134 | 0 |
| `frontend/src/pages/OrganizationCabinetPage.jsx` | 885 | 10 |
| `frontend/src/pages/OrganizationInfoPage.jsx` | 120 | 0 |
| `frontend/src/pages/OrganizationsPage.jsx` | 422 | 20 |
| `frontend/src/pages/PermissionsPage.jsx` | 389 | 17 |
| `frontend/src/pages/PrivacyPage.jsx` | 121 | 0 |
| `frontend/src/pages/RegisterPage.jsx` | 258 | 5 |
| `frontend/src/pages/RolesPage.jsx` | 475 | 19 |
| `frontend/src/pages/UsersPage.jsx` | 505 | 20 |
| `frontend/src/pages/VerifyDocumentPage.jsx` | 975 | 5 |

## Key static imports

### `frontend/src/App.jsx`

| Line | Import |
| ---: | --- |
| 1 | `import { useEffect, useState } from "react";` |
| 2 | `import { Navigate } from "react-router-dom";` |
| 3 | `import { AppShell } from "./components/layout/AppShell";` |
| 4 | `import { PublicShell } from "./components/layout/PublicShell";` |
| 5 | `import {` |
| 12 | `import { AdminNotFoundPage } from "./pages/AdminNotFoundPage";` |
| 13 | `import { PublicRoutes } from "./routes/PublicRoutes";` |
| 14 | `import { AdminPageRenderer } from "./routes/AdminPageRenderer";` |
| 15 | `import { useAdminSelections } from "./hooks/useAdminSelections";` |
| 16 | `import { useAdminEntityActions } from "./hooks/useAdminEntityActions";` |
| 17 | `import { useAdminDetailActions } from "./hooks/useAdminDetailActions";` |
| 18 | `import { useAdminAuditActions } from "./hooks/useAdminAuditActions";` |
| 19 | `import { useSystemStatus } from "./hooks/useSystemStatus";` |
| 20 | `import { useAdminDataLoader } from "./hooks/useAdminDataLoader";` |
| 21 | `import { usePendingEnrollment } from "./hooks/usePendingEnrollment";` |
| 22 | `import { useAuthFlow } from "./hooks/useAuthFlow";` |
| 23 | `import { useAppNavigation } from "./hooks/useAppNavigation";` |
| 24 | `import { usePageMeta } from "./hooks/usePageMeta";` |
| 25 | `import { useAppRouteState } from "./hooks/useAppRouteState";` |

### `frontend/src/routes/AdminPageRenderer.jsx`

| Line | Import |
| ---: | --- |
| 1 | `import { AuditPage } from "../pages/AuditPage";` |
| 2 | `import { DashboardPage } from "../pages/DashboardPage";` |
| 3 | `import { AdminCoursesPage } from "../pages/AdminCoursesPage";` |
| 4 | `import { AdminEnrollmentsPage } from "../pages/AdminEnrollmentsPage";` |
| 5 | `import { DocumentsPage } from "../pages/DocumentsPage";` |
| 6 | `import { GroupsPage } from "../pages/GroupsPage";` |
| 7 | `import { OrganizationsPage } from "../pages/OrganizationsPage";` |
| 8 | `import { PermissionsPage } from "../pages/PermissionsPage";` |
| 9 | `import { RolesPage } from "../pages/RolesPage";` |
| 10 | `import { UsersPage } from "../pages/UsersPage";` |
| 11 | `import { getAdminPageFromPathname } from "../utils/adminRoutes";` |

### `frontend/src/routes/PublicPageRenderer.jsx`

_No imports found or file missing._

### `frontend/src/main.jsx`

| Line | Import |
| ---: | --- |
| 1 | `import React from "react";` |
| 2 | `import ReactDOM from "react-dom/client";` |
| 3 | `import { BrowserRouter } from "react-router-dom";` |
| 5 | `import App from "./App.jsx";` |
| 6 | `import "./styles/index.css";` |

### `frontend/vite.config.js`

| Line | Import |
| ---: | --- |
| 1 | `import { defineConfig } from 'vite'` |
| 2 | `import react from '@vitejs/plugin-react'` |

### `frontend/package.json`

_No imports found or file missing._

## Initial recommendation

- Prefer route/page-level code splitting first, because admin pages are numerous and currently likely contribute to the main app bundle.
- Keep `App.jsx` and routing shell stable.
- Avoid changing backend API contracts.
- Keep smoke coverage intact after any lazy-loading changes.

## Acceptance direction

- If safe, introduce dynamic imports for route page renderers or heavy admin pages.
- If smoke compatibility blocks code splitting, document the blocker and defer implementation.
