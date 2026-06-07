# Stage 77.3 - Course builder module lesson UX

stage77_3_status=implementation_ready
stage77_3_release_manifest_required=yes
stage77_3_guard_required=yes
stage77_3_frontend_only=yes

## Goal

Improve module and lesson UX inside the admin course builder.

The stage adds a module summary panel with metrics, attention diagnostics, and a compact lesson map.

## Scope

Changed files:

- frontend/src/pages/AdminCoursesPage.jsx
- docs/release-manifest.json
- docs/stage77-course-builder-module-lesson-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage77_course_builder_module_lesson_ux.py
- scripts/check_stage77_course_builder_card_ux.py

## Acceptance markers

The admin courses page must include:

- course-builder-module-lesson-ux-panel
- course-builder-module-lesson-ux-metrics
- course-builder-module-lesson-ux-attention
- course-builder-module-lesson-ux-map
- getCourseBuilderModuleLessonUxFacts
- CourseBuilderModuleLessonUxPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage77_course_builder_module_lesson_ux.py
- python .\scripts\check_stage77_course_builder_card_ux.py
- python .\scripts\check_stage77_course_builder_readiness.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_frontend_hooks_layout.py
- docker compose exec frontend npm run build
- git diff --check
