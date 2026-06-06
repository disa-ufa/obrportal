# Stage 73.2 - Production contacts placeholders replacement planning

Status: planning
Branch: stage73-production-contacts-placeholders-replacement-planning
Base branch: develop
Previous stage: Stage 73.1 - Production polish planning
Base develop checkpoint: d5a4f63
Previous release closure tag: v0.1.0-stage72-production-release-closure
Scope: production contacts placeholders replacement planning only

## Goal

Stage 73.2 plans replacement of placeholder public contact data found during the Stage 72 post-deploy manual smoke check.

This stage defines what must be confirmed before changing the production contacts page, what files or data sources may be affected, and what safety checks must pass before implementation.

This stage does not execute SSH commands, does not deploy, does not restart production services, does not run migrations, and does not modify production data.

## Baseline

```text
stage72_status=closed
stage72_final_tag=v0.1.0-stage72-production-release-closure
stage73_planning_merge_commit=d5a4f63
production_url=portal.rcdo02.ru
production_application_git_head=9e0ed0a
blocking_post_deploy_issues=none
```

## Contact placeholders observed

```text
contacts_page=opened_successfully
phone_placeholder=+7 (000) 000-00-00
public_email_placeholder=info@obrportal.local
support_email_placeholder=support@obrportal.local
```

## Problem

The production contacts page is technically available, but it contains placeholder values.

This is not a deployment blocker, but it is a public-facing content issue and should be corrected before broader production use.

## Planning decisions required before implementation

```text
confirm official public phone
confirm official public email
confirm official support email
confirm organization name spelling for the contacts page
confirm public address if shown on the contacts page
confirm working hours if shown on the contacts page
confirm whether old placeholder emails must be removed completely
confirm whether the contacts page is static frontend content or backend-managed content
```

## Proposed safe implementation path

```text
step_1=locate contacts page source files locally
step_2=confirm exact replacement contact values with owner
step_3=replace static placeholders in frontend only if contacts are static
step_4=add or update frontend tests if applicable
step_5=run local guards and formatting checks
step_6=open PR to develop
step_7=wait for CI
step_8=merge after approval
step_9=deploy only in a later explicitly authorized production deployment stage
step_10=manual browser smoke contacts page after deployment
```

## Candidate source areas to inspect later

```text
frontend/src/pages/ContactsPage.jsx
frontend/src/pages
frontend/src/components
frontend/src/routes
```

## Data handling decision

Contacts replacement should be treated as a content/UI change, not as a database operation, unless inspection proves that contacts are managed by backend data.

No production database write is authorized by this planning stage.

## Risk assessment

```text
risk_level=low_if_static_frontend_text_only
risk_level=medium_if_backend_content_model_is_changed
risk_level=medium_if_new_admin-editable_contacts_model_is_introduced
```

## Rollback idea

If implementation is static frontend text only, rollback is a normal git revert and redeploy.

If implementation changes backend schema, database content, or admin-managed contact settings, a separate backup and rollback plan is required before execution.

## Acceptance criteria for future implementation

```text
placeholder_phone_removed=yes
placeholder_info_email_removed=yes
placeholder_support_email_removed=yes
contacts_page_opens=yes
contacts_page_has_confirmed_official_values=yes
no secrets_added_to_repository=yes
no production database_write_without_authorization=yes
manual_browser_smoke_required_after_deploy=yes
```

## Explicitly out of scope for Stage 73.2

```text
no source code implementation in this planning stage
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

## Stage 73.2 decision

Stage 73.2 records the plan for replacing public contacts placeholders.

The safest likely first implementation is a static frontend text replacement, but exact source files must be inspected before implementation.

Exact official contact values must be confirmed before any code change.

No production changes are authorized by this planning stage.

## Required local planning checks

```text
python .\scripts\check_stage73_production_contacts_placeholders_replacement_planning.py
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
Stage 73.3 - Production contacts placeholders replacement planning audit
```
