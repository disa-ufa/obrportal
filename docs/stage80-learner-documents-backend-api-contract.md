# Stage 80.3 - Learner Documents Backend/API Contract

learner_documents_backend_api_contract_status=implementation_ready
stage80_3_release_manifest_required=yes
stage80_3_guard_required=yes
stage80_3_docs_contract_only=yes
stage80_3_runtime_changes=no
stage80_3_frontend_runtime_changes=no
stage80_3_backend_runtime_changes=no
stage80_3_database_changes=no
stage80_3_migrations_added=no
stage80_3_next_stage=80.4

## Goal

Define the backend/API contract for the learner documents flow before runtime implementation.

This stage is intentionally docs/contract-only. It does not change backend runtime, frontend runtime, database schema, migrations, auth, RBAC, or production config.

## Contract artifacts

Generated artifacts:

- `docs/learner-documents-backend-api-contract.md`
- `docs/learner-documents-backend-api-contract.json`

## Baseline

- Production checkpoint: Stage 80.2 / 10a3168.
- Document-related backend routes in inventory: 11.
- Course/enrollment/progress routes in inventory: 29.
- Document-related backend definitions in inventory: 324.
- Frontend document/verification usage records in inventory: 300.

## Contract areas

- Learner documents list.
- Learner document download/open action.
- Public document verification.
- Stable response fields.
- Stable statuses and errors.
- Access control rules.
- Migration decision for the next runtime stage.

## Safety

- Docs/contract-only.
- Frontend runtime is not changed.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
