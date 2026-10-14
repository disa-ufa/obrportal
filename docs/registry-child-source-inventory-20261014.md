# M2.1.1 — document/context source scope inventory (14 October 2026)

This is a **read-only code audit**, not a new authorization rule, migration, production gate, or proof that existing writers are concurrency-safe.

## Baseline and review scope

- Cumulative parent: Draft #189, exact HEAD `d39f7e73d2550169933df5ea3cfa168ed458cb51`. #167–189 are stacked and **unmerged**; #166 is independent. Main remains `aa4a36780eed12b898f8f8d30f50dcb3aff24466`.
- Review this document incrementally against #189, never as an independent change to main.
- This document covers the code's **direct document/context parent relationships and reachable mutation entrypoints**, not a claim to have audited every SQL write in the entire repository.
- No local Stage17B or production history was inspected.

## Authoritative persisted relationships

| Source | Persisted relationship | Failure/absence mode |
| --- | --- | --- |
| `DocumentRecord` | `user_id` required; `course_id` optional; `enrollment_id` nullable/unique when present | Standalone document has no trusted enrollment; do not infer from course/user or an API parameter |
| `RegistryObligation` | `enrollment_id` required; `document_id` nullable and independent of document's enrollment FK | An obligation may point at an absent/other-enrollment document; don't treat the pointer as authoritative without a consistency check |
| `FrdoRegistryContext` | `obligation_id` required and unique | Parent obligation/registry must be validated before deriving enrollment; first context insert has no existing row to lock |
| `MintrudRegistryContext` | `obligation_id` required and unique | Same absent-child/registry-mismatch concern |
| `Enrollment` | course, learner, and optional organization link | An old/new relationship change affects both parent scopes; no cached relationship is authority |

Evidence: `backend/app/models/document_record.py`, `registry_obligation.py`, `frdo_registry_context.py`, `mintrud_registry_context.py`, `enrollment.py`.

## Existing routes and service producers

All admin paths are relative to `/api/v1/admin`.

| Entry point | Confirmed behavior in current code | Required future cooperation |
| --- | --- | --- |
| `POST /documents` (`admin.py:create_admin_document`) | Permits optional course/enrollment; verifies the selected learner and course when enrollment supplied; inserts document and optionally uploads file | For linked creation, derive and fence trusted enrollment **before** any write/file side effect. For standalone documents, keep separate semantics; never invent an enrollment |
| `PATCH /documents/{id}` (`update_admin_document`) | Can edit course/enrollment and replace files; prelocks only selected approved obligations when deemed approval-relevant; updates document and invalidates approval when chosen fields change | Resolve **old and proposed new** parent scopes before any locks/writes; validate identities; document/file changes and both registries must share protocol |
| `DELETE /documents/{id}` | Deletes linked document, commits, then removes file | Old parent/source locks, related obligations, FK effects and file cleanup require coordination |
| `POST /documents/{id}/regenerate` | Recreates generated document file; some cases prelock existing approval | Trusted existing parent and shared fences before file/update; prevent stale approval |
| `PATCH /frdo/obligations/{id}/context` | Locks FRDO obligation first, then `FrdoRegistryContext` row if present; inserts it if absent | Resolve verified FRDO obligation -> enrollment before source fences; do not add new fences after legacy obligation lock |
| `PATCH /mintrud/obligations/{id}/context` | Same obligation-first/context-second pattern for Mintrud | Same protocol and first-insert protection |
| `PATCH /enrollments/{id}` | Updates status, organization, group, dates; completed state invokes completion service | Enrollment/course/learner/old and new organization dependency review |
| `DELETE /enrollments/{id}` | Refuses deletion when a document is linked by `DocumentRecord.enrollment_id` | Separate audit of obligations and indirect document pointers required |
| `ensure_enrollment_completed` | Flushes completion, ensures document then both-registry obligations | Must eventually classify each registry independently under shared fences |
| `ensure_completion_document_for_enrollment` | Returns existing linked document or inserts one, then generates PDF | Enrollment parent fence covers absent document; file/transaction consistency needs review |
| `ensure_registry_obligations_for_completed_enrollment` | Evaluates legacy per-course requirements and inserts lifecycle records for both registries when absent; enriches a missing `document_id` on existing obligation | Not yet the new independent applicability writer; protect absent obligations, history, document association and apply cohort policy |

Relevant code: `backend/app/api/v1/admin.py` functions above, `backend/app/services/completion_documents.py`, `enrollment_completion.py`, `compliance_registry_obligations.py`, `compliance_registry_approval_invalidation.py`. Other import/admin/worker producers must be inventoried before **live adoption**, not assumed absent.

## Fail-closed resolver requirements for M2.1.2

1. Resolve persisted child identity/parent from **fresh scalar PostgreSQL projections**, not caller-provided `user_id`, `course_id`, `enrollment_id` or cached ORM objects.
2. For an existing document, require canonical UUID and explicit linked enrollment for registry-scoped operations. Validate `document.user_id == enrollment.user_id` and, when document course is present, `document.course_id == enrollment.course_id`. Reject conflicting obligation.document_id references to another enrollment; do not silently select one.
3. For existing FRDO/Mintrud contexts, join via matching obligation and require the registry matches context kind. Return exact trusted enrollment/course/learner/organization dependency.
4. Distinguish missing child for *creation* from missing child for *editing*; first insert must be protected by verified parent enrollment/obligation keys. `FOR UPDATE` on an absent row is ineffective.
5. For link moves/detach or record replacement, resolve **both** current and proposed parents. Verify that the proposed enrollment actually exists and that required identity/course invariants hold; union all old/new source keys **before any lock**. Never add an earlier-sorted key after later locks.
6. After obtaining the common ordered fences, rediscover relationships. A changed old/new scope means rollback and a **fresh transaction**; no permissive fallback or mixed snapshots.
7. The resolver is a **dependency discovery primitive only**. It must never authorize `approve`, `export`, batch creation, file download or result reporting, and must not write/commit or activate production routes.

## Specific unsafe assumptions to test

- Nullable `DocumentRecord.enrollment_id` is not proof of any enrollment even if `user_id`/`course_id` match.
- `RegistryObligation.document_id` does not establish linked document ownership by itself.
- Document linked to enrollment A, but obligation of B refers to that document: reject as inconsistent.
- Context exists but its obligation is missing or belongs to the opposite registry: reject.
- Document/context insertion after first discovery; reassignment while another transaction waits.
- Concurrent file regeneration and new export; rollback of DB while file is written.
- Existing legacy approval prelocks cover only selected approved rows, not a pending first approval.
- `READ COMMITTED` plus uncoordinated writers is **not** commit-time freshness, even with repeated reads.

## Gate to finish this audit / proceed

- [x] Inspect persisted child/parent model relationships.
- [x] Identify main manual document create/update/delete/regenerate paths.
- [x] Identify FRDO and Mintrud context update/create-on-missing paths.
- [x] Identify automatic completion document/obligation producers and enrollment edit/delete routes.
- [x] Record risks, safe resolver invariants and missing-path caveat.
- [ ] Confirm full GitHub CI on this exact documentation-only commit.
- [ ] Review this audit before beginning M2.1.2 resolver code.

**M2.1 as a whole is NOT done.** No API changes, source locks, migration, historical backfill, role policy, external government interaction, feature flag, or production deployment is included. Two known legacy XFAIL remain intentionally unresolved.
