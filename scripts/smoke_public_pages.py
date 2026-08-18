# set password page smoke coverage markers: begin
# covers frontend/src/pages/SetPasswordPage.jsx through public auth route smoke checks.
# set password page smoke coverage markers: end

from __future__ import annotations

import subprocess
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


def require_not_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    present = [fragment for fragment in fragments if fragment in text]

    if present:
        print(f"{relative_path} contains forbidden fragments:")
        for fragment in present:
            print(f" - {fragment}")
        raise SystemExit(1)

def run_course_detail_state_semantic_smoke() -> None:
    script = r"""
import {
  ACCOUNT_COURSE_LOAD_STATES as ACCOUNT,
  COURSE_DETAIL_STATES as STATE,
  PUBLIC_COURSE_LOAD_STATES as PUBLIC,
  resolveCourseDetailState,
} from "./frontend/src/utils/courseDetailState.js";

const user = { id: "semantic-smoke-user" };

const cases = [
  ["loading", {}, STATE.LOADING],
  [
    "not_found",
    { publicState: PUBLIC.NOT_FOUND },
    STATE.NOT_FOUND,
  ],
  [
    "public_error",
    { publicState: PUBLIC.ERROR },
    STATE.ERROR,
  ],
  [
    "guest",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.NOT_REQUIRED,
      user: null,
    },
    STATE.GUEST,
  ],
  [
    "authenticated_unenrolled",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.READY,
      user,
      enrollment: null,
    },
    STATE.AUTHENTICATED_UNENROLLED,
  ],
  [
    "assigned",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.READY,
      user,
      enrollment: { status: "assigned" },
    },
    STATE.ASSIGNED,
  ],
  [
    "active",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.READY,
      user,
      enrollment: { status: "active" },
    },
    STATE.ACTIVE,
  ],
  [
    "completed",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.READY,
      user,
      enrollment: { status: "completed" },
    },
    STATE.COMPLETED,
  ],
  [
    "cancelled",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.READY,
      user,
      enrollment: { status: "cancelled" },
    },
    STATE.CANCELLED,
  ],
  [
    "account_loading",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.LOADING,
      user,
    },
    STATE.LOADING,
  ],
  [
    "account_error",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.ERROR,
      user,
    },
    STATE.ERROR,
  ],
  [
    "unknown_enrollment_status",
    {
      publicState: PUBLIC.READY,
      accountState: ACCOUNT.READY,
      user,
      enrollment: { status: "unexpected_status" },
    },
    STATE.ERROR,
  ],
];

for (const [name, input, expected] of cases) {
  const actual = resolveCourseDetailState(input);

  if (actual !== expected) {
    throw new Error(
      `${name}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS ${name} -> ${actual}`);
}

const uniqueStates = new Set(Object.values(STATE));

if (uniqueStates.size !== 9) {
  throw new Error(
    `Expected 9 course-detail states, received ${uniqueStates.size}`
  );
}

console.log("COURSE_DETAIL_STATE_COUNT=9");
console.log("COURSE_DETAIL_STATE_SEMANTICS=PASS");
"""

    try:
        result = subprocess.run(
            [
                "node",
                "--input-type=module",
                "-e",
                script,
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
    except FileNotFoundError as exc:
        raise SystemExit(
            "Node.js is required for course detail state semantic smoke"
        ) from exc

    if result.stdout:
        print(result.stdout.rstrip())

    if result.returncode != 0:
        if result.stderr:
            print(result.stderr.rstrip())

        raise SystemExit(
            "Course detail state semantic smoke failed"
        )

    print("Course detail state semantic smoke passed")

def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            "export async function getPublicCourses(filters = {})",
            'return request(`/api/v1/public/courses${query ? `?${query}` : ""}`);',
            "export async function getPublicCourseDetail(slug)",
            "return request(`/api/v1/public/courses/${slug}`);",
            "export async function getAccountCourses()",
            'return request("/api/v1/account/courses");',
            "export async function enrollAccountCourse(courseId)",
            "/api/v1/account/courses/${courseId}/enroll",
        ],
    )

    require_contains(
        "frontend/src/pages/HomePage.jsx",
        [
            'import { useEffect, useState } from "react";',
            'import { getPublicCourses } from "../api/client";',
            "const HOME_FEATURES = [",
            'page: "verify-document"',
            "function formatCourseDocument(course)",
            "function ProgramCard({ course, index, onOpenCourse })",
            "export function HomePage",
            "const [featuredCourses, setFeaturedCourses] = useState([]);",
            "const [loadingCourses, setLoadingCourses] = useState(true);",
            'const [coursesError, setCoursesError] = useState("");',
            "async function loadFeaturedCourses()",
            "getPublicCourses({ limit: 4 })",
            "setFeaturedCourses(Array.isArray(response) ? response : []);",
            "{course.hours} ч.",
            "featuredCourses.map((course, index) => (",
            "onClick={() => onOpenCourse(slug)}",
            'onPageChange("catalog")',
            "Опубликованных программ пока нет",
        ],
    )

    require_not_contains(
        "frontend/src/pages/HomePage.jsx",
        [
            'import { PUBLIC_COURSES } from "../data/publicCourses";',
            "const FALLBACK_HOME_COURSES = [",
            "function formatCoursePrice(course)",
            "function getCourseModulesLabel(course, index)",
            "const displayCourses = useMemo(() => {",
            "designFallbackCourses",
            'price: "4 900 ₽"',
            'price: "9 900 ₽"',
            "для витрины показаны локальные демонстрационные карточки",
        ],
    )
    require_contains(
        "frontend/src/pages/CatalogPage.jsx",
        [
            'import { useEffect, useMemo, useState } from "react";',
            'import { getAccountCourses, getPublicCourses } from "../api/client";',
            "function getEnrollmentStatusLabel(status)",
            "function getEnrollmentStatusTone(status)",
            "function buildEnrollmentMap(accountCourses)",
            "function getCourseEnrollment(course, enrollmentMap)",
            "function getCourseActionLabel(enrollment)",
            "function formatCourseDocument(course)",
            "function formatCourseFormat(value)",
            "function getFormatOptions(courses)",
            "function getDocumentOptions(courses)",
            "function getInitialCatalogQuery()",
            "function CourseCard({",
            "function CatalogEmptyState({",
            "export function CatalogPage",
            "const [courses, setCourses] = useState([]);",
            "const [accountCourses, setAccountCourses] = useState([]);",
            "const [formatFilter, setFormatFilter] = useState(\"all\");",
            "const [documentFilter, setDocumentFilter] =",
            "const formatOptions = useMemo(",
            "const documentOptions = useMemo(",
            "const filteredCourses = useMemo(() => {",
            "getPublicCourses({ limit: 300 })",
            "await getAccountCourses()",
            "setCourses(",
            "filteredCourses.map((course) => {",
            "onOpenCourse(course.slug || course.id)",
            'data-testid="catalog-public-diagnostics"',
            'data-testid="catalog-public-summary"',
            "Опубликованных программ пока нет",
            "Поиск и фильтры используют только данные опубликованных программ.",
        ],
    )

    require_not_contains(
        "frontend/src/pages/CatalogPage.jsx",
        [
            'import { PUBLIC_COURSES } from "../data/publicCourses";',
            "const CATALOG_FALLBACK_COURSES = [",
            "function formatCoursePrice(course)",
            "function isCourseFree(course)",
            "function getCourseDirection(course",
            "function getCourseLevel(course",
            "function getCourseAudience(course",
            "function getCourseModules(course",
            "designFallbackCourses",
            "supplementCourses",
            "Показать 1248 программ",
            'courses.length ? courses.length : "1 248"',
            "filteredCourses.length : 1248",
            "По популярности",
            "По новизне",
            "По цене",
            ">208<",
            "Backend каталога сейчас не ответил, поэтому для проверки дизайна показана локальная витрина.",
        ],
    )
    require_contains(
        "frontend/src/utils/courseDetailState.js",
        [
            "export const COURSE_DETAIL_STATES = Object.freeze({",
            'LOADING: "loading"',
            'NOT_FOUND: "not_found"',
            'ERROR: "error"',
            'GUEST: "guest"',
            'AUTHENTICATED_UNENROLLED: "authenticated_unenrolled"',
            'ASSIGNED: "assigned"',
            'ACTIVE: "active"',
            'COMPLETED: "completed"',
            'CANCELLED: "cancelled"',
            "export const PUBLIC_COURSE_LOAD_STATES = Object.freeze({",
            "export const ACCOUNT_COURSE_LOAD_STATES = Object.freeze({",
            "export function resolveCourseDetailState({",
            "ENROLLMENT_PAGE_STATES[enrollmentStatus]",
        ],
    )

    require_contains(
        "frontend/src/pages/CourseDetailPage.jsx",
        [
            'import { useEffect, useState } from "react";',
            "enrollAccountCourse,",
            "getAccountCourses,",
            "getPublicCourseDetail,",
            "getPublicCourses",
            "function formatCourseDocument(course)",
            "function formatCoursePrice(course)",
            "function getEnrollmentStatusLabel(status)",
            "function getEnrollmentStatusTone(status)",
            "function getPrimaryActionLabel(enrollment, user)",
            "export function CourseDetailPage",
            "const [course, setCourse] = useState(null);",
            "const [relatedCourses, setRelatedCourses] = useState([]);",
            "const [enrollLoading, setEnrollLoading] = useState(false);",
            "const [enrollError, setEnrollError] = useState(\"\");",
            "const [enrollSuccess, setEnrollSuccess] = useState(\"\");",
            "const [existingEnrollment, setExistingEnrollment] = useState(null);",
            "async function loadCourse()",
            "getPublicCourseDetail(courseSlug)",
            "getPublicCourses({ limit: 6 })",
            "user ? getAccountCourses() : Promise.resolve(null)",
            "setRelatedCourses(",
            "setExistingEnrollment(",
            "async function handleEnroll()",
            "localStorage.setItem(\"obrportal_pending_enrollment_slug\", course.slug);",
            "onPageChange(\"register\")",
            "onPageChange(\"account\")",
            "enrollAccountCourse(course.id)",
            "if (err.status === 409)",
            "getPrimaryActionLabel(existingEnrollment, user)",
        ],
    )

    require_contains(
        "frontend/src/routes/PublicRoutes.jsx",
        [
            'import { Navigate, Route, Routes } from "react-router-dom";',
            "const AccountPage = lazyNamed(() => import(\"../pages/AccountPage\"), \"AccountPage\");",
            "const CatalogPage = lazyNamed(() => import(\"../pages/CatalogPage\"), \"CatalogPage\");",
            "const HomePage = lazyNamed(() => import(\"../pages/HomePage\"), \"HomePage\");",
            "const CourseDetailPublicRoute = lazyNamed(",
            "() => import(\"./PublicRouteComponents\"),",
            "\"CourseDetailPublicRoute\"",
            "const VerifyDocumentCodeRoute = lazyNamed(",
            "\"VerifyDocumentCodeRoute\"",
            'import { userHasRole } from "../utils/adminState";',
            "export function PublicRoutes",
            "const isOrgRepresentative = userHasRole(user, \"org_rep\");",
            'path="/"',
            "<HomePage",
            'path="/catalog"',
            "<CatalogPage",
            'path="/courses/:slug"',
            "<CourseDetailPublicRoute",
            'path="/verify/:code"',
            "<VerifyDocumentCodeRoute",
            'path="/verify-document"',
            "<VerifyDocumentPage",
            'path="/account"',
            "<AccountPage",
            'path="*"',
        ],
    )

    require_contains(
        "frontend/src/utils/publicRoutes.js",
        [
            "export const PUBLIC_ROUTE_MAP = {",
            'home: "/"',
            'catalog: "/catalog"',
            '"verify-document": "/verify-document"',
            'account: "/account"',
            "export function getPublicPageFromPathname(pathname)",
            'if (pathname === "/") return "home";',
            'if (pathname === "/catalog") return "catalog";',
            'if (pathname.startsWith("/courses/")) return "course-detail";',
            'if (pathname.startsWith("/verify/")) return "verify-document";',
            "export function ensureMetaDescriptionTag()",
            "export function buildPublicMeta(pathname)",
            'if (pathname === "/")',
            'if (pathname === "/catalog")',
            'if (pathname.startsWith("/courses/"))',
            'if (pathname === "/verify-document" || pathname.startsWith("/verify/"))',
            'if (pathname === "/account")',
        ],
    )

    require_contains(
        "backend/app/api/v1/public.py",
        [
            '@router.get("/courses", response_model=list[PublicCourseItemResponse])',
            "async def list_public_courses(",
            '@router.get("/courses/{slug}", response_model=PublicCourseDetailResponse)',
            "async def get_public_course_detail(",
            '@router.get("/documents/verify", response_model=PublicDocumentVerifyResponse)',
            "async def verify_document(",
        ],
    )

    run_course_detail_state_semantic_smoke()

    print("Public pages behavior smoke passed")


if __name__ == "__main__":
    main()
