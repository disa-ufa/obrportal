# Stage 78.4 - Learner completion action UX

stage78_4_status=implementation_ready
stage78_4_release_manifest_required=yes
stage78_4_guard_required=yes
stage78_4_frontend_only=yes

## Goal

Add a learner-facing completion action panel to the public course detail page.

The panel prepares the learner-side flow for lesson completion: open material, study material, and prepare completion marking.

## Scope

Changed files:

- frontend/src/pages/CourseDetailPage.jsx
- docs/release-manifest.json
- docs/stage78-learner-completion-action-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage78_learner_completion_action_ux.py
- scripts/check_stage78_learner_lesson_content_preview_ux.py

## Acceptance markers

The course detail page must include:

- learner-completion-action-panel
- learner-completion-action-status
- learner-completion-action-summary
- learner-completion-action-checklist
- learner-completion-action-step
- learner-completion-action-actions
- getLearnerCompletionActionFacts
- CourseLearnerCompletionActionPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage78_learner_completion_action_ux.py
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
