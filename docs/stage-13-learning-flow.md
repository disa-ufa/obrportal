# Stage 13 Learning flow / прохождение курсов

Status: in progress
Stage: 13
Project: ObrPortal
Baseline tag: v0.1.0-stage12-complete
Parent roadmap: docs/project-roadmap-after-stage9.md

## 1. Purpose

Stage 13 implements the learner-side course experience after the accepted Stage 12 product contour.

The goal is to let an enrolled learner:
- see assigned courses;
- open an assigned course;
- view modules and lessons;
- complete lessons;
- see progress;
- complete a course;
- later receive or open generated documents when document generation is connected.

This baseline step is documentation-only and guard-only.

## 2. Accepted baseline

Stage 13 starts from the accepted Stage 12 checkpoint:

- final Stage 12 tag: `v0.1.0-stage12-complete`;
- final Stage 12 acceptance commit: `6c0b0c3`;
- production is healthy after Stage 12;
- Stage 12.1 through Stage 12.8 are accepted.

Existing learner-facing foundation:
- account/profile workflow exists;
- catalog learner workflow exists;
- public course detail workflow exists;
- learner account course/document visibility exists;
- admin course/module/lesson authoring foundation exists;
- admin enrollments foundation exists;
- document verification foundation exists.

## 3. Stage 13 scope

Stage 13 scope:
- learner course list;
- learner course detail page;
- modules and lessons display;
- lesson completion;
- progress calculation;
- course completion;
- link to generated documents.

## 4. MVP user flow

MVP learner flow:

1. Learner signs in.
2. Learner opens account or learning area.
3. Learner sees assigned courses.
4. Learner opens an assigned course.
5. Learner sees modules and lessons.
6. Learner opens a lesson.
7. Learner marks lesson as completed.
8. System recalculates course progress.
9. When all required lessons are completed, course becomes completed.
10. Completed course can later trigger or link to document generation.

## 5. Data and API expectations

Stage 13 may require backend support for:
- learner-scoped course list;
- learner-scoped course progress detail;
- lesson completion mutation;
- progress recalculation;
- completed course state;
- safe document link visibility after completion.

All APIs must be learner-scoped and must not expose another learner's enrollments, progress or documents.

## 6. Frontend expectations

Stage 13 frontend should provide:
- clear learner course list;
- course progress indicator;
- module/lesson outline;
- lesson content display;
- completion action;
- completed/locked/empty/loading/error states;
- safe links back to account, catalog and document verification.

## 7. Safety rules

Stage 13 must not:
- weaken authentication, authorization or RBAC;
- expose another learner's courses, progress, lessons or documents;
- add broad admin changes without a separate accepted plan;
- change production secrets;
- print tokens or environment values;
- change server-local `docker-compose.override.yml`;
- touch server-local `backups/` or `tmp/`;
- introduce destructive migrations without an explicit migration/rollback plan;
- bypass CI/local quality gates.

## 8. Baseline acceptance criteria

Stage 13 baseline is accepted when:
- this document exists;
- the Stage 13 guard exists;
- the guard checks the post-Stage 9 roadmap;
- the guard checks Stage 12 final acceptance;
- the guard checks Stage 13 scope and safety markers;
- encoding and BOM guards pass;
- no runtime files are changed by the baseline step.

## 9. Local quality gate

Before merging the Stage 13 baseline, run:
- `python scripts/check_stage13_learning_flow.py`;
- `python scripts/check_stage12_8_final_stabilization.py`;
- `python scripts/check_stage12_7_import_export_reporting.py`;
- `python scripts/check_project_roadmap_after_stage9.py`;
- `python scripts/check_ci_local_gate.py`;
- `python scripts/check_text_encoding.py`;
- `python scripts/check_source_bom.py`.

Before merging Stage 13 runtime implementation, additionally run:
- `docker compose exec frontend npm run build`;
- `docker compose exec backend pytest app/tests -q`.

## 10. Verification markers

- `Stage 13 Learning flow / прохождение курсов`
- `Stage 13 baseline`
- `v0.1.0-stage12-complete`
- `learner course list`
- `learner course detail page`
- `modules and lessons display`
- `lesson completion`
- `progress calculation`
- `course completion`
- `link to generated documents`
- `learner-scoped`
- `production_runtime_changed=no`
