# Stage 72.45 - Production post-deploy manual smoke result audit

Status: audit
Branch: stage72-production-post-deploy-manual-smoke-result-audit
Base branch: develop
Previous stage: Stage 72.44 - Production post-deploy manual smoke result
Base develop checkpoint: 52d1f7b
Manual smoke result merge commit: 52d1f7b
Production deployment package tag: v0.1.0-stage72-production-deployment-execution-result
Production backup package tag: v0.1.0-stage72-production-backup-before-deploy-execution-result
Production application git head: 9e0ed0a
Scope: production post-deploy manual smoke result audit only

## Goal

Stage 72.45 audits the manual browser smoke check result recorded after the accepted production deployment.

This stage confirms that the Stage 72.44 result is complete, consistent with observed screenshots, bounded to browser verification only, and safe to proceed to acceptance.

This stage does not execute SSH commands, does not deploy, does not restart production services, and does not run migrations.

## Audited version note

The production application was deployed at git head `9e0ed0a`.

The later commits up to `52d1f7b` are documentation and guard commits.

The manual smoke check verified the production website after the application deployment, not a new deployment of documentation-only commits.

## Audited production URL

```text
portal.rcdo02.ru
```

## Audited manual smoke result summary

```text
status=ok
manual_browser_check=completed
production_application_git_head=9e0ed0a
production_deployment_package_tag=v0.1.0-stage72-production-deployment-execution-result
```

## Audited checked public routes

```text
/
/catalog
/login
/register
/verify-document
/organization-info
/contacts
/faq
```

## Audited checked admin routes

```text
/admin
/admin/users
/admin/organizations
/admin/courses
/admin/documents
/admin/roles
/admin/permissions
/admin/audit-events
```

## Audited public route results

```text
/: opened successfully
/catalog: opened successfully, public programs count is 0
/login: opened successfully
/register: opened successfully
/verify-document: opened successfully
/organization-info: opened successfully
/contacts: opened successfully
/faq: opened successfully
```

## Audited admin route results

```text
/admin after login: opened successfully
/admin/users: opened successfully, users count is 3
/admin/organizations: opened successfully, organizations count is 0
/admin/courses: opened successfully, courses count is 0
/admin/documents: opened successfully, documents count is 0
/admin/roles: opened successfully, roles count is 9
/admin/permissions: opened successfully, permissions count is 43
/admin/audit-events: opened successfully, audit events count is 50
```

## Audited authentication and access control results

```text
admin login: successful
admin api loaded: yes
authenticated badge: visible
admin role: visible
/admin as guest: redirected to /login
registration to login navigation: works
```

## Audited public document verification result

```text
route=/verify-document
test_query=TEST-NOT-FOUND-123
result=not_found
message=Документ не найден
page_error=no
api_error_visible=no
```

## Audited production data state

```text
public_programs=0
users=3
organizations=0
groups=0
courses=0
assignments=0
documents=0
roles=9
permissions=43
audit_events=50
```

## Audited non-blocking observations

```text
production catalog is empty because production courses/programs count is 0
contacts page contains placeholder data: +7 (000) 000-00-00, info@obrportal.local, support@obrportal.local
there is a disabled user-like record related to Blocked invalid admin seed attempt
RBAC page shows 43 permissions without role bindings
audit table renders rows but is visually tall and has horizontal scrolling
/verify returns not found while /verify-document is the working route
```

## Audited safety result

```text
no SSH commands were executed in this stage
no production deployment was executed in this stage
no production restart was executed in this stage
no production migrations were executed in this stage
no Docker cleanup was executed in this stage
no production secrets were printed in this stage
```

## Audit decision

The Stage 72.44 production post-deploy manual smoke result is safe to accept as a result artifact.

The production website opens the checked public routes.

The production admin panel opens after login.

Guest access to `/admin` is protected by redirect to `/login`.

Public document verification handles a missing document correctly.

No blocking post-deploy browser issues were found.

The observed empty catalog and placeholder contacts are content/data tasks, not deployment blockers.

## Required local audit checks

```text
python .\scripts\check_stage72_production_post_deploy_manual_smoke_result.py
python .\scripts\check_stage72_production_post_deploy_manual_smoke_result_audit.py
python .\scripts\check_stage72_production_deployment_execution_result.py
python .\scripts\check_stage72_production_deployment_execution_result_audit.py
python .\scripts\check_stage72_production_deployment_execution_result_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 72.46 - Production post-deploy manual smoke result acceptance
```
