# Learner Documents Backend/API Implementation Plan

learner_documents_backend_api_plan=ready
stage80_2_next_stage=80.3

## Scope

This plan prepares backend/API work for the learner documents flow.

The plan is based on:

- Stage 79 learner documents UX closure.
- Stage 80.1 backend/API inventory.
- Production checkpoint: Stage 80.1 / a6eeef7.

This stage does not change runtime code.

## Current inventory summary

- Document-related backend routes: 11.
- Course/enrollment/progress routes: 29.
- Document-related backend definitions: 324.
- Frontend document/verification usage records: 300.

## Backend implementation questions to answer in Stage 80.3

1. Source of truth for learner-visible documents.
   - Decide which backend object is authoritative for documents shown to the learner.
   - Confirm whether document availability is derived from document status, file flag, file URL, or generation state.
   - Confirm how document type, title, course, enrollment, issue date, number, and verification code map to response fields.

2. Learner documents endpoint.
   - Confirm the learner endpoint that returns documents available to the current account.
   - Ensure the endpoint returns only documents that belong to the current learner context.
   - Ensure the response has stable fields for frontend UX:
     - document id;
     - enrollment id;
     - course id;
     - title;
     - document type;
     - document status;
     - file availability flag;
     - download/open URL or download action metadata;
     - document number;
     - verification code;
     - created/issued date.

3. Download/open action.
   - Decide whether the existing file URL is enough.
   - If file delivery should be controlled by backend, plan a dedicated learner download endpoint.
   - Ensure the download flow checks learner ownership before returning a file or redirect.
   - Ensure missing file states return a clear error code and safe message.

4. Public verification endpoint.
   - Confirm public verification accepts only document number or verification code.
   - Confirm public verification returns only safe public fields.
   - Confirm revoked/not-found/error states are stable for frontend handling.
   - Confirm QR links route to the same public verification flow.

5. Completed course to document handoff.
   - Confirm course completion writes enough information for later document publication.
   - Confirm completed enrollment can be connected to an issued document.
   - Confirm frontend can show waiting-for-publication state without additional runtime calls.

6. Access control review.
   - Check learner endpoints by current account context.
   - Check admin endpoints separately.
   - Check organization endpoints separately.
   - Avoid cross-learner document visibility.
   - Avoid exposing private file paths in public responses.

7. Migration decision.
   - Prefer current schema if required fields already exist.
   - Add migration only if a required field is missing or ambiguous.
   - Stage 80.3 must explicitly state whether database migration is required before runtime implementation.

## Proposed Stage 80.3 direction

Stage 80.3 should be a backend/API runtime stage only if the plan confirms implementation gaps.

Recommended Stage 80.3 name:

- Stage 80.3 - Learner Documents Backend/API Contract

Recommended Stage 80.3 outcome:

- Add or stabilize learner document API response contract.
- Add or stabilize safe document download/open behavior.
- Add or stabilize public verification response contract.
- Add backend tests for ownership, not-found, revoked, file-missing, and public verification states.

## Non-goals

- Do not redesign the Stage 79 frontend UX.
- Do not change production config.
- Do not add database migration unless the contract review proves it is required.
- Do not change unrelated course builder, account, organization, or admin flows.

## Acceptance criteria for the next runtime stage

- Learner can request only their own documents.
- Learner document response contains all fields needed by Stage 79 UI.
- Download/open action is safe and deterministic.
- Public verification response is safe and deterministic.
- Missing file and waiting states are clear.
- Tests cover learner ownership and public verification states.
