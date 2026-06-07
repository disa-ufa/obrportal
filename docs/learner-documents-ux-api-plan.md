# Learner documents UX/API connection plan

learner_documents_ux_api_plan=ready
stage79_2_next_stage=79.3

## Current foundation

Stage 79 starts after the learner progress flow has been closed.

The learner can already move through:

1. Course progress.
2. Lesson completion.
3. Course completion.
4. Document handoff from the course page.
5. Navigation to documents and document verification.

Stage 79 now focuses on making the learner documents area clear, safe, and connected to the existing document infrastructure.

## Existing areas to connect

The plan is based on existing repository areas discovered during Stage 79.1:

- frontend documents page;
- frontend document verification page;
- document verification QR block;
- document verification utility;
- backend document PDF service;
- backend document templates;
- backend document-related tests.

## UX plan

The learner documents page should explain:

- whether the learner has documents available;
- which course or completion produced the document;
- document type and status;
- how to download or open a document;
- how to verify a document;
- what to do when the document is not ready yet.

Recommended learner states:

- not signed in;
- signed in with no documents;
- signed in with course completed but document not visible yet;
- document available;
- document verification available;
- API error or network error.

## API connection plan

Stage 79.3 should first use existing frontend API functions and current backend routes.

A new backend endpoint should only be planned after verifying that existing document and verification routes cannot support the learner documents page.

## Data mapping plan

The documents UX should map:

- learner account identity;
- completed enrollment;
- course title;
- document type;
- document status;
- document verification code or verification URL when available.

## Safety plan

Stage 79.3 should remain frontend-only where possible.

Backend runtime changes, database changes, migrations, and RBAC changes should remain out of scope until a separate backend/API stage is explicitly opened.
