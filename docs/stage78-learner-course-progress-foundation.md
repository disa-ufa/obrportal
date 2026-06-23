# Stage 78.1 - Learner course progress foundation

stage78_1_status=implementation_ready
stage78_1_release_manifest_required=yes
stage78_1_guard_required=yes
stage78_1_frontend_only=yes

## Goal

Start the learner-side course progress milestone.

This stage adds a progress foundation panel to the public course detail page. It uses the existing public course structure and enrollment status to explain the learner's current state and next step.

## Scope

Changed files:

- frontend/src/pages/CourseDetailPage.jsx
- docs/release-manifest.json
- docs/stage78-learner-course-progress-foundation.md
- scripts/check_release_manifest.py
- scripts/check_stage78_learner_course_progress_foundation.py
- scripts/check_stage77_course_builder_final_qa.py

## Acceptance markers

The course detail page must include:

- learner-course-progress-foundation-panel
- learner-course-progress-summary
- learner-course-progress-status
- learner-course-progress-next-step
- learner-course-progress-roadmap
- learner-course-progress-actions
- getLearnerCourseProgressFoundationFacts
- CourseLearnerProgressFoundationPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage78_learner_course_progress_foundation.py
- python .\scripts\check_stage77_course_builder_final_qa.py
- python .\scripts\check_stage77_course_publication_ux.py
- python .\scripts\check_stage77_lesson_content_preview_ux.py
- python .\scripts\check_stage77_lesson_editor_ux.py
- python .\scripts\check_stage77_course_builder_module_lesson_ux.py
- python .\scripts\check_stage77_course_builder_card_ux.py
- python .\scripts\check_stage77_course_builder_readiness.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\smoke_public_pages.py
- python .\scripts\smoke_frontend_hooks_layout.py
- docker compose exec frontend npm run build
- git diff --check
