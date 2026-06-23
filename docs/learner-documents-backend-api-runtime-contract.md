# Learner Documents Backend/API Runtime Contract Implementation

learner_documents_backend_api_runtime_contract=ready
stage80_4_next_stage=80.5

## Implemented contract areas

### Learner documents list

Endpoint:

- GET /api/v1/account/documents

Implemented:

- status filter;
- course_id filter;
- enrollment_id filter;
- stable download_url field;
- stable created_at field;
- stable issued_at field.

### Learner document download/open

Endpoint:

- GET /api/v1/account/documents/{document_id}/download

Confirmed:

- current account is required;
- document lookup is constrained by current user id;
- non-owned document id returns not found before file delivery;
- unavailable document returns conflict;
- missing file returns conflict;
- private storage path is resolved server-side only.

### Public document verification

Endpoint:

- GET /api/v1/public/documents/verify

Implemented:

- existing number parameter remains supported;
- new value parameter is supported;
- status field is returned;
- organization_name field is returned;
- message field is returned.

## Tests

Added targeted backend contract tests:

- backend/app/tests/test_learner_documents_backend_api_contract.py

Covered:

- learner document contract fields;
- learner document list filters;
- public verification by value;
- public verification by number;
- foreign learner download rejection.

## Runtime deployment notes

Stage 80.4 changes backend runtime only.

Deployment must rebuild/restart backend service only. Frontend rebuild is not required for production runtime, but frontend build remains in checks to protect existing frontend bundles.
