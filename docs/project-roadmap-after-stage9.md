# ObrPortal roadmap after Stage 9

Version: `v0.1.0-stage6-ops9`
Status: `drafted`
Base checkpoint: `79c64c0`
Release tag: `v0.1.0-stage6-ops9`

## 1. Purpose

This document fixes the development roadmap after Stage 9.

Stage 9 closed the production operations contour:

- production operations baseline;
- production monitoring smoke;
- backup inventory precheck;
- protected backup artifact;
- restore dry-run metadata verification;
- operational runbook;
- maintenance/update checklist;
- handover package;
- final local gate.

The next stages move from operations stabilization to controlled production readiness and product development.

## 2. Current stable checkpoint

| Item | Value |
| --- | --- |
| Current commit | `79c64c0` |
| Current tag | `v0.1.0-stage6-ops9` |
| `develop` | synchronized with `main` |
| `main` | synchronized with `develop` |
| Production domain | `portal.rcdo02.ru` |
| Public URL | `https://portal.rcdo02.ru` |

## 3. Important correction

The course authoring module must be a separate development stage.

It must not be hidden inside a generic LMS stage.

Reason:

- course creation is a core product capability;
- administrators and methodists must be able to create and compose courses;
- courses must include modules, lessons, materials, ordering, publication status and preview;
- only after course authoring is stable can the learning flow be fully developed.

## 4. Stage 10 — Production data initialization / controlled readiness

Goal:

- prepare production database for real application use without breaking the already stabilized production operations contour.

Scope:

- backup before initialization;
- run Alembic migrations;
- verify database tables;
- seed roles and permissions;
- create real administrator;
- create real organization profile;
- run auth/admin production smoke;
- create new backup after schema/data appears.

Expected result:

- production database is no longer empty;
- public table count is greater than `0`;
- admin login works;
- admin RBAC works;
- readiness remains green;
- backup after initialization contains schema/table markers.

## 5. Stage 11 — Production hardening

Goal:

- remove development-mode risks from production usage.

Scope:

- fix frontend API base variable mismatch;
- remove demo credentials from production login form;
- prepare production Docker Compose template;
- remove `--reload` from production backend command;
- replace Vite dev server with production frontend serving strategy;
- harden CORS;
- verify security headers;
- document secret rotation basics.

Expected result:

- production frontend uses correct API base;
- production UI does not expose demo credentials;
- app/service ports remain private;
- production deployment does not depend on Vite dev server.

## 6. Stage 12 — Course authoring / конструктор курсов

Goal:

- implement the ability to create and compose courses inside the admin panel.

This is a separate major stage.

Core entities:

- course;
- module;
- lesson;
- material;
- publication status;
- course preview.

Minimum capabilities:

- create course;
- edit course;
- archive course;
- publish course;
- create modules;
- reorder modules;
- create lessons;
- reorder lessons;
- attach lesson materials;
- preview course as learner;
- show published course in public catalog.

Course fields:

- title;
- slug;
- short description;
- full description;
- category/direction;
- duration hours;
- learning format;
- document type;
- status;
- publication flag;
- cover image;
- requirements;
- learning outcomes.

Module fields:

- title;
- description;
- order index;
- required flag;
- visibility/status.

Lesson fields:

- title;
- description;
- content type;
- text content;
- external URL;
- video URL;
- attached files;
- duration;
- order index;
- required flag;
- visibility/status.

Course statuses:

- `draft`;
- `review`;
- `published`;
- `archived`.

MVP rule:

- only `published` courses are visible in public catalog;
- archived courses are not available for new enrollments;
- course completion is based on required lessons.

Expected result:

- methodist/admin can assemble a complete course without developer intervention;
- course can be published to catalog;
- learner can later be enrolled into this course.

## 7. Stage 13 — Learning flow / прохождение курсов

Goal:

- implement the learner-side course experience.

Scope:

- learner course list;
- course detail page;
- modules and lessons display;
- lesson completion;
- progress calculation;
- course completion;
- link to generated documents.

Expected result:

- learner can open assigned course;
- learner can complete lessons;
- system tracks progress;
- completed course can trigger document generation.

## 8. Stage 14 — Documents / certificates / verification

Goal:

- stabilize generated educational documents.

Scope:

- document templates;
- PDF generation;
- QR code;
- document number;
- public verification;
- private storage;
- repeated generation;
- audit trail.

Expected result:

- completed course can produce a verifiable PDF document;
- document can be checked publicly by number/verification code.

## 9. Stage 15 — Admin UX / operator workflow

Goal:

- make admin panel convenient for real operators.

Scope:

- dashboard worklists;
- user filters;
- organization filters;
- course filters;
- enrollment worklists;
- bulk actions;
- audit view;
- operator-friendly error messages.

Expected result:

- daily administration can be done without direct database access.

## 10. Stage 16 — Integrations

Goal:

- prepare external integrations only after core workflows are stable.

Possible integrations:

- ЭДО;
- ФРДО;
- 1С/accounting;
- email notifications;
- Telegram notifications;
- external S3-compatible storage.

Rule:

- integrations are not started until course authoring, learning flow and document generation are stable.

## 11. Stage 17 — Backup and monitoring automation

Goal:

- automate manual Stage 9 operations.

Scope:

- scheduled backups;
- SHA256 verification;
- retention policy;
- scheduled smoke checks;
- alerting;
- restore dry-run schedule;
- maintenance report template.

Expected result:

- production operations become repeatable and partially automated.

## 12. Stage 18 — Beta release / acceptance

Goal:

- prepare controlled beta usage.

Scope:

- acceptance checklist;
- beta users;
- beta organizations;
- feedback collection;
- blocking bug triage;
- release candidate tag.

Expected result:

- system is ready for limited real users.

## 13. Immediate next technical actions

Before production data initialization:

1. Update project documentation after Stage 9.
2. Add Stage 9 guards to CI where appropriate.
3. Fix frontend API base variable mismatch.
4. Remove demo credentials from production login.
5. Prepare production initialization runbook.

## 14. Acceptance criteria

This roadmap is accepted when:

- Stage 10–18 are explicitly listed;
- course authoring is a separate Stage 12;
- learning flow is separated from course authoring;
- documents are separated from learning flow;
- production hardening is listed before course authoring;
- immediate next actions are clear;
- diagnostics guard verifies the roadmap markers.
