# Learner Documents Backend/API Contract

learner_documents_backend_api_contract=ready
stage80_3_next_stage=80.4

## Scope

This contract prepares the backend/API runtime stage for learner documents.

The contract is based on:

- Stage 79 learner documents UX.
- Stage 80.1 backend/API inventory.
- Stage 80.2 backend/API implementation plan.
- Production checkpoint: Stage 80.2 / 10a3168.

This stage does not change runtime code.

## Contract 1 - Learner documents list

Endpoint:

- Method: `GET`
- Path: `/api/v1/account/documents`
- Access: current authenticated account

Purpose:

- Return the list of documents visible to the current learner account.
- Support frontend states from Stage 79:
  - available documents;
  - downloadable documents;
  - waiting-for-publication state;
  - verification-ready documents.

Query parameters:

- `status` ? optional.
- `course_id` ? optional.
- `enrollment_id` ? optional.

Response item fields:

- `id`
- `enrollment_id`
- `course_id`
- `title`
- `document_type`
- `status`
- `file_available`
- `download_url`
- `document_number`
- `verification_code`
- `created_at`
- `issued_at`
- `course_title`

Access control:

- The endpoint must return only documents linked to the current learner context.
- Admin and organization document lists must remain separate.

## Contract 2 - Learner document download/open action

Endpoint:

- Method: `GET`
- Path: `/api/v1/account/documents/{document_id}/download`
- Access: current authenticated account

Purpose:

- Return a safe file response or safe redirect for a document owned by the current learner context.

Rules:

- Check learner ownership before file delivery.
- Return `DOCUMENT_NOT_FOUND` when the document does not belong to the current learner context.
- Return `FILE_NOT_READY` when the document exists but file delivery is not available.
- Do not expose private storage paths.
- File delivery behavior must be deterministic for the frontend.

## Contract 3 - Public document verification

Endpoint:

- Method: `GET`
- Path: `/api/v1/documents/verify`
- Access: public safe response

Query parameters:

- `value` ? required document number or verification code.

Public response fields:

- `status`
- `document_number`
- `verification_code`
- `document_type`
- `course_title`
- `issued_at`
- `organization_name`
- `revoked_at`
- `message`

Rules:

- Return only public-safe fields.
- Do not return private learner fields.
- Do not return private storage paths.
- Support stable frontend states:
  - confirmed;
  - revoked;
  - not found;
  - error.

## Stable statuses

- `available`
- `pending`
- `revoked`
- `not_found`
- `file_missing`
- `error`

## Stable errors

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `DOCUMENT_NOT_FOUND`
- `DOCUMENT_REVOKED`
- `FILE_NOT_READY`
- `PUBLIC_VERIFICATION_NOT_FOUND`
- `PUBLIC_VERIFICATION_ERROR`

## Access control rules

- Learner document list filters by current learner context.
- Learner download/open action validates document ownership before file delivery.
- Admin document endpoints remain separate.
- Organization document endpoints remain separate.
- Public verification returns only public-safe document fields.
- Private file paths are never exposed in public responses.

## Migration decision

This contract stage does not add a migration.

Stage 80.4 must recheck the existing schema before runtime implementation.

Migration is allowed in Stage 80.4 only if current schema cannot safely represent one of the required contract fields.

## Stage 80.4 recommendation

Recommended next stage:

- Stage 80.4 - Learner Documents Backend/API Runtime Contract Implementation

Expected runtime work:

- Stabilize learner document list response.
- Stabilize learner document download/open behavior.
- Stabilize public verification response.
- Add backend tests for learner ownership, not-found, revoked, file-missing, and public verification states.
