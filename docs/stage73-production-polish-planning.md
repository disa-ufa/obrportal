# Stage 73.1 - Production polish planning

Status: planning
Branch: stage73-production-polish-planning
Base branch: develop
Base develop checkpoint: f4cf2cb
Previous release closure tag: v0.1.0-stage72-production-release-closure
Scope: production polish planning only

## Goal

Stage 73.1 starts the production polish phase after the closed Stage 72 production release.

Stage 72 confirmed that production backup, deployment, manual browser smoke checks, and release closure were completed and tagged.

Stage 73 focuses only on non-blocking production polish items discovered during post-deploy verification.

This planning stage does not execute SSH commands, does not deploy, does not restart production services, does not run migrations, and does not modify production data.

## Stage 72 baseline

```text
stage72_status=closed
stage72_final_tag=v0.1.0-stage72-production-release-closure
production_url=portal.rcdo02.ru
production_application_git_head=9e0ed0a
production_release_closure_head=f4cf2cb
deployment_status=ok
post_deploy_manual_smoke_status=ok
blocking_post_deploy_issues=none
```

## Production polish observations from Stage 72

```text
production catalog is empty because production courses/programs count is 0
production organizations/groups/courses/documents/assignments are empty
contacts page contains placeholder data: +7 (000) 000-00-00, info@obrportal.local, support@obrportal.local
there is a disabled user-like record related to Blocked invalid admin seed attempt
RBAC page shows 43 permissions without role bindings
audit table renders rows but is visually tall and has horizontal scrolling
/verify returns not found while /verify-document is the working route
```

## Stage 73 planning principles

```text
do not touch production before a separate execution authorization stage
do not change production data without backup and rollback plan
do not deploy code changes without PR, CI and acceptance
separate content changes from code changes
separate UI polish from RBAC/security changes
keep Amnezia/AWG outside the scope
keep secrets out of documentation and logs
```

## Proposed Stage 73 work packages

```text
Stage 73.2 - Production contacts placeholders replacement planning
Stage 73.3 - Production content seed plan for organizations and courses
Stage 73.4 - RBAC permission-role bindings review plan
Stage 73.5 - Public verify route redirect plan
Stage 73.6 - Audit table layout polish plan
Stage 73.7 - Disabled invalid admin seed record review plan
Stage 73.8 - Production polish execution readiness checkpoint
```

## Work package 1 - Contacts placeholders

Current observation:

```text
contacts page contains placeholder data
phone=+7 (000) 000-00-00
email=info@obrportal.local
support=support@obrportal.local
```

Planning decision required:

```text
confirm real public phone
confirm real public email
confirm support email
confirm working hours
decide whether contacts are static frontend content or backend-managed content
```

Expected risk:

```text
low risk if static text only
medium risk if content model or admin editing is introduced
```

## Work package 2 - Production content seed

Current observation:

```text
public_programs=0
organizations=0
groups=0
courses=0
assignments=0
documents=0
```

Planning decision required:

```text
decide whether production should be filled manually through admin UI
decide whether production should be filled by seed script
decide minimum first production catalog content
decide whether test/demo content is allowed on production
define rollback strategy for content changes
```

Expected risk:

```text
medium risk because production data may be changed
backup required before any bulk production data operation
manual admin UI entry is safer than direct database changes
```

## Work package 3 - RBAC review

Current observation:

```text
permissions=43
RBAC page shows permissions without role bindings
```

Planning decision required:

```text
export current roles and permissions safely
define expected role-permission matrix
compare expected matrix with production state
avoid granting excessive permissions
create separate RBAC change plan before execution
```

Expected risk:

```text
high risk because RBAC changes may affect admin access and security
backup and rollback plan required
manual verification required after changes
```

## Work package 4 - Verify route redirect

Current observation:

```text
/verify returns not found
/verify-document is the working public verification route
```

Planning decision required:

```text
decide whether /verify should redirect to /verify-document
decide whether legacy links may use /verify
decide whether redirect should preserve query parameters
define frontend/router implementation
define tests for redirect behavior
```

Expected risk:

```text
low to medium risk
code change requires PR, CI and deployment
manual browser smoke required after deployment
```

## Work package 5 - Audit table UI polish

Current observation:

```text
audit table renders rows but is visually tall and has horizontal scrolling
```

Planning decision required:

```text
decide target row density
decide visible columns priority
decide whether to add compact mode
decide whether horizontal scroll is acceptable
verify that audit data is not truncated incorrectly
```

Expected risk:

```text
low to medium risk
UI-only change but must not break audit visibility
```

## Work package 6 - Disabled invalid admin seed record

Current observation:

```text
there is a disabled user-like record related to Blocked invalid admin seed attempt
```

Planning decision required:

```text
identify whether the record is required audit/security evidence
decide whether to keep it disabled
decide whether to hide it from normal user lists
decide whether removal is safe
avoid deletion without explicit backup and authorization
```

Expected risk:

```text
medium risk because user/account data may be affected
do not delete production records without a separate authorization stage
```

## Out of scope for Stage 73.1

```text
no production SSH
no production deploy
no production restart
no production migrations
no production database writes
no production object storage writes
no Docker cleanup
no Amnezia/AWG changes
no secrets printing
```

## Stage 73.1 decision

Stage 73.1 records the production polish planning baseline.

The Stage 73 polish work must be split into small auditable packages.

Contacts replacement and verify redirect are likely the safest first items.

RBAC and production data/content changes require stronger planning, backup, and explicit execution authorization.

No production changes are authorized by this planning stage.

## Required local planning checks

```text
python .\scripts\check_stage73_production_polish_planning.py
python .\scripts\check_stage72_production_release_closure_summary.py
python .\scripts\check_stage72_production_release_closure_summary_audit.py
python .\scripts\check_stage72_production_release_closure_summary_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 73.2 - Production contacts placeholders replacement planning
```
