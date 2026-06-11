from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FILES = {
    "org_api": ROOT / "backend" / "app" / "api" / "v1" / "org.py",
    "client": ROOT / "frontend" / "src" / "api" / "client.js",
    "org_page": ROOT / "frontend" / "src" / "pages" / "OrganizationCabinetPage.jsx",
    "overview": ROOT / "frontend" / "src" / "components" / "organization" / "OrganizationLearningOverviewPanel.jsx",
}

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.20 organization learning overview guard failed: {message}")


for name, path in FILES.items():
    if not path.exists():
        fail(f"{name} file is missing: {path}")

texts = {name: path.read_text(encoding="utf-8") for name, path in FILES.items()}

for name in ("client", "org_page", "overview"):
    text = texts[name]
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

required = {
    "org_api": [
        '@router.get("/enrollments", response_model=list[OrgEnrollmentItem])',
        "async def list_org_enrollments(",
        'status_filter: str | None = Query(default=None, alias="status")',
        "allowed_organization_ids = await get_organization_scope_for_permission(",
        "ensure_organization_in_scope_or_404(",
        ".outerjoin(DocumentRecord, DocumentRecord.enrollment_id == Enrollment.id)",
        "return [build_org_enrollment_item(row) for row in result.all()]",
    ],
    "client": [
        "export async function getOrgEnrollments(filters = {})",
        'return request(`/api/v1/org/enrollments${query ? `?${query}` : ""}`);',
    ],
    "org_page": [
        "getOrgEnrollments,",
        "OrganizationLearningOverviewPanel",
        "const [organizationEnrollments, setOrganizationEnrollments] = useState([]);",
        "async function loadOrganizationEnrollments()",
        "const response = await getOrgEnrollments();",
        "setOrganizationEnrollments(Array.isArray(response) ? sortEnrollments(response) : []);",
        "setOrganizationEnrollments((current) => mergeUniqueEnrollments(current, result.created));",
        "<OrganizationLearningOverviewPanel",
        "setOrganizationEnrollmentsRefreshKey((current) => current + 1)",
    ],
    "overview": [
        "const STAGE82_ORGANIZATION_LEARNING_OVERVIEW =",
        '"stage82_20_organization_learning_overview"',
        "const ORGANIZATION_LEARNING_OVERVIEW_LABELS =",
        "function buildOrganizationLearningOverviewStats(enrollments = [])",
        "function buildOrganizationLearningOverviewGroups(enrollments = [])",
        "export function OrganizationLearningOverviewPanel({",
        'data-testid="organization-learning-overview"',
        "data-stage={STAGE82_ORGANIZATION_LEARNING_OVERVIEW}",
        'data-testid="organization-learning-overview-summary"',
        'data-testid="organization-learning-overview-groups"',
        'data-testid="organization-learning-overview-group"',
        'data-testid="organization-learning-overview-empty"',
    ],
}

for name, markers in required.items():
    text = texts[name]
    for marker in markers:
        if marker not in text:
            fail(f"{name} missing marker: {marker}")

print("stage 82.20 organization learning overview guard passed")
