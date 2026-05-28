# Stage 12.7 Import/export and reporting

Status: in progress
Stage: 12.7
Project: ObrPortal
Baseline tag: v0.1.0-stage12-6-ux-navigation-empty-states

## 1. Purpose

Stage 12.7 defines safe import, export and reporting requirements for ObrPortal.

This baseline step is documentation-only and guard-only.

No backend runtime code, frontend runtime code, database migrations, production configuration or API contract changes are introduced by this baseline step.

## 2. Accepted input baseline

Accepted before Stage 12.7:

- Stage 12.1 learner account workflow is accepted;
- Stage 12.2 catalog learner workflow is accepted;
- Stage 12.3 course detail learner workflow is accepted;
- Stage 12.4 document verification workflow is accepted;
- Stage 12.5 admin moderation and audit workflow is accepted;
- Stage 12.6 UX navigation and empty states is accepted;
- production deploy for Stage 12.6 was recorded;
- production internal ports remain private;
- frontend build remains green;
- text encoding and BOM guards remain green.

## 3. Product goal

Goal:

- define safe import/export requirements;
- avoid destructive imports without validation;
- keep exported data scoped by role;
- prepare reporting surfaces without leaking secrets, internal configs or unauthorized personal data.

## 4. Safety principles

Stage 12.7 must follow these principles:

- exports must be access-controlled;
- exports must be role-scoped;
- exports must not include secrets or internal configuration values;
- imports must have validation before write operations;
- destructive imports are forbidden without a separate accepted plan;
- large operations must be guarded;
- admin-only reports must stay admin-only;
- organization-scoped reports must not leak other organizations;
- audit data remains read-only unless a separate accepted checkpoint changes it.

## 5. Export candidates

Safe export candidates to evaluate:

- users list export for admin role only;
- organizations list export for admin role only;
- groups list export with organization scope;
- enrollments report with status filters;
- course catalog report;
- document metadata report without raw binary leakage;
- audit summary export as read-only administrative evidence.

## 6. Import candidates

Safe import candidates to evaluate:

- users import template;
- organizations import template;
- groups import template;
- enrollments import template.

Import rules:

- first implementation must be dry-run or validation-first;
- row-level validation errors must be visible before writing;
- duplicate handling must be explicit;
- partial success rules must be documented before implementation;
- production destructive import is forbidden by default.

## 7. Reporting candidates

Safe reporting candidates to evaluate:

- admin operational summary;
- learner enrollment progress summary;
- organization activity summary;
- document generation and verification summary;
- audit inspection summary.

Reports must not expose data beyond the current user's role and object-level permissions.

## 8. Implementation sequence

Recommended sequence:

1. Stage 12.7 baseline document and guard;
2. export API contract review;
3. read-only export for one low-risk entity;
4. frontend export UX with clear loading, empty and error states;
5. import template documentation;
6. import dry-run validation;
7. reporting summary UX;
8. production deploy record and final Stage 12.7 tag.

## 9. Forbidden changes in the baseline step

Forbidden in this baseline step:

- database migrations;
- backend API contract changes;
- frontend runtime changes;
- production docker-compose override changes;
- authentication weakening;
- RBAC weakening;
- object-level access weakening;
- exposing internal ports publicly;
- committing secrets;
- printing production secrets;
- broad unrelated refactoring.

## 10. Acceptance criteria

Stage 12.7 baseline is accepted when:

- this document exists;
- the Stage 12.7 guard exists;
- the guard checks roadmap, previous Stage 12.6 baseline and this document;
- the guard confirms safety markers;
- encoding and BOM guards pass;
- no runtime code changes are required for the baseline step.

## 11. Local quality gate

Before merging Stage 12.7 baseline, run:

- python scripts/check_stage12_7_import_export_reporting.py;
- python scripts/check_stage12_6_ux_ui_navigation_empty_states.py;
- python scripts/check_stage12_product_roadmap.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py.

## 12. Baseline verification result

Status: pending local verification.

Expected result:

- stage 12.7 import/export and reporting diagnostics passed;
- secrets_printed=no;
- runtime_changed=no;
