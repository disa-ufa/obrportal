# Stage 77.1 - Course builder readiness

stage77_1_status=implementation_ready
stage77_1_release_manifest_required=yes
stage77_1_guard_required=yes
stage77_1_frontend_only=yes

## Goal

Add the first visible Course Builder v1 block to the admin courses page.

The block helps administrators understand whether a course is ready to be published and assigned to learners.

## Scope

Changed files:

- frontend/src/pages/AdminCoursesPage.jsx
- docs/release-manifest.json
- docs/stage77-course-builder-readiness.md
- scripts/check_release_manifest.py
- scripts/check_stage77_course_builder_readiness.py

## Acceptance markers

The admin courses page must include:

- Course builder readiness panel
- Course readiness score
- Publication blockers
- Readiness checklist
- Checks for slug, title, description, format, document type
- Checks for modules, active modules, lessons, active lessons, required lessons

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage77_course_builder_readiness.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_frontend_hooks_layout.py
- docker compose exec frontend npm run build
- git diff --check
