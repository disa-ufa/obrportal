# Stage 80.4 - Learner Documents Backend/API Runtime Contract Implementation

learner_documents_backend_api_runtime_contract_status=implementation_ready
stage80_4_release_manifest_required=yes
stage80_4_guard_required=yes
stage80_4_backend_runtime_changes=yes
stage80_4_frontend_runtime_changes=no
stage80_4_database_changes=no
stage80_4_migrations_added=no
stage80_4_next_stage=80.5

## Goal

Implement the Stage 80.3 backend/API contract without database migrations.

## Runtime changes

- Learner documents list now supports optional filters:
  - status;
  - course_id;
  - enrollment_id.
- Learner documents list now returns stable contract fields:
  - download_url;
  - created_at;
  - issued_at.
- Learner document download keeps ownership filtering before file delivery.
- Public document verification supports both:
  - number;
  - value.
- Public document verification now returns additional stable public fields:
  - status;
  - organization_name;
  - message.

## Migration decision

No database migration is required for this stage.

Required fields are already available in the current schema:

- DocumentRecord.created_at
- DocumentRecord.generated_at
- DocumentRecord.storage_path
- DocumentRecord.document_number
- DocumentRecord.verification_code
- DocumentRecord.status
- DocumentRecord.course_id
- DocumentRecord.enrollment_id

## Safety

- Backend runtime changed.
- Frontend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
