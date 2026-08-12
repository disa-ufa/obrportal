# ObrPortal — architecture

Last reviewed: 2026-08-12

## High-level topology

ObrPortal is currently a web application composed of:

- **Frontend:** React + Vite;
- **Backend:** FastAPI / Python;
- **Primary database:** PostgreSQL;
- **Cache/rate-limit store:** Redis;
- **Object storage:** S3-compatible storage, MinIO in local development;
- **Schema migrations:** Alembic;
- **Local orchestration:** Docker Compose.

The current `docker-compose.yml` is a development topology. Its fixed container names, bind mounts, development server commands and host port mappings must not be treated as a final production deployment design.

## Frontend

The frontend is a React application built and served in development by Vite.

The application contains public routes and authenticated/admin/organization/learner-facing pages. API requests are centralized through the frontend API client.

API base URL resolution prefers:

1. `VITE_API_BASE_URL`;
2. legacy `VITE_API_URL`;
3. the development fallback when applicable.

Frontend visibility and route guards improve UX, but security authorization remains a backend responsibility.

## Backend

The backend is a FastAPI application. Its API is organized into functional route groups including:

- authentication;
- account/learner-facing operations;
- administration;
- organization-facing operations;
- public endpoints;
- system/health/readiness operations.

Major backend concerns include:

- users and identities;
- roles and permissions;
- organizations;
- courses, lessons and content;
- enrollments and learning groups;
- progress;
- quizzes and attempts;
- assignments/submissions/review;
- documents;
- learner imports;
- one-time password/setup tokens;
- audit events.

## Data storage

### PostgreSQL

PostgreSQL is the system of record for application entities. Schema evolution is managed through Alembic migrations.

Migration state is part of release correctness. New deployments must run against the expected revision, and CI should continue to validate migration chains on a clean database.

### Redis

Redis is used for ephemeral concerns such as rate limiting. Public registration and other identity-sensitive flows rely on Redis-based limits and should fail safely when required rate-limit infrastructure is unavailable.

### S3 / MinIO

The application has S3-compatible object storage integration. Local development uses MinIO with separate public/private bucket configuration.

Production object-storage credentials and endpoints are environment-specific secrets/configuration and must not be committed.

## Authentication and security architecture

The application uses token-based authentication and backend-enforced RBAC.

Security-relevant design points include:

- public self-registration is disabled by default;
- self-registration assigns the canonical `learner_fl` role;
- initial registration does not ask the user to choose a password in the public form;
- password setup/recovery use high-entropy one-time tokens;
- raw password setup tokens are intentionally not persisted; a deterministic SHA-256 hash is stored for lookup;
- setup tokens expire and are invalidated/marked used after successful use;
- registration/resend use neutral accepted responses to reduce account enumeration risk;
- Redis-backed rate limiting protects registration/password flows;
- security-sensitive operations emit audit events;
- SMTP password configuration is treated as a secret value by backend settings.

## Email delivery

The backend contains SMTP/email-delivery support for registration and password recovery. Email delivery and public registration are independent feature/configuration concerns.

As of the 2026-08-12 audit, real SMTP delivery has not yet been validated end-to-end for the target environment. Therefore email-dependent identity flows are implemented in code but not yet production-certified.

## Local development topology

Default local services and ports from the current development configuration are:

- frontend: `5173`;
- backend: `8000`;
- PostgreSQL: `5432`;
- Redis: `6379`;
- MinIO API: `9000`;
- MinIO console: `9001`.

The development compose stack uses bind mounts for backend/frontend source and development server commands.

See `ENVIRONMENT.md` for environment-variable categories and `RUNBOOK.md` for operational workflow.

## Architectural boundaries that must remain explicit

- **Merge vs rollout:** merging source code must not silently enable controlled production features.
- **Frontend vs authorization:** UI state is not authorization.
- **Historical permissions vs implemented modules:** a permission/role name does not prove an end-to-end product module exists.
- **Development Compose vs production:** the local compose file is not a production architecture specification.
- **Documentation vs current code:** when architecture documentation and executable code conflict, inspect and correct the documentation rather than coding to stale prose.
