# Stage 77.2 - Course builder card UX

stage77_2_status=implementation_ready
stage77_2_release_manifest_required=yes
stage77_2_guard_required=yes
stage77_2_frontend_only=yes

## Goal

Improve the admin course card UX after the first readiness panel.

The card now includes a visible "Course card map" with basic information, structure summary, public card link, enrollments link, and audit link.

## Scope

Changed files:

- frontend/src/pages/AdminCoursesPage.jsx
- docs/release-manifest.json
- docs/stage77-course-builder-card-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage77_course_builder_card_ux.py

## Acceptance markers

The admin courses page must include:

- course-builder-card-ux-panel
- course-builder-card-ux-sections
- course-builder-card-ux-quick-actions
- getCourseBuilderCardUxFacts
- CourseBuilderCardUxPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage77_course_builder_card_ux.py
- python .\scripts\check_stage77_course_builder_readiness.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_frontend_hooks_layout.py
- docker compose exec frontend npm run build
- git diff --check
