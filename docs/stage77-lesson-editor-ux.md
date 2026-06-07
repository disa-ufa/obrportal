# Stage 77.4 - Lesson editor UX

stage77_4_status=implementation_ready
stage77_4_release_manifest_required=yes
stage77_4_guard_required=yes
stage77_4_frontend_only=yes

## Goal

Improve lesson form UX inside the admin course builder.

The stage adds a lesson editor help panel with content-type hints, required fields, missing fields, and publication mode.

## Scope

Changed files:

- frontend/src/pages/AdminCoursesPage.jsx
- docs/release-manifest.json
- docs/stage77-lesson-editor-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage77_lesson_editor_ux.py
- scripts/check_stage77_course_builder_module_lesson_ux.py

## Acceptance markers

The admin courses page must include:

- lesson-editor-ux-panel
- lesson-editor-ux-content-type
- lesson-editor-ux-required-fields
- lesson-editor-ux-missing-fields
- lesson-editor-ux-publication-mode
- getLessonEditorUxFacts
- CourseLessonEditorUxPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage77_lesson_editor_ux.py
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
