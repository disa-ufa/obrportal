# Stage 73.10 - Production contacts placeholders replacement implementation preparation

Status: preparation
Branch: stage73-production-contacts-placeholders-replacement-implementation-preparation
Base branch: develop
Base develop checkpoint: ed5d52a
Previous source inspection tag: v0.1.0-stage73-production-contacts-placeholders-source-inspection
Previous planning tag: v0.1.0-stage73-production-contacts-placeholders-replacement-planning
Scope: production contacts placeholders replacement implementation preparation only

## Goal

Stage 73.10 prepares the frontend-only implementation for replacing public contacts placeholders.

This stage records confirmed official contact values and defines the exact source replacement plan before editing ContactsPage.jsx.

This stage does not change source code, does not execute SSH commands, does not deploy, does not restart production services, does not run migrations, and does not modify production data.

## Confirmed official values

```text
official_public_phone=+7 (347) 200 10 17
official_public_email=rcdodist@gmail.com
official_support_email=rcdodist@gmail.com
official_working_hours=Пн-Пт, 09:00-18:00
```

## Current placeholder values

```text
phone_placeholder=+7 (000) 000-00-00
public_email_placeholder=info@obrportal.local
support_email_placeholder=support@obrportal.local
working_hours_current=Пн-Пт, 09:00-18:00
```

## Accepted source location

```text
primary_contacts_source=frontend/src/pages/ContactsPage.jsx
contacts_route_source=frontend/src/routes/PublicRoutes.jsx
contacts_meta_source=frontend/src/utils/publicRoutes.js
contacts_dashboard_smoke_links=frontend/src/pages/DashboardPage.jsx
```

## Planned source changes

```text
file=frontend/src/pages/ContactsPage.jsx
replace_phone=+7 (000) 000-00-00 -> +7 (347) 200 10 17
replace_public_email=info@obrportal.local -> rcdodist@gmail.com
replace_support_email=support@obrportal.local -> rcdodist@gmail.com
keep_working_hours=Пн-Пт, 09:00-18:00
```

## Implementation type

The replacement is planned as a frontend-only static content change.

No backend-managed contacts source was identified during source inspection.

No database-backed contacts configuration was identified during source inspection.

No production database write is required for this implementation.

## Planned implementation sequence

```text
step_1=create implementation branch from develop
step_2=edit frontend/src/pages/ContactsPage.jsx only
step_3=replace phone placeholder with confirmed public phone
step_4=replace public email placeholder with confirmed public email
step_5=replace support email placeholder with confirmed support email
step_6=keep current working hours
step_7=run local guards and quality checks
step_8=open PR to develop
step_9=wait for CI
step_10=merge after checks pass
step_11=deploy only in a later explicitly authorized production deployment stage
step_12=manual browser smoke contacts page after deployment
```

## Required implementation acceptance criteria

```text
placeholder_phone_removed=yes
placeholder_info_email_removed=yes
placeholder_support_email_removed=yes
official_public_phone_present=yes
official_public_email_present=yes
official_support_email_present=yes
contacts_page_opens=yes
no_backend_change=yes
no_database_change=yes
no_secrets_added_to_repository=yes
manual_browser_smoke_required_after_deploy=yes
```

## Safety boundaries

```text
no source code implementation in this preparation stage
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

## Preparation decision

The official public contact values are confirmed.

The implementation should be a minimal frontend-only replacement in frontend/src/pages/ContactsPage.jsx.

The support email should use the same confirmed email address as the public email.

The working hours should remain unchanged.

No production changes are authorized by this preparation stage.

## Required local preparation checks

```text
python .\scripts\check_stage73_production_contacts_placeholders_replacement_implementation_preparation.py
python .\scripts\check_stage73_production_contacts_placeholders_source_inspection_result.py
python .\scripts\check_stage73_production_contacts_placeholders_source_inspection_audit.py
python .\scripts\check_stage73_production_contacts_placeholders_source_inspection_acceptance.py
python .\scripts\check_stage73_production_contacts_placeholders_replacement_planning.py
python .\scripts\check_stage73_production_contacts_placeholders_replacement_planning_audit.py
python .\scripts\check_stage73_production_contacts_placeholders_replacement_planning_acceptance.py
python .\scripts\check_stage73_production_polish_planning.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 73.11 - Production contacts placeholders replacement implementation
```
