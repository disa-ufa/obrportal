# ObrPortal — working instructions for AI and developers

This repository is the source of truth for the ObrPortal project.

## Mandatory orientation before changing code

Before any non-trivial task, read in this order:

1. `docs/project/STATUS.md`
2. `docs/project/PROJECT.md`
3. `docs/project/DECISIONS.md`
4. `docs/project/ARCHITECTURE.md`
5. `docs/project/ROADMAP.md`
6. `docs/project/RUNBOOK.md` when the task touches local/production operations
7. `docs/project/ENVIRONMENT.md` when the task touches ports, services or environment variables

Then verify the current Git branch, HEAD, open PRs and relevant CI state. Do not assume that `main` contains the latest functional work.

## Source-of-truth priority

When information conflicts, use this priority:

1. current repository code and migrations
2. current branch and open PR state on GitHub
3. `docs/project/STATUS.md`
4. canonical decisions in `docs/project/DECISIONS.md`
5. historical stage documents and old chat context

Historical `docs/stage-*` documents describe past milestones. They are not a substitute for `STATUS.md`.

## Git safety rules

- Never merge, rebase, force-push, delete branches, drop databases or alter production without an explicit request.
- Keep feature branches short-lived where practical.
- Prefer one coherent feature/fix per PR.
- Update `docs/project/STATUS.md` whenever a merged change materially changes project readiness or the next priority.
- Update `docs/project/DECISIONS.md` when a durable product/architecture decision is made.
- Treat secrets as local/CI secret values only. Never commit real credentials to the repository.

## Definition of done for a functional change

A change is not considered done solely because the UI renders. Check, as applicable:

- backend behavior
- migrations/schema compatibility
- frontend behavior and error states
- authorization/RBAC boundaries
- tests and CI
- audit trail for security-sensitive flows
- local smoke test
- production rollout/rollback implications
- documentation/status update

## Registration-specific rules

Public self-registration is a controlled feature. It is disabled by default in configuration and must not be enabled in production merely by merging code. Registration, email delivery and rollout are separate concerns.

Do not weaken neutral responses, one-time token handling, rate limits, role assignment or audit behavior without an explicit security review.

## Working style

For each new task:

1. state the exact branch/commit being operated on;
2. identify whether the task belongs to `main`, an active feature branch, or an open PR;
3. make the smallest coherent change;
4. run targeted checks first, then broader checks when appropriate;
5. summarize what changed, what was tested and what remains;
6. update the project passport when the project state changed materially.
