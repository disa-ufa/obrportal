# ObrPortal — canonical decisions

Last reviewed: 2026-08-12

This file records durable decisions. It is not a changelog. Add or amend an entry when a decision should remain true across chats, branches and future implementation work.

## D-001 — Repository state is the primary source of truth

**Decision:** Current code, migrations, Git refs and tests take precedence over chat memory and historical stage notes.

**Consequence:** Before substantial work, identify the exact branch/commit and read `STATUS.md`.

## D-002 — `STATUS.md` is the canonical current-state summary

**Decision:** Historical stage documents remain useful evidence of past milestones, but they do not define today's readiness.

**Consequence:** Material integration/readiness changes must update `STATUS.md`.

## D-003 — Public self-registration is controlled and disabled by default

**Decision:** `PUBLIC_REGISTRATION_ENABLED=false` is the safe default.

**Consequence:** Merging registration code must not automatically expose registration in production. Enablement is a separate approved rollout action.

## D-004 — Public registration starts without a password

**Decision:** The public registration form collects identity/contact/legal-consent data, not a user-chosen password.

**Consequence:** The user sets the password only after following a dedicated email/setup-token flow.

## D-005 — Public registration/resend use a neutral accepted contract

**Decision:** Registration and resend should avoid revealing whether an account/email exists when it is safe to do so, using a neutral accepted response.

**Consequence:** Do not replace neutral behavior with account-enumerating messages without a security decision.

## D-006 — Initial password/setup tokens are one-time secrets

**Decision:** Setup/recovery tokens are high-entropy, expire, are usable once, and raw token values are not persisted in the database.

**Implementation invariant:** Store a hash suitable for lookup; invalidate/mark tokens used after successful completion.

## D-007 — Registration/password abuse protection uses rate limiting

**Decision:** Redis-backed rate limiting protects public registration/resend/password-related endpoints.

**Consequence:** Do not silently bypass rate limiting when Redis is required; failure behavior should remain safe.

## D-008 — Canonical public self-registration role is `learner_fl`

**Decision:** A successfully prepared public physical-person registration is associated with the canonical learner role `learner_fl`.

**Consequence:** Seed/migration/runtime environments that support public registration must contain the canonical role.

## D-009 — Security-sensitive identity actions are auditable

**Decision:** Important registration, password and login outcomes should write audit events.

**Consequence:** Security fixes must preserve or improve auditability rather than treating audit events as optional logging.

## D-010 — Email delivery and registration enablement are independent

**Decision:** The ability to expose registration and the ability to send email are separate configuration/rollout concerns.

**Consequence:** A release may contain registration code while keeping registration disabled; local tests may disable real email, but production acceptance requires a real SMTP end-to-end test.

## D-011 — Secrets are never committed

**Decision:** Real SMTP passwords, database credentials, signing secrets, S3 credentials and comparable secrets stay outside Git.

**Consequence:** `.env.example` contains examples/defaults only; real values belong in local/CI/production secret management. Sensitive settings should avoid accidental repr/logging.

## D-012 — Frontend API URL uses `VITE_API_BASE_URL`

**Decision:** `VITE_API_BASE_URL` is the preferred frontend API base configuration. `VITE_API_URL` remains a legacy compatibility alias where supported.

## D-013 — Local development uses the composed service stack

**Decision:** The current local development architecture uses PostgreSQL, Redis and S3-compatible MinIO alongside backend/frontend services.

**Consequence:** Local-development defaults must not be mistaken for production credentials/topology.

## D-014 — Production rollout is disabled-first for controlled features

**Decision:** For public registration and similar controlled capabilities: deploy code/config with the feature disabled, run production smoke checks, then enable it separately after verification/approval.

## D-015 — UI visibility is not authorization

**Decision:** Roles/permissions must be enforced by backend authorization.

**Consequence:** Hiding a menu/page in React is UX, not a security boundary.

## D-016 — Readiness means end-to-end behavior

**Decision:** A page, permission, model or endpoint alone does not make a product module complete.

**Consequence:** Readiness assessment considers UI, API, data, migrations, permissions, tests, audit and operational rollout.

## D-017 — Payments/orders/FRDO/EDO are not assumed implemented

**Decision:** Future names in roles, permissions, ideas or historical planning are insufficient evidence of a complete module.

**Consequence:** These areas remain future work until dedicated requirements and implementation/testing evidence exist.

## D-018 — Git destructive/integration operations require explicit intent

**Decision:** Do not automatically merge/rebase/force-push/delete branches, drop databases or modify production as a side effect of analysis/documentation.

**Consequence:** Branch cleanup and integration are deliberate follow-up tasks after classification/testing.

## D-019 — Keep future change slices reviewable

**Decision:** Prefer coherent, reasonably short-lived feature/fix branches and reviewable PRs over accumulating many unrelated stages indefinitely on one branch.

**Consequence:** The current broad active branch should be reconciled deliberately, after which future work should move toward smaller integration slices where practical.

## D-020 — Update the passport as part of completion

**Decision:** When accepted work changes project readiness, architecture, durable decisions, environment contracts or operational procedures, updating the relevant `docs/project/*` file is part of the task's definition of done.
