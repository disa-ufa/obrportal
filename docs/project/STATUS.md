# ObrPortal — current status

Last audited: 2026-08-12

This file is the canonical concise answer to **"where is the project now?"**. Update it whenever a merged or accepted change materially changes readiness, branch strategy or the next priority.

## Audited Git state

### `main`

- SHA: `03bb3f38a5c9e742daa3d6694985b78251e8ae8f`
- latest audited change: merge of PR #116 (`feat: modernize public auth interface`)

`main` is the integration baseline, but at the time of this audit it is **not the most functionally advanced branch**.

### Active broader development branch

- branch: `feature/pilot-course-readiness`
- SHA: `cdc06de1c5b0fac3b3e324e7a36032aaa06dfb4c`
- relation to audited `main`: **28 commits ahead, 0 behind**

This branch contains broader pilot/course readiness work beyond `main`. It must not be silently replaced by a narrower release branch.

### Open registration-hardening release PR

- PR: #117 — `feat: harden public registration release flow`
- branch: `release/public-registration-hardening`
- SHA: `ad6f399daf7ceedd41e09eb75a067eb5a5a4d278`
- base: `main@03bb3f38...`
- relation to base: 3 commits ahead, 0 behind
- state at audit: open, mergeable, not draft
- scope: 17 changed files, no Alembic migrations

PR #117 is a **narrow, independently verified registration hardening slice**, not the latest whole-application state. The active broader feature branch and PR #117 diverge after the same `main` baseline and require an explicit integration decision.

## Important branch conclusion

There is currently no single branch that can be described without qualification as both:

1. the most functionally advanced version of the whole product; and
2. the clean release/integration baseline.

Until branch reconciliation is completed:

- use `main` as the integration baseline;
- use `feature/pilot-course-readiness` when assessing the latest broad functional work;
- use PR #117 when assessing the isolated public-registration hardening release slice;
- compare branches before starting work instead of relying on branch names or chat history.

## Verified registration release test

PR #117 / `ad6f399` was run locally in an isolated environment on 2026-08-12 without disturbing the normal local stack.

Verified end-to-end behavior:

- public registration status enabled in the isolated runtime;
- registration request returned neutral HTTP 202 / `accepted`;
- a new inactive/unverified user was created;
- canonical `learner_fl` role was assigned;
- resend returned the same neutral accepted contract;
- initial password setup activated the user and marked email verified;
- login succeeded;
- `/me` returned the expected role and active/verified state;
- reuse of the one-time setup token was rejected with HTTP 400;
- registration/login audit events were written.

Real SMTP delivery was deliberately disabled during this test. `public_registration.email_failed` audit entries were therefore expected.

The raw setup token used to finish the isolated test was generated through the project's own token service because raw tokens are intentionally not stored in the database. Consequently that synthetic test token did not originate from an actual sent registration email; real email-link completion remains to be validated.

## Capability readiness matrix

Status terms:

- **Implemented** — substantial backend/frontend/data path exists and is used/tested in the repository.
- **Implemented / verify integration** — substantial implementation exists, but current branch divergence means final integrated behavior must be revalidated.
- **Not production-certified** — implementation may exist, but operational end-to-end production acceptance is incomplete.
- **Future / not evidenced as complete** — do not claim this module is implemented without new code evidence.

| Capability | Audited status | Notes |
|---|---|---|
| Authentication | Implemented | Login/current-user/token flows exist. |
| RBAC | Implemented | Backend roles/permissions are substantial; keep authorization backend-enforced. |
| Public registration | Implemented / verify integration | PR #117 hardening independently passed isolated E2E except real SMTP. Disabled by default. |
| Initial password setup | Implemented | One-time hashed token design and activation path verified locally. |
| Password recovery | Implemented / verify integration | Code path exists; real SMTP-dependent completion still needs target-environment validation. |
| Learner bulk import | Implemented / verify integration | Substantial import workflow exists; active branch contains ongoing/hardening history. |
| Organization profile/cabinet | Implemented / verify integration | Substantial organization-facing API/UI exists and active branch contains broader evolution. |
| Public catalog/courses | Implemented | Substantial public/catalog/course implementation is present. |
| Course/content administration | Implemented / verify integration | Course/lesson/content studio work is substantial across merged/active history. |
| Lessons | Implemented / verify integration | Lesson content and learner consumption paths exist. |
| Enrollments/groups/progress | Implemented / verify integration | Substantial learner/group/enrollment/progress behavior exists. |
| Quizzes/attempts | Implemented / verify integration | Learning assessment path exists. |
| Assignments/submissions/review | Implemented / verify integration | Submission/review-related work exists; integrated active-branch behavior should be tested as a whole. |
| Learner documents | Implemented / verify integration | Document APIs/storage/generation-related behavior exists. |
| Audit trail | Implemented | Used for security-sensitive/auth flows. |
| Object storage | Implemented locally | MinIO/S3 integration exists; production storage configuration remains environment-specific. |
| SMTP/email delivery | Not production-certified | Code exists, but target mailbox/SMTP configuration and true email E2E are not yet validated. |
| Production deployment | Not production-certified | No single audited canonical production deployment/rollback/backup runbook was found. |
| Payments | Future / not evidenced as complete | Do not infer implementation from roles/permissions or future concepts. |
| Orders/contracts | Future / not evidenced as complete | Requires explicit requirements and dedicated implementation evidence. |
| FRDO integration | Future / not evidenced as complete | Requires explicit requirements and dedicated implementation evidence. |
| EDO integration | Future / not evidenced as complete | Requires explicit requirements and dedicated implementation evidence. |

## CI and quality state

PR #117 records successful verification including backend tests, targeted registration smoke coverage, frontend build/checks, encoding/BOM guards and GitHub Actions CI.

The broader `feature/pilot-course-readiness` branch must be treated separately: before promoting it as the next integration baseline, run its current full CI/smoke suite against its actual HEAD and resolve any branch-specific failures rather than borrowing PR #117's green status.

## Operational state

The repository has a useful local Docker Compose development stack and existing check/smoke scripts, but the 2026-08-12 audit did not identify one canonical, current production runbook covering all of:

- deployment;
- migration procedure;
- backup and restore drill;
- rollback;
- production secrets;
- SMTP;
- TLS/domain/reverse-proxy strategy;
- monitoring/logging;
- post-deploy smoke.

That gap is tracked in `ROADMAP.md` and `RUNBOOK.md` deliberately labels production procedure as not yet certified.

## Current priority order

1. **Reconcile Git history deliberately.** Decide how PR #117's three registration-hardening commits should be integrated with the broader `feature/pilot-course-readiness` work without losing either line of development.
2. **Establish the near-term canonical integration branch.** Run full current checks on the broader feature HEAD, split/merge coherent slices, and move accepted work toward `main`.
3. **Validate real SMTP end-to-end.** Configure a dedicated sender safely, register through the UI, receive the actual email, open the real setup link, set the password and verify audit completion.
4. **Close pilot learning-flow gaps.** Test the actual learner journey end-to-end across organization onboarding/import, enrollment, course/lesson consumption, progress, assessments/assignments and documents.
5. **Create and validate production operations.** Backup/restore, deploy/migrate, smoke, monitoring and rollback must be rehearsed before declaring the platform production-ready.

## What is explicitly not the next step

- Do not blindly merge all historical branches.
- Do not delete old branches merely because there are many of them; first classify them.
- Do not call PR #117 "the latest version of ObrPortal".
- Do not enable public registration in production just because registration code is merged.
- Do not begin payments/FRDO/EDO work until the pilot core and production foundation are intentionally prioritized and their requirements are defined.
