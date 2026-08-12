# ObrPortal — environment contract

Last reviewed: 2026-08-12

This document records **non-secret configuration contracts**. Real credentials and secret values must never be committed here or to `.env` tracked by Git.

## Local development defaults

Current development defaults:

| Service | Host port | Notes |
|---|---:|---|
| Frontend | `5173` | Vite development server |
| Backend | `8000` | FastAPI/Uvicorn |
| PostgreSQL | `5432` | primary relational database |
| Redis | `6379` | cache/rate limiting |
| MinIO API | `9000` | S3-compatible object storage |
| MinIO console | `9001` | local administration console |

Current development Compose service/container naming includes:

- `obrportal-postgres`;
- `obrportal-redis`;
- `obrportal-minio`;
- `obrportal-backend`;
- `obrportal-frontend`.

These names/ports describe the development stack and are not a production topology commitment.

## Application/security variables

Examples represented in `.env.example` include:

- `APP_NAME`
- `APP_VERSION`
- `ENVIRONMENT`
- `API_PORT`
- `FRONTEND_PORT`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`

`SECRET_KEY` must be replaced with a strong environment-specific secret outside Git for any real deployment.

## PostgreSQL

Relevant variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`

Local example credentials are development defaults only. Production credentials must be supplied through environment/secret management.

## Redis

Relevant variable:

- `REDIS_URL`

Local default uses Redis database `0`. Isolated local test environments may use a different logical DB, but that is a testing convention rather than the production design.

## Public registration and password protection

Relevant configuration includes:

- `PUBLIC_REGISTRATION_ENABLED`
- `PUBLIC_REGISTRATION_RATE_LIMIT_WINDOW_SECONDS`
- `PUBLIC_REGISTRATION_RATE_LIMIT_EMAIL_MAX_ATTEMPTS`
- `PUBLIC_REGISTRATION_RATE_LIMIT_CLIENT_MAX_ATTEMPTS`
- password recovery rate-limit settings supported by the current branch/configuration.

Safe default:

```text
PUBLIC_REGISTRATION_ENABLED=false
```

Do not change the production default merely because registration code is deployed.

## Frontend/backend URL relationship

Relevant variables:

- `PUBLIC_BASE_URL` — public frontend base used for generated setup/recovery links;
- `VITE_API_BASE_URL` — preferred frontend API base URL;
- `VITE_API_URL` — legacy compatibility alias where supported.

Generated email links must use the real public frontend URL for the target environment.

## SMTP/email delivery

Backend configuration supports email-delivery variables/aliases including:

- `EMAIL_DELIVERY_ENABLED` / supported SMTP enablement alias;
- `EMAIL_FROM_ADDRESS`;
- `EMAIL_FROM_NAME`;
- `SMTP_HOST`;
- `SMTP_PORT`;
- `SMTP_USERNAME`;
- `SMTP_PASSWORD`;
- `SMTP_USE_TLS`;
- `SMTP_USE_SSL`;
- optional timeout/provider-compatible aliases supported by current backend settings.

Rules:

- `SMTP_PASSWORD` is secret and must never be committed or printed in diagnostic output;
- sender address should be a mailbox/identity authorized by the SMTP provider;
- TLS/SSL settings must match the provider's documented connection mode;
- real email delivery must be validated end-to-end before production registration is certified.

### Observed domain mail routing (external, time-sensitive)

On 2026-08-12, DNS for `rcdo02.ru` resolved MX records under `nicmail.ru` and SPF redirected to `nicmail.ru`. This observation is informational only and must be rechecked when SMTP is actually configured; external DNS/provider state can change.

No mailbox password or other provider secret belongs in this repository.

## S3 / MinIO

Relevant variables:

- `S3_ENDPOINT_URL`
- `S3_PUBLIC_ENDPOINT_URL`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET_PRIVATE`
- `S3_BUCKET_PUBLIC`

Local MinIO defaults are not appropriate production secrets. Production object-storage endpoint, policy, bucket visibility and credentials must be decided explicitly.

## Seed/demo variables

The development environment supports seed organization/demo learning values. These are conveniences for local/test data and must not be confused with authoritative production organization data.

Examples include organization identifiers/addresses and demo course/group values.

## Generated document metadata

The application supports environment-driven organization/signatory metadata for generated documents, including organization name/address/identifiers and signer position/name.

Before production document generation, replace demonstration/default values with approved authoritative organization metadata and verify resulting documents.

## CORS

Allowed frontend origins are environment-specific. When frontend/backend ports or domains differ from defaults, configure backend CORS explicitly and test browser requests from the actual frontend origin.

Do not use permissive wildcard CORS as a shortcut for an authenticated production application without an explicit security decision.

## Environment classes to maintain

At minimum, distinguish:

1. **local development** — developer machine, disposable/test values;
2. **isolated release/acceptance** — separate DB/Redis namespace/ports where needed, known commit under test;
3. **production** — real domain/TLS/secrets/storage/SMTP/backups/monitoring.

Never infer that because a value works in local development it is approved for production.

## Secret handling checklist

- [ ] `.env` remains ignored/untracked.
- [ ] no real credentials in commits, PR text, screenshots or logs;
- [ ] CI secrets use the repository/platform secret store;
- [ ] production secrets are managed outside Git;
- [ ] diagnostic scripts show `<SET>` rather than secret values;
- [ ] rotate any credential immediately if it is accidentally committed or publicly exposed.
