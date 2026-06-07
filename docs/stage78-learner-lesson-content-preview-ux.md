# Stage 78.3 - Learner lesson content preview UX

stage78_3_status=implementation_ready
stage78_3_release_manifest_required=yes
stage78_3_guard_required=yes
stage78_3_frontend_only=yes

## Goal

Add a learner-facing lesson content preview panel to the public course detail page.

The panel shows the first available lesson, content type, learner action, material preview, and link action when a URL material is available.

## Scope

Changed files:

- frontend/src/pages/CourseDetailPage.jsx
- docs/release-manifest.json
- docs/stage78-learner-lesson-content-preview-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage78_learner_lesson_content_preview_ux.py
- scripts/check_stage78_learner_lesson_access_ux.py

## Acceptance markers

The course detail page must include:

- learner-lesson-content-preview-panel
- learner-lesson-content-preview-status
- learner-lesson-content-preview-summary
- learner-lesson-content-preview-body
- learner-lesson-content-preview-open-link
- learner-lesson-content-preview-actions
- getLearnerLessonContentPreviewFacts
- CourseLearnerLessonContentPreviewPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage78_learner_lesson_content_preview_ux.py
- python .\scripts\check_stage78_learner_lesson_access_ux.py
- python .\scripts\check_stage78_learner_course_progress_foundation.py
- python .\scripts\check_stage77_course_builder_final_qa.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\smoke_public_pages.py
- python .\scripts\smoke_frontend_hooks_layout.py
- docker compose exec frontend npm run build
- git diff --check
