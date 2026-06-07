# Stage 78.2 - Learner lesson access UX

stage78_2_status=implementation_ready
stage78_2_release_manifest_required=yes
stage78_2_guard_required=yes
stage78_2_frontend_only=yes

## Goal

Improve the learner-facing course detail page with a lesson access map.

The panel explains which lessons are available, which are required, which are hidden, and what the learner should open first depending on login and enrollment state.

## Scope

Changed files:

- frontend/src/pages/CourseDetailPage.jsx
- docs/release-manifest.json
- docs/stage78-learner-lesson-access-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage78_learner_lesson_access_ux.py
- scripts/check_stage78_learner_course_progress_foundation.py

## Acceptance markers

The course detail page must include:

- learner-lesson-access-panel
- learner-lesson-access-summary
- learner-lesson-access-mode
- learner-lesson-access-map
- learner-lesson-access-module
- learner-lesson-access-lesson
- learner-lesson-access-actions
- getLearnerLessonAccessFacts
- CourseLearnerLessonAccessPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
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
