# ObrPortal — roadmap

Last reviewed: 2026-08-12

This roadmap separates **verified current work** from **future product intent**. It should be updated together with `STATUS.md` as milestones are accepted.

## Phase 0 — repository normalization and source of truth

Goal: make it unambiguous what version is current and how work moves toward `main`.

- [x] Create a canonical project passport (`AGENTS.md` + `docs/project/*`).
- [ ] Reconcile `feature/pilot-course-readiness` with PR #117 registration hardening.
- [ ] Run the full current quality suite on the broader active feature HEAD.
- [ ] Identify coherent feature slices that can be integrated into `main` through reviewable PRs.
- [ ] Classify historical branches as merged/superseded/still-needed before any cleanup.
- [ ] Reduce reliance on long-lived stage branches for future development.
- [ ] Keep `STATUS.md` current after integration changes.

Exit criterion: a developer can identify the current integration baseline and next task from the repository without relying on chat history.

## Phase 1 — production-ready identity and onboarding

Goal: make registration/authentication safe and operationally complete.

- [ ] Integrate the accepted public-registration hardening into the chosen current branch/main path.
- [ ] Provision/configure a dedicated SMTP sender without committing credentials.
- [ ] Validate actual registration email delivery end-to-end.
- [ ] Validate real initial-password link from received email.
- [ ] Validate password recovery email end-to-end.
- [ ] Verify resend and rate-limit behavior under realistic conditions.
- [ ] Verify duplicate/existing-account neutral responses and audit events.
- [ ] Confirm legal/privacy/terms links and text for the production organization.
- [ ] Deploy with public registration disabled first; smoke; enable separately only after approval.

Exit criterion: a real user can register, receive an email, set a password and sign in in the target environment with expected audit/security behavior.

## Phase 2 — pilot educational journey

Goal: validate the product as an educational workflow, not as disconnected admin screens.

### Organization and learner onboarding

- [ ] Verify organization profile data required for the pilot.
- [ ] Verify individual user creation/registration paths.
- [ ] Verify learner bulk import with representative real-format files.
- [ ] Verify groups/enrollments and permission boundaries.

### Course preparation

- [ ] Create a representative real pilot course.
- [ ] Verify course metadata/publication/catalog visibility.
- [ ] Verify lesson/content authoring and saving.
- [ ] Verify content blocks/assets required by the pilot.

### Learner experience

- [ ] Verify enrollment and course start.
- [ ] Verify lesson navigation and progress calculation.
- [ ] Verify quiz attempts and expected scoring/state transitions.
- [ ] Verify assignment answer/submission flows.
- [ ] Verify administrative review/feedback where required.
- [ ] Verify course completion rules.

### Resulting documents

- [ ] Verify required learner document generation/storage/download.
- [ ] Confirm production organization/signatory metadata.
- [ ] Verify access control and audit behavior for documents.

Exit criterion: at least one representative learner can complete the whole pilot journey from onboarding through the required result/document without manual database intervention.

## Phase 3 — production operations

Goal: make deployment recoverable, observable and repeatable.

- [ ] Decide the production topology (containers/services, database, Redis, object storage, reverse proxy).
- [ ] Define domain, TLS and proxy configuration.
- [ ] Store production secrets outside Git.
- [ ] Define migration procedure and maintenance constraints.
- [ ] Implement database backup schedule.
- [ ] Perform and document a restore drill.
- [ ] Define object-storage backup/retention requirements.
- [ ] Establish logs and minimum operational monitoring.
- [ ] Define health/readiness checks used during rollout.
- [ ] Define deployment smoke checklist.
- [ ] Define rollback criteria and procedure.
- [ ] Rehearse deploy + rollback before production acceptance.

Exit criterion: the team can deploy a known commit, detect a bad rollout and restore/roll back using documented steps.

## Phase 4 — pilot acceptance and controlled rollout

Goal: move from technical readiness to accepted operational use.

- [ ] Prepare representative production/pilot data.
- [ ] Run role-by-role acceptance scenarios.
- [ ] Verify desktop/mobile public/auth UX.
- [ ] Verify expected load/rate-limiting for the pilot scale.
- [ ] Freeze a release candidate and record its commit/migration state.
- [ ] Run production preflight.
- [ ] Deploy controlled release with sensitive flags disabled where appropriate.
- [ ] Smoke production.
- [ ] Enable approved controlled features.
- [ ] Record release outcome in `STATUS.md`.

## Phase 5 — later integrations and business modules

These are intentionally **not assumed to be implemented** today. Each requires its own requirements, data model, security/legal review, acceptance criteria and roadmap item before development starts.

Potential later areas:

- FRDO integration;
- EDO integration;
- payments;
- orders/contracts;
- additional external integrations/reporting required by the organization.

Do not let future integration ideas block stabilizing the core pilot unless an explicit business priority changes this ordering.

## Roadmap discipline

For every roadmap item moved to "done":

1. identify the exact merged commit/PR;
2. record the relevant tests/smokes;
3. update `STATUS.md` if readiness changed;
4. update `DECISIONS.md` if a durable decision changed;
5. keep operational changes reproducible in `RUNBOOK.md`.
