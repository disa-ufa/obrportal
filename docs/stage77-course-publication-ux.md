# Stage 77.6 - Course publication UX

stage77_6_status=implementation_ready
stage77_6_release_manifest_required=yes
stage77_6_guard_required=yes
stage77_6_frontend_only=yes

## Goal

Add a final course publication UX panel to the admin course builder.

The panel summarizes whether a course can be published, what blocks publication, what is already ready, and which next steps should be done before using the course in the public catalog and enrollments.

## Scope

Changed files:

- frontend/src/pages/AdminCoursesPage.jsx
- docs/release-manifest.json
- docs/stage77-course-publication-ux.md
- scripts/check_release_manifest.py
- scripts/check_stage77_course_publication_ux.py
- scripts/check_stage77_lesson_content_preview_ux.py

## Acceptance markers

The admin courses page must include:

- course-publication-ux-panel
- course-publication-ux-decision
- course-publication-ux-blockers
- course-publication-ux-next-steps
- course-publication-ux-actions
- getCoursePublicationUxFacts
- CoursePublicationUxPanel

## Safety

- Frontend-only
- Backend runtime is not changed
- Database schema is not changed
- No migrations are added
- Auth/RBAC is not changed
- Production config is not changed

## Local checks

- python .\scripts\check_release_manifest.py
- python .\scripts\check_stage77_course_publication_ux.py
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
