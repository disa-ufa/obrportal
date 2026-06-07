# Stage 77.5 - Lesson content preview UX

stage77_5_status=implementation_ready
stage77_5_release_manifest_required=yes
stage77_5_guard_required=yes
stage77_5_frontend_only=yes

## Goal

Add a lesson content preview panel to the admin course builder lesson form.

The preview shows what the learner will approximately see for text, video, file, link, and assignment lessons.

## Scope

Changed files:

- frontend/src/pages/AdminCoursesPage.jsx
- docs/release-manifest.json
- docs/stage77-lesson-content-preview-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage77_lesson_content_preview_ux.py
- scripts/check_stage77_lesson_editor_ux.py

## Acceptance markers

The admin courses page must include:

- lesson-content-preview-panel
- lesson-content-preview-kind
- lesson-content-preview-body
- lesson-content-preview-open-link
- getLessonContentPreviewFacts
- CourseLessonContentPreviewPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage77_lesson_content_preview_ux.py
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
