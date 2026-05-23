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


def main() -> None:
    require_contains(
        "frontend/src/components/layout/AppShell.jsx",
        [
            'import { Link } from "react-router-dom";',
            'import { StatusBadge } from "../ui/StatusBadge";',
            'import { ADMIN_ROUTE_ITEMS } from "../../utils/adminRoutes";',
            "export function AppShell({",
            "health,",
            "ready,",
            "user,",
            "isAdmin,",
            "authBadgeText,",
            "authBadgeTone,",
            "currentPage,",
            "onPageChange,",
            "counts,",
            "adminLoading,",
            "adminDataLoadedAt,",
            "children,",
            "function getCount(key)",
            "const countMap = {",
            "users: counts?.users,",
            "organizations: counts?.organizations,",
            "groups: counts?.groups,",
            "courses: counts?.courses,",
            "enrollments: counts?.enrollments,",
            "documents: counts?.documents,",
            "roles: counts?.roles,",
            "permissions: counts?.permissions,",
            "audit: counts?.auditEvents,",
            '"audit-events": counts?.auditEvents,',
            "function formatCountBadge(value)",
            'return "999+";',
            "ADMIN_ROUTE_ITEMS.find((item) => item.key === currentPage)?.label",
            "const adminApiStatus = adminLoading",
            "const adminApiTone = adminLoading",
            'health: {health?.status || "unknown"}',
            'ready: {ready?.status || "unknown"}',
            "{ADMIN_ROUTE_ITEMS.map((item) => {",
            "const count = getCount(item.key);",
            "const isActive = currentPage === item.key;",
            "to={item.path}",
            'aria-current={isActive ? "page" : undefined}',
            "onClick={() => onPageChange(item.key)}",
            "formatCountBadge(count)",
            "user.roles.map((role) => role.code).join(\", \")",
            "adminDataLoadedAt",
        ],
    )

    require_contains(
        "frontend/src/components/layout/PublicShell.jsx",
        [
            'import { userHasRole } from "../../utils/adminState";',
            "const PUBLIC_NAV_ITEMS = [",
            'key: "home"',
            'key: "catalog"',
            'key: "organization-info"',
            'key: "verify-document"',
            'key: "contacts"',
            'key: "faq"',
            "const FOOTER_LINKS = [",
            'key: "privacy"',
            'key: "offer"',
            "function NavButton({ active, children, onClick })",
            "export function PublicShell({",
            "user,",
            "isAdmin,",
            "currentPage,",
            "onPageChange,",
            "children,",
            'const isOrgRepresentative = userHasRole(user, "org_rep");',
            "PUBLIC_NAV_ITEMS.map((item)",
            "active={currentPage === item.key}",
            "onClick={() => onPageChange(item.key)}",
            'active={currentPage === "dashboard"}',
            'onClick={() => onPageChange("dashboard")}',
            'active={currentPage === "organization"}',
            'onClick={() => onPageChange("organization")}',
            'active={currentPage === "account"}',
            'onClick={() => onPageChange("account")}',
            'active={currentPage === "login"}',
            'onClick={() => onPageChange("login")}',
            'active={currentPage === "register"}',
            'onClick={() => onPageChange("register")}',
            "FOOTER_LINKS.map((item)",
        ],
    )

    require_contains(
        "frontend/src/hooks/useSystemStatus.js",
        [
            'import { useState } from "react";',
            'import { getHealth, getReady } from "../api/client";',
            "export function useSystemStatus()",
            "const [health, setHealth] = useState(null);",
            "const [ready, setReady] = useState(null);",
            "async function loadSystemStatus()",
            "const [healthData, readyData] = await Promise.all([",
            "getHealth()",
            "getReady()",
            "setHealth(healthData);",
            "setReady(readyData);",
            'setHealth({ status: "error" });',
            'setReady({ status: "error" });',
            "return {",
            "health,",
            "ready,",
            "loadSystemStatus,",
        ],
    )

    require_contains(
        "frontend/src/hooks/useAppRouteState.js",
        [
            "getAdminPageFromPathname,",
            "isAdminPathname,",
            'import { getPublicPageFromPathname } from "../utils/publicRoutes";',
            'import { userHasRole } from "../utils/adminState";',
            "export function useAppRouteState({",
            "const isAdminRoute = isAdminPathname(pathname);",
            "const adminRoutePage = getAdminPageFromPathname(pathname);",
            "const isUnknownAdminRoute = isAdminRoute && !adminRoutePage;",
            "const activeAdminPage = adminRoutePage || currentPage;",
            "const currentPublicPage = getPublicPageFromPathname(pathname);",
            'const isAdmin = userHasRole(user, "admin");',
            "const authBadgeText = initializingAuth",
            "const authBadgeTone = initializingAuth",
            "return {",
            "isAdminRoute,",
            "adminRoutePage,",
            "isUnknownAdminRoute,",
            "activeAdminPage,",
            "currentPublicPage,",
            "isAdmin,",
            "authBadgeText,",
            "authBadgeTone,",
        ],
    )

    require_contains(
        "frontend/src/hooks/usePageMeta.js",
        [
            'import { useEffect } from "react";',
            'import { useLocation } from "react-router-dom";',
            'import { isAdminPathname } from "../utils/adminRoutes";',
            "buildPublicMeta,",
            "ensureMetaDescriptionTag,",
            "const ADMIN_META = {",
            "export function usePageMeta()",
            "const location = useLocation();",
            "useEffect(() => {",
            "const meta = isAdminPathname(location.pathname)",
            "? ADMIN_META",
            ": buildPublicMeta(location.pathname);",
            "document.title = meta.title;",
            "const metaDescriptionTag = ensureMetaDescriptionTag();",
            'metaDescriptionTag.setAttribute("content", meta.description);',
            "}, [location.pathname]);",
            "return location;",
        ],
    )

    require_contains(
        "frontend/src/utils/adminState.js",
        [
            "export const EMPTY_ADMIN_DATA = {",
            "users: [],",
            "organizations: [],",
            "groups: [],",
            "courses: [],",
            "enrollments: [],",
            "documents: [],",
            "roles: [],",
            "permissions: [],",
            "auditEvents: [],",
            "export function userHasRole(user, roleCode)",
            "user?.roles?.some((role) => role.code === roleCode) || false",
            "export function getNowLabel()",
            'return new Date().toLocaleString("ru-RU");',
            "export function sortOrganizations(organizations)",
            'left.name.localeCompare(right.name, "ru-RU")',
            "export function sortGroups(groups)",
            "export function sortUsers(users)",
            'left.email.localeCompare(right.email, "ru-RU")',
            "export function sortRoles(roles)",
            'left.code.localeCompare(right.code, "ru-RU")',
        ],
    )

    require_contains(
        "frontend/src/utils/adminCollectionState.js",
        [
            "function getCollection(current, collectionKey)",
            "const collection = current?.[collectionKey];",
            "return Array.isArray(collection) ? collection : [];",
            "function applyOptionalSort(items, sortItems)",
            'return typeof sortItems === "function" ? sortItems(items) : items;',
            "export function upsertAdminCollectionItem(setAdminData, collectionKey, item, sortItems)",
            "setAdminData((current) => {",
            "currentItems.filter((currentItem) => currentItem.id !== item.id)",
            "[collectionKey]: applyOptionalSort(nextItems, sortItems)",
            "export function replaceAdminCollectionItem(setAdminData, collectionKey, item, sortItems)",
            "currentItems.map((currentItem) =>",
            "currentItem.id === item.id ? item : currentItem",
            "export function removeAdminCollectionItem(setAdminData, collectionKey, itemId, sortItems)",
            "currentItems.filter((currentItem) => currentItem.id !== itemId)",
        ],
    )

    require_contains(
        "frontend/src/utils/apiErrors.js",
        [
            "export const COMMON_API_ERROR_MESSAGES = {",
            "fallback:",
            "notAuthenticated:",
            "accessDenied:",
            "notFound:",
            "conflict:",
            "invalidRequest:",
            "serverError:",
            "export function getApiErrorMessage(err)",
            "const rawMessage = err?.detail || err?.message || \"\";",
            "if (Array.isArray(rawMessage))",
            ".map((item) => item?.msg || item?.message || JSON.stringify(item))",
            'join("; ");',
            'if (rawMessage && typeof rawMessage === "object")',
            "return rawMessage.detail || rawMessage.message || JSON.stringify(rawMessage);",
            "export function formatApiError(err, fallback = COMMON_API_ERROR_MESSAGES.fallback)",
            "const status = err?.status ? `${err.status}` : \"\";",
            "const message = getApiErrorMessage(err);",
            'if (status === "401")',
            'else if (status === "403")',
            'else if (status === "404")',
            'else if (status === "409")',
            'else if (status === "422")',
            "else if (Number(status) >= 500)",
            "return `${status} ${readableMessage}`.trim();",
        ],
    )

    require_contains(
        "frontend/src/utils/dateFormat.js",
        [
            "export function formatRuDateTime(value, fallback = \"-\")",
            "const date = new Date(value);",
            "if (Number.isNaN(date.getTime()))",
            'return new Intl.DateTimeFormat("ru-RU", {',
            'dateStyle: "short"',
            'timeStyle: "short"',
            "export function formatRuDateTimeDash(value)",
            "return formatRuDateTime(value,",
            "export function formatRuDateTimeNative(value, fallback = \"-\")",
            'return date.toLocaleString("ru-RU");',
            "export function formatRuDateTimeNativeUnsafe(value, fallback = \"-\")",
            "return new Date(value).toLocaleString(\"ru-RU\");",
            "export function formatRuLongDate(value, fallback = \"-\")",
            'dateStyle: "long"',
        ],
    )

    require_contains(
        "scripts/check_frontend_smoke_coverage.py",
        [
            "REQUIRED_FRONTEND_GUARD_SCRIPTS",
            "REQUIRED_FRONTEND_SMOKE_SCRIPTS",
            "def get_frontend_smoke_guard_diagnostics",
            "missingScriptFiles",
            "coveredFrontendFilesTotal",
            "frontend smoke/guard diagnostics passed",
        ],
    )

    require_contains(
        "scripts/check_backend_smoke_coverage.py",
        [
            "REQUIRED_BACKEND_GUARD_SCRIPTS",
            "REQUIRED_BACKEND_SMOKE_SCRIPTS",
            "def get_backend_smoke_guard_diagnostics",
            "missingScriptFiles",
            "explicitHintHitsTotal",
            "backend smoke/guard diagnostics passed",
        ],
    )

    require_contains(
        "scripts/frontend_guard.py",
        [
            "def get_frontend_guard_diagnostics",
            "patternsTotal",
            "frontendRootExists",
            "not enough protected patterns configured",
            "frontend guard diagnostics passed",
        ],
    )

    require_contains(
        "scripts/check_ci_local_gate.py",
        [
            "REQUIRED_CI_SECTIONS",
            "REQUIRED_CI_COMMANDS",
            "REQUIRED_SEED_COMMANDS",
            "def get_ci_local_gate_diagnostics",
            "missingCommands",
            "missingSeedCommands",
            "ci/local gate diagnostics passed",
        ],
    )

    require_contains(
        ".github/workflows/ci.yml",
        [
            "Run CI/local gate consistency guard",
            "python scripts/check_ci_local_gate.py",
        ],
    )

    require_contains(
        "scripts/check_release_readiness.py",
        [
            "REQUIRED_ENV_KEYS",
            "REQUIRED_COMPOSE_SECTIONS",
            "REQUIRED_RELEASE_COMMANDS",
            "REQUIRED_SUPPORT_FILES",
            "def get_release_readiness_diagnostics",
            "missingEnvKeys",
            "missingComposeSections",
            "missingReleaseCommands",
            "release readiness diagnostics passed",
        ],
    )

    require_contains(
        ".github/workflows/ci.yml",
        [
            "Run release readiness guard",
            "python scripts/check_release_readiness.py",
        ],
    )

    require_contains(
        "scripts/check_ci_local_gate.py",
        [
            "python scripts/check_release_readiness.py",
        ],
    )

    require_contains(
        "scripts/check_release_versioning.py",
        [
            "REQUIRED_VERSION",
            "REQUIRED_CHANGELOG_SECTIONS",
            "REQUIRED_HANDOFF_SECTIONS",
            "REQUIRED_HANDOFF_COMMANDS",
            "def get_release_versioning_diagnostics",
            "missingChangelogSections",
            "missingHandoffSections",
            "release versioning diagnostics passed",
        ],
    )

    require_contains(
        ".github/workflows/ci.yml",
        [
            "Run release versioning guard",
            "python scripts/check_release_versioning.py",
        ],
    )

    require_contains(
        "scripts/check_ci_local_gate.py",
        [
            "python scripts/check_release_versioning.py",
        ],
    )

    require_contains(
        "scripts/check_release_readiness.py",
        [
            "python scripts/check_release_versioning.py",
            "scripts/check_release_versioning.py",
        ],
    )

    require_contains(
        "scripts/check_release_candidate.py",
        [
            "REQUIRED_RC_TAG",
            "REQUIRED_RC_CHECKLIST_SECTIONS",
            "REQUIRED_RC_COMMANDS",
            "REQUIRED_CI_COMMANDS",
            "def get_release_candidate_diagnostics",
            "missingCandidateSections",
            "missingCandidateCommands",
            "release candidate diagnostics passed",
        ],
    )

    require_contains(
        ".github/workflows/ci.yml",
        [
            "Run release candidate guard",
            "python scripts/check_release_candidate.py",
        ],
    )

    require_contains(
        "docs/release-candidate-checklist.md",
        [
            "# Release candidate checklist",
            "## Tag readiness",
            "## Post-release verification",
            "## Rollback readiness",
            "git tag -a v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_release_tag.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_PUBLICATION_SECTIONS",
            "REQUIRED_PUBLICATION_COMMANDS",
            "REQUIRED_CI_COMMANDS",
            "def get_release_tag_diagnostics",
            "missingPublicationSections",
            "missingPublicationCommands",
            "release tag diagnostics passed",
        ],
    )

    require_contains(
        ".github/workflows/ci.yml",
        [
            "Run release tag guard",
            "python scripts/check_release_tag.py",
        ],
    )

    require_contains(
        "docs/release-publication-checklist.md",
        [
            "# Release publication checklist",
            "## Final publication order",
            "## Release notes",
            "## Post-release smoke",
            "## Rollback checkpoint",
            "git tag -a v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_deployment_plan.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "def get_production_deployment_plan_diagnostics",
            "production deployment plan diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-deployment-plan.md",
        [
            "# Production deployment plan",
            "## Release baseline",
            "## Deployment order",
            "## Post-deployment smoke",
            "## Rollback order",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_environment_template.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_VARIABLES",
            "REQUIRED_MARKERS",
            "def get_production_environment_template_diagnostics",
            "production environment template diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-environment-template.md",
        [
            "# Production environment template",
            "## Release baseline",
            "## Application settings",
            "## PostgreSQL",
            "## Object storage",
            "## Production environment acceptance checklist",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_server_checklist.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "def get_production_server_checklist_diagnostics",
            "production server checklist diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-server-checklist.md",
        [
            "# Production server checklist",
            "## Release baseline",
            "## Deployment commands",
            "## Rollback commands",
            "## Production acceptance criteria",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_reverse_proxy_checklist.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "def get_production_reverse_proxy_checklist_diagnostics",
            "production reverse proxy checklist diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-reverse-proxy-checklist.md",
        [
            "# Production reverse proxy checklist",
            "## Release baseline",
            "## HTTPS checklist",
            "## Backend routing requirements",
            "## Rollback checklist",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_backup_monitoring_checklist.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "def get_production_backup_monitoring_checklist_diagnostics",
            "production backup monitoring checklist diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-backup-monitoring-checklist.md",
        [
            "# Production backup monitoring checklist",
            "## Release baseline",
            "## PostgreSQL backup commands",
            "## Monitoring checklist",
            "## Incident response checklist",
            "## Rollback readiness checklist",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_deployment_runbook.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "REQUIRED_SOURCE_DOCUMENTS",
            "def get_production_deployment_runbook_diagnostics",
            "production deployment runbook diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-deployment-runbook.md",
        [
            "# Production deployment runbook",
            "## Release baseline",
            "## Source documents",
            "## Local pre-deployment gate",
            "## Deployment order",
            "## Rollback order",
            "## Final acceptance criteria",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_rollout_inventory.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_STAGE7_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_TABLE_ITEMS",
            "REQUIRED_SERVICES",
            "REQUIRED_PORTS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "def get_production_rollout_inventory_diagnostics",
            "production rollout inventory diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-rollout-inventory.md",
        [
            "# Production rollout inventory",
            "## Release baseline",
            "## Deployment target",
            "## Domain inventory",
            "## Required production services",
            "## Required server ports",
            "## Rollout acceptance criteria",
            "v0.1.0-stage6",
        ],
    )

    require_contains(
        "scripts/check_production_server_facts.py",
        [
            "REQUIRED_RELEASE_TAG",
            "REQUIRED_RELEASE_COMMIT",
            "REQUIRED_STAGE7_COMMIT",
            "REQUIRED_STAGE8_INVENTORY_COMMIT",
            "REQUIRED_SECTIONS",
            "REQUIRED_TABLE_ITEMS",
            "REQUIRED_PORTS",
            "REQUIRED_COMMANDS",
            "REQUIRED_MARKERS",
            "def get_production_server_facts_diagnostics",
            "production server facts diagnostics passed",
        ],
    )

    require_contains(
        "docs/production-server-facts.md",
        [
            "# Production server facts",
            "## Release baseline",
            "## Server identity",
            "## Deployment paths",
            "## Domain and HTTPS facts",
            "## Reverse proxy facts",
            "## Production acceptance criteria",
            "v0.1.0-stage6",
        ],
    )

    print("Frontend core behavior smoke passed")


if __name__ == "__main__":
    main()
