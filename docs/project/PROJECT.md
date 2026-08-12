# ObrPortal — product definition

Last reviewed: 2026-08-12

## Purpose

ObrPortal is an educational portal that combines a public course/catalog experience with authenticated workspaces for learners, educational organizations and platform administrators.

The near-term product goal is not merely to render pages, but to support a complete controlled learning journey: identity and registration, learner/organization onboarding, course publishing and enrollment, lesson delivery, progress, assessments/assignments and resulting documents, with traceable administration and role-based access.

## Primary user groups

### Public visitor

Can use the public part of the portal, browse available content and enter authentication/registration flows.

### Learner / physical person

The canonical role used by public self-registration is `learner_fl`.

A learner should be able to establish an account, enter the learner cabinet, access assigned/enrolled courses, complete lessons and learning activities, track progress and work with resulting documents exposed by the product.

### Organization-side user

Represents an educational/customer organization in its cabinet. The implemented scope includes organization profile and learner/group/enrollment workflows; exact permissions are controlled by RBAC rather than by UI assumptions.

### Platform administrator/operator

Uses administrative tools for users, roles, organizations, courses/content, learners/imports and other operational data. Access must be enforced by backend authorization, not merely hidden in the frontend.

## Core product capabilities in the current scope

The repository already contains substantial implementation for:

- authentication and authorization;
- RBAC and user-role assignment;
- public self-registration and password setup/recovery;
- public catalog/course views;
- admin, learner and organization-facing workspaces;
- organizations and organization profile management;
- learner bulk import/onboarding workflows;
- courses and course content;
- lessons and lesson studio/content blocks;
- enrollments, learning groups and learner progress;
- quizzes/attempts;
- assignments/submissions and related review flows;
- generated/learner documents;
- audit events for security-sensitive operations;
- object storage integration through S3/MinIO.

The exact readiness of each capability is tracked in `STATUS.md`; presence of a model, permission or page does not by itself mean the business flow is production-ready.

## Capabilities not to claim as implemented without new evidence

The broader product vision has included possible integrations/business modules such as:

- payments;
- orders/contracts;
- FRDO integration;
- EDO integration.

During the 2026-08-12 repository audit, these were not evidenced as complete standalone core modules comparable to the implemented learning/authentication areas. They therefore belong to future requirements/roadmap until dedicated code, tests and acceptance criteria exist.

## Product principles

1. **Repository state beats chat memory.** Current code, migrations, tests and Git state are authoritative.
2. **Security-sensitive flows fail safely.** Registration, password setup, recovery and RBAC require backend enforcement, auditability and rate limiting where applicable.
3. **A merge is not a rollout.** Feature enablement, deployment and production activation are separate operations.
4. **Readiness is end-to-end.** A feature is not complete merely because a page exists; backend, database, permissions, error states, tests and operational implications matter.
5. **Current status and future vision stay separate.** `STATUS.md` records verified reality; `ROADMAP.md` records intended next work.

## Definition of a first production-capable pilot

A production-capable pilot should, at minimum, have all of the following verified together:

- stable authentication/RBAC;
- controlled registration/onboarding path;
- working email delivery for email-dependent identity flows;
- learner and organization onboarding;
- a real course that can be published, enrolled, consumed and completed;
- lessons, progress and required assessments/assignments;
- learner-facing result/document flow required for the pilot;
- admin/operator tooling for the pilot population;
- database migrations tested from a clean database and from the supported upgrade path;
- backup/restore procedure;
- deployment and rollback procedure;
- production secrets/TLS/domain configuration;
- post-deployment smoke checks and basic observability.
