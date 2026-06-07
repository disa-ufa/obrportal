# Stage 74 - Organization info public page polish

Status: implemented
Project: ObrPortal
Base checkpoint: Stage 73 production contacts placeholders replacement
Scope: frontend static public page only
File: `frontend/src/pages/OrganizationInfoPage.jsx`

## Goal

Replace the generic organization information scaffold with a safer public organization information page for ГБОУ РЦДО.

## Implemented changes

- Replaced the generic scaffold text on `/organization-info` with public organization facts.
- Added real public contact values already accepted in Stage 73.
- Added stable frontend markers for smoke and regression checks.
- Added a clear note that unverified document numbers and реквизиты are not published.
- Preserved navigation to home, contacts, and catalog.

## Public values used

```text
organization_short_name=ГБОУ РЦДО
organization_full_name=Государственное бюджетное общеобразовательное учреждение Республиканский центр дистанционного образования детей-инвалидов
founder=Министерство просвещения Республики Башкортостан
head=Нуриев Фаниль Жамилевич
inn=0274931354
location=Республика Башкортостан, г. Уфа, ул. Авроры, 18/2
official_site=https://rcdo02.ru
portal=https://portal.rcdo02.ru
phone=+7 (347) 200 10 17
email=rcdodist@gmail.com
working_hours=Пн-Пт, 09:00-18:00
```

## Safety boundaries

```text
backend_changed=no
database_changed=no
migrations_added=no
auth_changed=no
rbac_changed=no
object_level_access_changed=no
production_changed=no
secrets_printed=no
```

## Verification markers

```text
stage74_organization_info_public_page=yes
organization-info-public-page
organization-info-official-facts
organization-info-public-contacts
organization-info-documents-next-step
ГБОУ РЦДО
0274931354
+7 (347) 200 10 17
rcdodist@gmail.com
Пн-Пт, 09:00-18:00
Непроверенные реквизиты и номера документов на этой странице не публикуются.
```
