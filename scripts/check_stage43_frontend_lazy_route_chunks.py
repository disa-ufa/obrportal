from pathlib import Path

ROOT = Path.cwd()
ADMIN_RENDERER = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
PUBLIC_ROUTES = ROOT / "frontend" / "src" / "routes" / "PublicRoutes.jsx"
DIST_ASSETS = ROOT / "frontend" / "dist" / "assets"

MAIN_INDEX_LIMIT_BYTES = 200 * 1024

ADMIN_DYNAMIC_IMPORTS = [
    'import("../pages/AuditPage")',
    'import("../pages/DashboardPage")',
    'import("../pages/AdminCoursesPage")',
    'import("../pages/AdminEnrollmentsPage")',
    'import("../pages/DocumentsPage")',
    'import("../pages/GroupsPage")',
    'import("../pages/OrganizationsPage")',
    'import("../pages/PermissionsPage")',
    'import("../pages/RolesPage")',
    'import("../pages/UsersPage")',
]

PUBLIC_DYNAMIC_IMPORTS = [
    'import("../pages/AccountPage")',
    'import("../pages/AuthPage")',
    'import("../pages/CatalogPage")',
    'import("../pages/ContactsPage")',
    'import("../pages/FaqPage")',
    'import("../pages/HomePage")',
    'import("../pages/NotFoundPage")',
    'import("../pages/OfferPage")',
    'import("../pages/OrganizationInfoPage")',
    'import("../pages/OrganizationCabinetPage")',
    'import("../pages/PrivacyPage")',
    'import("../pages/RegisterPage")',
    'import("../pages/VerifyDocumentPage")',
    'import("./PublicRouteComponents")',
]

EXPECTED_CHUNK_PREFIXES = [
    "AccountPage-",
    "AdminCoursesPage-",
    "AdminEnrollmentsPage-",
    "AuditPage-",
    "CatalogPage-",
    "DashboardPage-",
    "DocumentsPage-",
    "GroupsPage-",
    "HomePage-",
    "OrganizationCabinetPage-",
    "OrganizationsPage-",
    "PublicRouteComponents-",
    "UsersPage-",
]


def read_text(path):
    if not path.exists():
        raise SystemExit(f"Required file is missing: {path}")

    return path.read_text(encoding="utf-8")


def assert_contains(text, fragments, label):
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        joined = "\n - ".join(missing)
        raise SystemExit(f"{label} is missing dynamic import fragments:\n - {joined}")


def assert_no_static_page_imports(text, label):
    offenders = []

    for line in text.splitlines():
        stripped = line.strip()

        if stripped.startswith("import {") and "../pages/" in stripped:
            offenders.append(stripped)

    if offenders:
        joined = "\n - ".join(offenders)
        raise SystemExit(f"{label} still has static page imports:\n - {joined}")


def find_main_index_bundle():
    if not DIST_ASSETS.exists():
        raise SystemExit(
            f"Build assets directory is missing: {DIST_ASSETS}. Run frontend build first."
        )

    candidates = [
        path
        for path in DIST_ASSETS.glob("index-*.js")
        if path.is_file()
    ]

    if not candidates:
        raise SystemExit("Main index JS bundle was not found in frontend/dist/assets.")

    return max(candidates, key=lambda path: path.stat().st_size)


def assert_expected_chunks():
    filenames = {
        path.name
        for path in DIST_ASSETS.glob("*.js")
        if path.is_file()
    }

    missing = []

    for prefix in EXPECTED_CHUNK_PREFIXES:
        if not any(name.startswith(prefix) for name in filenames):
            missing.append(prefix)

    if missing:
        joined = "\n - ".join(missing)
        raise SystemExit(f"Expected lazy route chunks are missing:\n - {joined}")

    return filenames


admin_text = read_text(ADMIN_RENDERER)
public_text = read_text(PUBLIC_ROUTES)

assert_contains(admin_text, ADMIN_DYNAMIC_IMPORTS, "AdminPageRenderer.jsx")
assert_contains(public_text, PUBLIC_DYNAMIC_IMPORTS, "PublicRoutes.jsx")

assert_no_static_page_imports(admin_text, "AdminPageRenderer.jsx")
assert_no_static_page_imports(public_text, "PublicRoutes.jsx")

if "Suspense" not in admin_text or "lazyNamed" not in admin_text:
    raise SystemExit("AdminPageRenderer.jsx must use Suspense and lazyNamed.")

if "Suspense" not in public_text or "lazyNamed" not in public_text:
    raise SystemExit("PublicRoutes.jsx must use Suspense and lazyNamed.")

main_index = find_main_index_bundle()
main_index_size = main_index.stat().st_size

if main_index_size > MAIN_INDEX_LIMIT_BYTES:
    raise SystemExit(
        "Main index bundle is too large after route splitting: "
        f"{main_index.name} = {main_index_size / 1024:.2f} KiB, "
        f"limit = {MAIN_INDEX_LIMIT_BYTES / 1024:.2f} KiB."
    )

filenames = assert_expected_chunks()

print("Stage 43 frontend lazy route chunk guard passed:")
print(f" - main index bundle: {main_index.name} = {main_index_size / 1024:.2f} KiB")
print(f" - checked chunk count: {len(filenames)}")
print(" - admin/public route renderers use lazy dynamic imports")
