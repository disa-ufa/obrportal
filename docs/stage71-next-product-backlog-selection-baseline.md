# Stage 71 - Next product backlog selection baseline

Status: planned
Base branch: develop
Base checkpoint: 3a63a1e
Previous stage: v0.1.0-stage70-release-readiness-checkpoint
Scope: choose next local product development cycle

## Goal

Stage 71 selects the next safe product development direction after the Stage 70 release readiness checkpoint.

## Background

Stages 66-69 improved document verification UX, admin document workflow, organization cabinet PDF readiness hints and admin organization PDF profile explanations.
Stage 70 confirmed the current develop state is locally release-ready for the verified scope.

The next step is to inspect the product backlog and choose one focused implementation cycle.

## Candidate directions

```text
1. Documents workflow follow-up
2. Organization cabinet UX follow-up
3. Admin organization/profile polish
4. Public verification polish
5. Production release planning
6. Technical debt / test coverage hardening
```

## Safety rule

Stage 71 is local planning and selection only. It must not deploy to production, modify production data, restart production services, run production migrations or change server configuration.

## Investigation plan

```text
1. Inspect current docs and recent stage notes.
2. Inspect frontend/backend areas touched in Stages 66-69.
3. Identify small, safe, high-value next task.
4. Document selected next stage.
5. Keep working tree clean before acceptance.
```

## Required checks

```text
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_org_cabinet_page.py
python .\scripts\smoke_org_cabinet_route.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_stage64_release_metadata_alignment.py
python .\scripts\check_release_versioning.py
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
docker compose ps
git status --short
```

## Acceptance criteria

- Current state after Stage 70 is confirmed.
- Candidate directions are reviewed.
- One next development direction is selected.
- No production changes are executed.
- No production secrets are printed or committed.
- Required guards pass.
- Working tree is clean before final acceptance.
