# ObrPortal

ObrPortal — образовательный портал и back-office foundation для дальнейшей разработки LMS, личных кабинетов, административной панели, документов, ЭДО, ФРДО, финансового контура и интеграций.

Проект развивается как полноценная платформа для образовательной организации: публичный каталог программ, регистрация обучающихся, личный кабинет, административная панель, управление пользователями, ролями, правами, организациями, группами, курсами, назначениями и документами.

## Локальный запуск и demo-сценарий

Подробная инструкция локального запуска вынесена в `docs/local-demo.md`.

Документ описывает:

- обновление `develop` и `main`;
- запуск `scripts/local_bootstrap.ps1`;
- запуск demo-данных через `-WithDemoLearning`;
- создание администратора, слушателя, организации, программы, группы, назначения и demo-документа;
- проверки `pytest`, `smoke_auth_rbac.py` и frontend build;
- особенность Docker Desktop на Windows: `COMPOSE_BAKE=false`.

Быстрый demo-запуск:

```powershell
.\scripts\local_bootstrap.ps1 -ResetVolumes -WithDemoLearning
```

---

## Текущая контрольная точка

Текущий этап:

```text
Stage 6 — DevOps-фундамент, Auth/RBAC, Admin Panel, Public Portal, Account, Courses, Enrollments, Documents
```

Текущий рабочий пункт:

```text
6.40 — стабилизация, актуализация документации и фиксация состояния проекта
```

Конкретно сейчас закрываем:

```text
6.40.1 — актуализация README.md
```

После этого выполняется:

```text
6.40.2 — полный quality gate
6.40.3 — commit / push / fast-forward merge develop → main
```

К следующему функциональному блоку `6.41 — генерация документов` переходим только после зелёной контрольной точки 6.40.

---

## Что уже реализовано

### DevOps / Infra

- Docker Compose local environment.
- Backend container.
- Frontend container.
- PostgreSQL.
- Redis.
- MinIO / S3-compatible storage.
- Alembic migrations.
- `.env.example`.
- Local secret scan.
- GitHub Actions CI.
- Backend pytest.
- Smoke scripts.
- Frontend production build.

### Backend foundation

- FastAPI.
- SQLAlchemy async.
- Alembic.
- PostgreSQL.
- Redis health-check.
- Storage health-check.
- `/health`.
- `/api/v1/ready`.

### Auth / RBAC

- JWT login.
- Public registration.
- `/api/v1/auth/me`.
- Roles.
- Permissions.
- RBAC checks.
- Audit events.
- Admin-only access restrictions.
- Learner access restrictions.

### Admin panel

- Admin shell.
- Navigation.
- Protected admin routes.
- Users page.
- Roles page.
- Permissions page.
- Audit events page.
- Organizations page.
- Learning groups page.
- Courses page.
- Enrollments page.
- Documents page.
- Organization info page.

### Users

- List users.
- Create user.
- User detail.
- Edit user.
- Activate / deactivate user.
- Reset password.
- Assign roles.
- Remove roles.
- Backend tests.
- Smoke coverage.

### Organizations

- Organization model.
- CRUD API.
- Frontend page.
- Create organization.
- Edit organization.
- Delete organization.
- Filters.
- Detail card.
- Backend tests.
- Smoke coverage.

### Learning groups

- `LearningGroup` model.
- Alembic migration.
- List groups.
- Create group.
- Group detail.
- Update group.
- Delete group.
- Frontend page.
- Delete button with confirmation.
- Backend tests.
- Smoke coverage.

### Public portal

- Public layout.
- Home page.
- Catalog page.
- Course detail page by slug.
- Contacts page.
- FAQ page.
- Privacy page.
- Offer page.
- 404 page.
- Public routing.

### Account

- Registration.
- Login.
- Auto-login after registration.
- Account summary.
- Account courses.
- Account documents.
- Start course.
- Complete course.
- Document list for learner.
- Download available document.
- Draft documents are protected from learner download.

### Courses

- Course model.
- Public course catalog.
- Public course detail by slug.
- Admin courses API.
- Admin courses frontend.
- Create course.
- Edit course.
- Publish / unpublish.
- Delete course.
- Slug support.

### Enrollments

- Enrollment model.
- Admin enrollments API.
- Admin enrollments frontend.
- Assign user to course.
- Enrollment statuses.
- Start enrollment.
- Complete enrollment.
- Link enrollment with user/course/organization.
- Draft document creation after course completion.

### Documents

- `DocumentRecord` model.
- Admin documents API.
- Admin documents frontend.
- Upload document.
- Store file in private storage.
- List documents.
- Document detail.
- Edit document.
- Delete document.
- Download document.
- Publish document.
- Link document to user/course/enrollment.
- Validate document/enrollment/user/course relation.
- Verification code.
- Public document verification page.
- Verification URL.
- QR-code for verification.
- QR SVG download.
- Frontend helpers refactor.
- QR block refactor.

### Build optimization

- Frontend build stabilized.
- Vendor chunks split for Vite build.

---

## Стек

### Backend

- Python 3.12
- FastAPI
- SQLAlchemy async
- Alembic
- PostgreSQL
- Redis
- MinIO / S3-compatible storage
- Pytest

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- QRCode SVG

### Infra

- Docker Compose
- GitHub Actions
- Local secret scan
- Smoke tests

---

## Быстрый старт

```powershell
git clone https://github.com/disa-ufa/obrportal.git
cd obrportal

Copy-Item .env.example .env

docker compose up -d --build
docker compose ps
```

---

## URL

Frontend:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

MinIO Console:

```text
http://localhost:9001
```

---

## Проверка backend

```powershell
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/ready
```

Ожидается:

```text
status = ok
database = ok
redis = ok
storage = ok
```

---

## Миграции

```powershell
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
```

---

## Seed

Базовые роли и права:

```powershell
docker compose exec backend python -m app.db.seed
```

Demo organization:

```powershell
docker compose exec backend python -m app.db.seed_demo_organization
```

Demo admin:

```powershell
docker compose exec `
  -e SEED_ADMIN_EMAIL=admin@obrportal.local `
  -e SEED_ADMIN_PASSWORD='Admin123Local2026!' `
  backend python -m app.db.seed_admin
```

Demo learner:

```powershell
docker compose exec `
  -e SEED_DEMO_EMAIL=learner@obrportal.local `
  -e SEED_DEMO_PASSWORD='Learner123Local2026!' `
  -e SEED_DEMO_ROLE=learner_fl `
  backend python -m app.db.seed_demo_user
```

Локальные demo-пароли используются только для разработки.

---

## Основные API-разделы

### Auth

```http
POST /api/v1/auth/login
POST /api/v1/auth/register
GET  /api/v1/auth/me
```

### Account

```http
GET  /api/v1/account/summary
GET  /api/v1/account/courses
GET  /api/v1/account/documents
GET  /api/v1/account/documents/{document_id}/download
POST /api/v1/account/enrollments/{enrollment_id}/start
POST /api/v1/account/enrollments/{enrollment_id}/complete
```

### Public

```http
GET /api/v1/public/courses
GET /api/v1/public/courses/{slug}
GET /api/v1/public/documents/verify/{verification_code}
```

### Admin users

```http
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/{user_id}
PATCH  /api/v1/admin/users/{user_id}
POST   /api/v1/admin/users/{user_id}/password
POST   /api/v1/admin/users/{user_id}/roles
DELETE /api/v1/admin/users/{user_id}/roles/{user_role_id}
```

### Admin organizations

```http
GET    /api/v1/admin/organizations
POST   /api/v1/admin/organizations
GET    /api/v1/admin/organizations/{organization_id}
PATCH  /api/v1/admin/organizations/{organization_id}
DELETE /api/v1/admin/organizations/{organization_id}
```

### Learning groups

```http
GET    /api/v1/org/groups
POST   /api/v1/org/groups
GET    /api/v1/org/groups/{group_id}
PATCH  /api/v1/org/groups/{group_id}
DELETE /api/v1/org/groups/{group_id}
```

### Admin courses

```http
GET    /api/v1/admin/courses
POST   /api/v1/admin/courses
GET    /api/v1/admin/courses/{course_id}
PATCH  /api/v1/admin/courses/{course_id}
DELETE /api/v1/admin/courses/{course_id}
```

### Admin enrollments

```http
GET    /api/v1/admin/enrollments
POST   /api/v1/admin/enrollments
GET    /api/v1/admin/enrollments/{enrollment_id}
PATCH  /api/v1/admin/enrollments/{enrollment_id}
DELETE /api/v1/admin/enrollments/{enrollment_id}
```

### Admin documents

```http
GET    /api/v1/admin/documents
POST   /api/v1/admin/documents
GET    /api/v1/admin/documents/{document_id}
PATCH  /api/v1/admin/documents/{document_id}
DELETE /api/v1/admin/documents/{document_id}
GET    /api/v1/admin/documents/{document_id}/download
POST   /api/v1/admin/documents/{document_id}/publish
```

### RBAC / audit

```http
GET /api/v1/admin/rbac-check
GET /api/v1/admin/roles
GET /api/v1/admin/roles/{role_id}
GET /api/v1/admin/permissions
GET /api/v1/admin/audit-events
```

---

## Frontend routes

### Public

```text
/
 /catalog
 /catalog/:slug
 /contacts
 /faq
 /privacy
 /offer
 /verify/:verificationCode
 *
```

### Auth

```text
/login
/register
```

### Account

```text
/account
```

### Admin

```text
/admin
/admin/users
/admin/roles
/admin/permissions
/admin/audit
/admin/organizations
/admin/groups
/admin/courses
/admin/enrollments
/admin/documents
/admin/organization-info
```

---

## Smoke-test

```powershell
python .\scripts\smoke_auth_rbac.py
```

Проверяет:

- health;
- ready;
- admin login;
- `/auth/me`;
- public register;
- duplicate register checks;
- public courses;
- account summary;
- account courses;
- account documents;
- RBAC-check;
- users;
- roles;
- permissions;
- audit events;
- organizations;
- learning groups;
- courses;
- enrollments;
- documents;
- verification flow;
- QR/document-related checks;
- 401 без токена;
- 403 для пользователя без нужных прав.

Ожидаемый результат:

```text
Smoke auth/RBAC/admin API passed
```

---

## Backend tests

```powershell
docker compose exec backend pytest app/tests -q
```

Ожидаемый результат:

```text
all tests passed
```

---

## Frontend build

```powershell
docker compose exec frontend npm run build
```

Ожидаемый результат:

```text
built successfully
```

---

## Secret scan

```powershell
python .\scripts\secret_scan.py
```

Правила:

- настоящий `.env` не коммитить;
- `.env.example` содержит только placeholders;
- токены, пароли и ключи не должны попадать в git;
- при подозрении на утечку секрет перевыпускается.

---

## Полный локальный quality gate

Перед каждым commit/push:

```powershell
Set-Location C:\root\obrportal

git status --short
git branch -vv
git log --oneline --decorate -5

python .\scripts\secret_scan.py

docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.db.seed
docker compose exec backend python -m app.db.seed_demo_organization

docker compose exec backend pytest app/tests -q

python .\scripts\smoke_auth_rbac.py

docker compose exec frontend npm run build

git status --short
```

---

## Git workflow

Рабочая ветка:

```text
develop
```

После зелёного quality gate:

```powershell
git add README.md
git commit -m "docs: update current project checkpoint"
git push origin develop

git switch main
git merge --ff-only develop
git push origin main
git switch develop
```

Перед merge в `main` обязательно:

- secret scan passed;
- backend pytest passed;
- smoke passed;
- frontend build passed;
- `develop` чистый;
- `main` обновляется только fast-forward merge.

---

## Карта Stage 6

### Уже закрыто

```text
6.1  — DevOps foundation
6.2  — Backend foundation
6.3  — Frontend foundation
6.4  — Auth base
6.5  — RBAC base
6.6  — Admin shell
6.7  — Users management
6.8  — Roles / permissions
6.9  — Audit events
6.10 — Organizations
6.11 — Public shell
6.12 — Public catalog
6.13 — Public course detail
6.14 — Registration
6.15 — Account shell
6.16 — Account summary
6.17 — Account courses
6.18 — Account documents
6.19 — Admin courses
6.20 — Admin enrollments
6.21 — Course self-enrollment / progress
6.22 — Document draft creation after course completion
6.23 — Admin documents
6.24 — Document upload
6.25 — Document download
6.26 — Document publish flow
6.27 — Public document verification
6.28 — Verification URL
6.29 — QR-code for document verification
6.30 — QR SVG download
6.31 — Frontend helper refactor
6.32 — Learning groups
6.33 — Delete learning groups
6.34 — Public/auth/account polish
6.35 — Documents polish
6.36 — Verification polish
6.37 — Smoke expansion
6.38 — Frontend build stabilization
6.39 — Vendor chunks
```

### Текущий пункт

```text
6.40 — стабилизация, актуализация документации и фиксация состояния проекта
```

Подпункты:

```text
6.40.1 — README update
6.40.2 — full quality gate
6.40.3 — commit/push checkpoint
```

---

## Следующий функциональный блок

После полного закрытия 6.40:

```text
6.41 — генерация документов
```

План 6.41:

```text
6.41.1  — шаблон сертификата / удостоверения
6.41.2  — backend-сервис генерации PDF
6.41.3  — генерация PDF после завершения курса
6.41.4  — сохранение PDF в private storage
6.41.5  — связь generated document с enrollment
6.41.6  — публикация generated document
6.41.7  — отображение готового документа в личном кабинете
6.41.8  — public verification generated document
6.41.9  — backend tests
6.41.10 — smoke: курс → завершение → документ → QR → проверка
```

---

## Правило разработки

```text
один модуль → тесты → smoke → frontend build → commit → fast-forward merge
```

Новые крупные функции добавляются только после зелёной контрольной точки.

---

## Checkpoint 6.41 - генерация документов

Контур генерации документов стабилизирован.

Закрыто:

- 6.41.1 - Backend: ручная регенерация итогового PDF
- 6.41.2 - Frontend: кнопка "Пересобрать PDF"
- 6.41.3 - Метаданные генерации документа
- 6.41.4.1 - Backend: история PDF-артефактов
- 6.41.4.2 - UI: история PDF-артефактов
- 6.41.4.3 - Скачать конкретный PDF-артефакт из истории
- 6.41.5 - финальная стабилизация документационного контура

API:

- POST /api/v1/admin/documents/{document_id}/regenerate
- GET  /api/v1/admin/documents/{document_id}/generation-events
- GET  /api/v1/admin/documents/{document_id}/generation-events/{event_id}/download

Frontend:

- Паспорт генерации PDF
- История PDF-артефактов
- Пересобрать PDF
- Скачать версию

Контрольный smoke:

```powershell
python .\scripts\smoke_document_generation_flow.py
```

Следующий функциональный блок:

```text
6.42 - следующий функциональный блок после стабилизации document generation contour
```

---

## Checkpoint 6.42 - профиль организации для документов

Контур профиля организации для генерируемых документов стабилизирован.

Закрыто:

- 6.42.1 - Backend: профиль организации для документов
- 6.42.2 - Frontend: поля профиля организации для документов в админке организаций
- 6.42.3 - Использовать профиль организации в PDF-шаблоне итогового документа
- 6.42.4 - финальная стабилизация профиля организации для документов

Поля профиля организации:

- document_issuer_name
- document_signer_position
- document_signer_name
- document_basis
- document_place

PDF использует профиль организации из enrollment.organization_id с fallback на настройки приложения.

Контрольные smoke:

```powershell
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_documents_page.py
```

CI:

- GitHub Actions запускает `smoke_document_generation_flow.py` вместе с основными smoke-проверками.

Следующий функциональный блок:

```text
6.43 - следующий функциональный блок после стабилизации профиля организации для документов
```

---

## Checkpoint 6.43 - связка организация, назначение, документ и PDF

Контур связи `организация → назначение → документ → PDF` стабилизирован.

Закрыто:

- 6.43.1 - Frontend: подсказки профиля PDF в назначениях
- 6.43.2 - фильтр назначений по организации
- 6.43.3 - фильтр документов по организации
- 6.43.4 - финальная стабилизация блока `организация → назначение → документ → PDF`

Результат:

- в назначениях отображается подсказка, какой профиль PDF будет использован;
- назначения фильтруются по `organization_id`; 
- документы фильтруются по `organization_id` через связанное назначение;
- `worklist-summary` учитывает организацию для назначений и документов;
- PDF использует профиль организации из `enrollment.organization_id` с fallback на настройки приложения.

Backend/API:

- GET `/api/v1/admin/enrollments?organization_id=...`
- GET `/api/v1/admin/documents?organization_id=...`
- GET `/api/v1/admin/worklist-summary?enrollments_organization_id=...`
- GET `/api/v1/admin/worklist-summary?documents_organization_id=...`

Frontend:

- `/admin/enrollments?organization_id=...`
- `/admin/documents?organization_id=...`
- select `Все организации` на страницах назначений и документов.

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_admin_pages.py
```

Следующий функциональный блок:

```text
6.44 - следующий функциональный блок после стабилизации связки организация, назначение, документ и PDF
```

---

## Checkpoint 6.44 - быстрые переходы по организации

Контур быстрых переходов по организации стабилизирован.

Закрыто:

- 6.44.1 - быстрые переходы из карточки организации в связанные назначения и документы
- 6.44.2 - быстрые переходы из назначений и документов обратно в карточку организации
- 6.44.3 - Dashboard: сценарий `Организации → группы → назначения → документы`
- 6.44.4 - финальная стабилизация блока быстрых переходов по организации

Результат:

- в карточке организации есть переходы в назначения и документы организации;
- в назначениях организация открывается как ссылка;
- в документах организация открывается как ссылка;
- Dashboard содержит сценарий полного организационного контура;
- прямые маршруты с `organization_id` покрыты smoke-проверками.

Основные маршруты:

- `/admin/organizations`
- `/admin/enrollments?organization_id=...`
- `/admin/documents?organization_id=...`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
```

Следующий функциональный блок:

```text
6.45 - следующий функциональный блок после стабилизации быстрых переходов по организации
```

---

## Checkpoint 6.45 - аудит document/PDF-контура

Контур аудита и трассировки `организация → назначение → документ → PDF` стабилизирован.

Закрыто:

- 6.45.1 - быстрые переходы в аудит из организации и документа
- 6.45.2 - AuditPage: быстрый сценарий аудита document/PDF-контура
- 6.45.3 - smoke-покрытие прямых audit-маршрутов document/PDF-контура
- 6.45.4 - финальная стабилизация блока аудита document/PDF-контура

Результат:

- из карточки организации доступен переход в аудит организации;
- из карточки документа доступны переходы в аудит документа, назначения и организации;
- AuditPage содержит сценарий `Document/PDF-контур`; 
- прямые маршруты аудита для document/PDF-событий покрыты smoke-проверками;
- проверяются audit-фильтры по `action` и `entity_type`.

Основные audit-маршруты:

- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=organization`
- `/admin/audit-events?action=admin.document_created`
- `/admin/audit-events?action=admin.document_regenerated`
- `/admin/audit-events?action=admin.document_revoked`
- `/admin/audit-events?action=admin.document_restored`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
```

Следующий функциональный блок:

```text
6.46 - следующий функциональный блок после стабилизации аудита document/PDF-контура
```

---

## Checkpoint 6.46 - контроль качества документов

Контур контроля качества проблемных документов стабилизирован.

Закрыто:

- 6.46.1 - Dashboard: сценарий `Документы требуют действия`
- 6.46.2 - DocumentsPage: усиленный блок причин, почему документ требует действия
- 6.46.3 - smoke-покрытие прямых маршрутов контроля качества документов
- 6.46.4 - финальная стабилизация блока контроля качества документов

Результат:

- Dashboard содержит отдельный сценарий контроля проблемных документов;
- DocumentsPage показывает расширенную диагностику причин внимания;
- диагностируются черновики, отозванные документы, опубликованные документы без файла;
- отображаются причины по отзыву, файлу, паспорту генерации PDF и организации;
- прямые маршруты `action_required=true` покрыты smoke-проверками.

Основные маршруты:

- `/admin/documents?action_required=true`
- `/admin/documents?action_required=true&status=draft`
- `/admin/documents?action_required=true&status=revoked`
- `/admin/documents?action_required=true&document_type=certificate`
- `/admin/documents?action_required=true&organization_id=...`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?action=admin.document_regenerated`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_admin_pages.py
```

Следующий функциональный блок:

```text
6.47 - следующий функциональный блок после стабилизации контроля качества документов
```

---

## Checkpoint 6.47 - операционный центр назначений

Контур операционного контроля проблемных назначений стабилизирован.

Закрыто:

- 6.47.1 - Dashboard: сценарий `Операционный центр назначений`
- 6.47.2 - AdminEnrollmentsPage: усиленная диагностика причин, почему назначение требует действия
- 6.47.3 - smoke-покрытие прямых маршрутов операционного центра назначений
- 6.47.4 - финальная стабилизация блока операционного центра назначений

Результат:

- Dashboard содержит отдельный сценарий операционного контроля назначений;
- AdminEnrollmentsPage показывает расширенную диагностику причин внимания;
- диагностируются назначенные и завершённые назначения;
- отображаются причины по статусу, датам, группе, организации и PDF-профилю организации;
- прямые маршруты `action_required=true` для назначений покрыты smoke-проверками.

Основные маршруты:

- `/admin/enrollments?action_required=true`
- `/admin/enrollments?action_required=true&status=assigned`
- `/admin/enrollments?action_required=true&status=completed`
- `/admin/enrollments?action_required=true&organization_id=...`
- `/admin/enrollments?action_required=true&learning_group_id=...`
- `/admin/documents?action_required=true`
- `/admin/audit-events?entity_type=enrollment`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.48 - следующий функциональный блок после стабилизации операционного центра назначений
```

---

## Checkpoint 6.48 - операционный центр организаций

Контур операционного контроля организаций стабилизирован.

Закрыто:

- 6.48.1 - Dashboard: сценарий `Операционный центр организаций`
- 6.48.2 - OrganizationDetailPanel: диагностика организационного контура
- 6.48.3 - smoke-покрытие прямых маршрутов операционного центра организаций
- 6.48.4 - финальная стабилизация блока операционного центра организаций

Результат:

- Dashboard содержит отдельный сценарий операционного контроля организаций;
- карточка организации показывает диагностику реквизитов, адресов и PDF-профиля;
- добавлены быстрые переходы к группам, проблемным назначениям, проблемным документам и аудиту организации;
- прямые маршруты операционного центра организаций покрыты smoke-проверками.

Основные маршруты:

- `/admin/organizations?scope=with_kpp`
- `/admin/groups?organization_id=...`
- `/admin/enrollments?organization_id=...&action_required=true`
- `/admin/documents?organization_id=...&action_required=true`
- `/admin/audit-events?entity_type=organization`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.49 - следующий функциональный блок после стабилизации операционного центра организаций
```

---

## Checkpoint 6.49 - операционный центр учебных групп

Контур операционного контроля учебных групп стабилизирован.

Закрыто:

- 6.49.1 - Dashboard: сценарий `Операционный центр групп`
- 6.49.2 - GroupsPage: диагностика учебной группы и связанных назначений
- 6.49.3 - smoke-покрытие прямых маршрутов операционного центра групп
- 6.49.4 - финальная стабилизация блока операционного центра групп

Результат:

- Dashboard содержит отдельный сценарий операционного контроля учебных групп;
- карточка группы показывает диагностику статуса, кода, организации и описания;
- добавлены быстрые переходы к организации группы, назначениям группы, проблемным назначениям и проблемным документам;
- прямые маршруты операционного центра групп покрыты smoke-проверками.

Основные маршруты:

- `/admin/groups?status=active`
- `/admin/groups?status=inactive`
- `/admin/groups?organization_id=...&status=active`
- `/admin/enrollments?learning_group_id=...&action_required=true`
- `/admin/documents?learning_group_id=...&action_required=true`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.50 - следующий функциональный блок после стабилизации операционного центра учебных групп
```

---

## Checkpoint 6.50 - операционный центр пользователей

Контур операционного контроля пользователей стабилизирован.

Закрыто:

- 6.50.1 - Dashboard: сценарий `Операционный центр пользователей`
- 6.50.2 - UserDetailPanel: диагностика пользователя и связанных записей
- 6.50.3 - smoke-покрытие прямых маршрутов операционного центра пользователей
- 6.50.4 - финальная стабилизация блока операционного центра пользователей

Результат:

- Dashboard содержит отдельный сценарий операционного контроля пользователей;
- карточка пользователя показывает диагностику активности, email, MFA, телефона и ролей;
- добавлены быстрые переходы к назначениям, документам, ролям и аудиту пользователя;
- прямые маршруты операционного центра пользователей покрыты smoke-проверками.

Основные маршруты:

- `/admin/users?activity=active`
- `/admin/users?activity=inactive`
- `/admin/enrollments?user_id=...&action_required=true`
- `/admin/documents?user_id=...`
- `/admin/audit-events?entity_type=user`
- `/admin/audit-events?entity_type=user&entity_id=...`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.51 - следующий функциональный блок после стабилизации операционного центра пользователей
```

---

## Checkpoint 6.51 - операционный центр ролей и прав

Контур операционного контроля ролей и прав стабилизирован.

Закрыто:

- 6.51.1 - Dashboard: сценарий `Операционный центр ролей и прав`
- 6.51.2 - RoleDetailPanel: диагностика роли, permissions и связанных назначений
- 6.51.3 - smoke-покрытие прямых маршрутов операционного центра ролей и прав
- 6.51.4 - финальная стабилизация блока операционного центра ролей и прав

Результат:

- Dashboard содержит отдельный сценарий операционного контроля RBAC;
- карточка роли показывает диагностику типа роли, защиты системных ролей, описания и состава permissions;
- добавлены быстрые переходы к пользователям с ролью, permissions, admin-правам и аудиту роли;
- прямые маршруты операционного центра ролей и прав покрыты smoke-проверками.

Основные маршруты:

- `/admin/roles?type=system`
- `/admin/roles?type=custom`
- `/admin/roles?q=admin`
- `/admin/permissions?group=admin`
- `/admin/permissions?group=audit`
- `/admin/users?role=admin`
- `/admin/audit-events?entity_type=role`
- `/admin/audit-events?entity_type=permission`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.52 - следующий функциональный блок после стабилизации операционного центра ролей и прав
```

---

## Checkpoint 6.52 - операционный центр аудита и расследований

Контур операционного контроля аудита и расследований стабилизирован.

Закрыто:

- 6.52.1 - Dashboard: сценарий `Операционный центр аудита и расследований`
- 6.52.2 - AuditEventDetailPanel: диагностика события аудита и быстрые связи расследования
- 6.52.3 - smoke-покрытие прямых маршрутов операционного центра аудита и расследований
- 6.52.4 - финальная стабилизация блока операционного центра аудита и расследований

Результат:

- Dashboard содержит отдельный сценарий расследования событий аудита;
- карточка события аудита показывает диагностику action, entity, actor, IP и user agent;
- добавлены быстрые переходы к action, entity type, истории сущности, actor, расширенной выдаче и связанному разделу;
- прямые маршруты операционного центра аудита и расследований покрыты smoke-проверками.

Основные маршруты:

- `/admin/audit-events?limit=25`
- `/admin/audit-events?limit=200`
- `/admin/audit-events?entity_type=user`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=organization`
- `/admin/audit-events?entity_type=role`
- `/admin/audit-events?entity_type=permission`
- `/admin/audit-events?action=admin.user_created`
- `/admin/audit-events?action=admin.document_regenerated`
- `/admin/audit-events?actor_user_id=...`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.53 - следующий функциональный блок после стабилизации операционного центра аудита и расследований
```

---

## Checkpoint 6.53 - операционный центр личного кабинета и пользовательского доступа

Контур личного кабинета, пользовательского доступа, обучения и документов стабилизирован.

Закрыто:

- 6.53.1 - Dashboard: сценарий `Операционный центр личного кабинета`
- 6.53.2 - AccountPage: диагностика личного кабинета, обучения и документов
- 6.53.3 - smoke-покрытие прямых маршрутов операционного центра личного кабинета
- 6.53.4 - финальная стабилизация блока операционного центра личного кабинета

Результат:

- Dashboard содержит отдельный сценарий контроля пользовательского доступа;
- AccountPage показывает диагностику профиля, назначений, обучения, документов, скачивания и публичной проверки;
- диагностируются отсутствующие назначения, черновики, отозванные документы, документы без файла и опубликованные документы без номера/кода проверки;
- добавлены быстрые переходы к каталогу, программам и документам пользователя;
- прямые маршруты личного кабинета и связанных административных списков покрыты smoke-проверками.

Основные маршруты:

- `/account`
- `/catalog`
- `/verify-document`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/documents?status=available`
- `/admin/documents?status=draft`
- `/admin/documents?status=revoked`
- `/admin/audit-events?entity_type=user`
- `/admin/audit-events?entity_type=document`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.54 - следующий функциональный блок после стабилизации операционного центра личного кабинета
```

---

## Checkpoint 6.54 - операционный центр публичной проверки документов

Контур публичной проверки документов, QR-ссылок, статусов и ошибок верификации стабилизирован.

Закрыто:

- 6.54.1 - Dashboard: сценарий `Операционный центр публичной проверки документов`
- 6.54.2 - VerifyDocumentPage: диагностика публичной проверки, статусов и ошибок
- 6.54.3 - smoke-покрытие прямых маршрутов операционного центра публичной проверки документов
- 6.54.4 - финальная стабилизация блока операционного центра публичной проверки документов

Результат:

- Dashboard содержит отдельный сценарий контроля публичной проверки документов;
- VerifyDocumentPage показывает диагностику запроса, результата, статуса документа, QR/кода проверки, ошибок и not found;
- диагностируются состояния `available`, `revoked`, неопубликованные/неподтверждённые документы, отсутствие номера и кода проверки;
- публичная проверка по номеру и коду связана с QR/verification flow;
- прямые маршруты публичной проверки и связанных административных списков покрыты smoke-проверками.

Основные маршруты:

- `/verify-document`
- `/verify-document?number=SMOKE-NOT-FOUND`
- `/verify-document?code=SMOKE-NOT-FOUND`
- `/admin/documents?status=available`
- `/admin/documents?status=draft`
- `/admin/documents?status=revoked`
- `/admin/documents?action_required=true`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?action=admin.document_revoked`
- `/admin/audit-events?action=admin.document_restored`
- `/admin/audit-events?action=admin.document_regenerated`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_documents_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.55 - следующий функциональный блок после стабилизации публичной проверки документов
```

---

## Checkpoint 6.55 - операционный центр каталога и публичных курсов

Контур публичного каталога, карточек курсов, самозаписи, фильтров и связанных административных маршрутов стабилизирован.

Закрыто:

- 6.55.1 - Dashboard: сценарий `Операционный центр каталога и публичных курсов`
- 6.55.2 - CatalogPage: диагностика публичного каталога, фильтров и самозаписи
- 6.55.3 - smoke-покрытие прямых маршрутов операционного центра каталога и публичных курсов
- 6.55.4 - финальная стабилизация блока операционного центра каталога и публичных курсов

Результат:

- Dashboard содержит отдельный сценарий контроля публичного каталога и публичных курсов;
- CatalogPage показывает диагностику загрузки, ошибок, поиска, фильтров, количества программ и записей пользователя;
- диагностируются пустой каталог, пустая выдача по фильтрам, ошибка загрузки, отсутствие форматов и сценарии самозаписи;
- публичный каталог связан с карточкой курса, личным кабинетом, итоговыми документами и публичной проверкой документов;
- прямые маршруты каталога, карточки курса, курсов, назначений, документов и аудита курсов покрыты smoke-проверками.

Основные маршруты:

- `/catalog`
- `/courses/SMOKE-NOT-FOUND`
- `/admin/courses?is_active=true`
- `/admin/courses?is_active=false`
- `/admin/enrollments`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/documents?status=available`
- `/admin/audit-events?entity_type=course`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.56 - следующий функциональный блок после стабилизации каталога и публичных курсов
```

---

## Checkpoint 6.56 - операционный центр карточки курса и самозаписи

Контур публичной карточки курса, структуры модулей/уроков, самозаписи и связанных маршрутов стабилизирован.

Закрыто:

- 6.56.1 - Dashboard: сценарий `Операционный центр карточки курса и самозаписи`
- 6.56.2 - CourseDetailPage: диагностика карточки курса, структуры и самозаписи
- 6.56.3 - smoke-покрытие прямых маршрутов операционного центра карточки курса и самозаписи
- 6.56.4 - финальная стабилизация блока операционного центра карточки курса и самозаписи

Результат:

- Dashboard содержит отдельный сценарий контроля карточки курса и самозаписи;
- CourseDetailPage показывает диагностику slug, структуры модулей/уроков, обязательных уроков, итогового документа и состояния самозаписи;
- диагностируются неактивный курс, отсутствие slug, отсутствие формата/часов/итогового документа, отсутствие модулей/уроков и ошибки записи;
- карточка курса связана с каталогом, регистрацией, личным кабинетом, публичной проверкой документов, назначениями и аудитом;
- прямые маршруты карточки курса, регистрации, кабинета, курсов, назначений, документов и аудита покрыты smoke-проверками.

Основные маршруты:

- `/catalog`
- `/courses/SMOKE-NOT-FOUND`
- `/register`
- `/account`
- `/verify-document`
- `/admin/courses?is_active=true`
- `/admin/courses?is_active=false`
- `/admin/enrollments?status=assigned`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/documents?status=available`
- `/admin/audit-events?entity_type=course`
- `/admin/audit-events?entity_type=enrollment`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.57 - следующий функциональный блок после стабилизации карточки курса и самозаписи
```

---

## Checkpoint 6.57 - операционный центр прохождения обучения и уроков

Контур прохождения обучения, уроков, прогресса, обязательных материалов, завершения курса и итоговых документов стабилизирован.

Закрыто:

- 6.57.1 - Dashboard: сценарий `Операционный центр прохождения обучения и уроков`
- 6.57.2 - AccountPage: диагностика прохождения обучения, уроков и завершения курса
- 6.57.3 - smoke-покрытие прямых маршрутов операционного центра прохождения обучения и уроков
- 6.57.4 - финальная стабилизация блока операционного центра прохождения обучения и уроков

Результат:

- Dashboard содержит отдельный сценарий контроля прохождения обучения и уроков;
- AccountPage показывает диагностику назначенных, активных и завершённых программ;
- диагностируются открытая программа курса, общий прогресс, обязательные уроки, ошибки открытия программы и ошибки старта/завершения;
- завершение курса связано с проверкой обязательных уроков и появлением черновика итогового документа;
- личный кабинет связан с каталогом, документами, публичной проверкой, назначениями и аудитом;
- прямые маршруты личного кабинета, назначений, документов и аудита покрыты smoke-проверками.

Основные маршруты:

- `/account`
- `/catalog`
- `/verify-document`
- `/admin/enrollments?status=assigned`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/enrollments?action_required=true`
- `/admin/documents?status=draft`
- `/admin/documents?status=available`
- `/admin/documents?action_required=true`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=document`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.58 - следующий функциональный блок после стабилизации прохождения обучения и уроков
```

---

## Checkpoint 6.58 - операционный центр итоговых документов после обучения

Контур итоговых документов после завершения обучения, публикации, скачивания PDF, QR/публичной проверки, отзыва, восстановления и аудита стабилизирован.

Закрыто:

- 6.58.1 - Dashboard: сценарий `Операционный центр итоговых документов после обучения`
- 6.58.2 - AccountPage: диагностика итоговых документов после обучения
- 6.58.3 - smoke-покрытие прямых маршрутов операционного центра итоговых документов после обучения
- 6.58.4 - финальная стабилизация блока операционного центра итоговых документов после обучения

Результат:

- Dashboard содержит отдельный сценарий контроля итоговых документов после обучения;
- AccountPage показывает диагностику завершённых программ, черновиков, опубликованных и отозванных документов;
- диагностируются доступность скачивания, наличие PDF, наличие файла, номер/код публичной проверки и связь документа с завершённым курсом;
- публичная проверка документа связана с личным кабинетом и административным контуром документов;
- маршруты документов, завершённых назначений, публичной проверки и аудита PDF/отзыва/восстановления покрыты smoke-проверками.

Основные маршруты:

- `/account`
- `/verify-document`
- `/admin/enrollments?status=completed`
- `/admin/enrollments?action_required=true`
- `/admin/documents?status=draft`
- `/admin/documents?status=available`
- `/admin/documents?status=revoked`
- `/admin/documents?action_required=true`
- `/admin/documents?document_type=certificate`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?action=admin.document_regenerated`
- `/admin/audit-events?action=admin.document_revoked`
- `/admin/audit-events?action=admin.document_restored`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.59 - следующий функциональный блок после стабилизации итоговых документов после обучения
```

---

## Checkpoint 6.59 - операционный центр публичной проверки и QR-документов

Контур публичной проверки документов, QR-ссылок, проверки по номеру/коду, статусов available/revoked/draft, ошибок поиска и аудита операций с документами стабилизирован.

Закрыто:

- 6.59.1 - Dashboard: сценарий `Операционный центр публичной проверки и QR-документов`
- 6.59.2 - VerifyDocumentPage: диагностика публичной проверки, QR-ссылок и статусов документа
- 6.59.3 - smoke-покрытие прямых маршрутов операционного центра публичной проверки и QR-документов
- 6.59.4 - финальная стабилизация блока публичной проверки и QR-документов

Результат:

- Dashboard содержит отдельный сценарий контроля публичной проверки и QR-документов;
- VerifyDocumentPage показывает операционный QR-блок проверки по номеру, коду и QR-ссылке;
- диагностируются текущий запрос, режим проверки, статус реестра, готовность QR, наличие номера/кода и проблемные статусы;
- публичная проверка учитывает published/available, draft, revoked, ошибки поиска и отсутствие результата;
- прямые маршруты `/verify-document`, query-проверок, документов и аудита покрыты smoke-проверками.

Основные маршруты:

- `/verify-document`
- `/verify-document?number=SMOKE-NOT-FOUND`
- `/verify-document?code=SMOKE-NOT-FOUND`
- `/account`
- `/catalog`
- `/admin/documents?status=available`
- `/admin/documents?status=draft`
- `/admin/documents?status=revoked`
- `/admin/documents?action_required=true`
- `/admin/documents?document_type=certificate`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?action=admin.document_regenerated`
- `/admin/audit-events?action=admin.document_revoked`
- `/admin/audit-events?action=admin.document_restored`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.60 - следующий функциональный блок после стабилизации публичной проверки и QR-документов
```

---

## Checkpoint 6.60 - операционный центр административного реестра документов

Контур административного реестра документов, фильтров, статусов, action_required, публикации, отзыва, восстановления, скачивания, регенерации PDF и аудита стабилизирован.

Закрыто:

- 6.60.1 - Dashboard: сценарий `Операционный центр административного реестра документов`
- 6.60.2 - DocumentsPage: диагностика административного реестра документов
- 6.60.3 - smoke-покрытие прямых маршрутов административного реестра документов
- 6.60.4 - финальная стабилизация блока административного реестра документов

Результат:

- Dashboard содержит отдельный сценарий контроля административного реестра документов;
- DocumentsPage показывает диагностический блок реестра документов;
- диагностируются фильтры, статусы draft/available/revoked, action_required, файлы, отсутствие файлов, авто PDF, PDF к публикации, номер/код проверки и связь с назначениями;
- отображаются текущие операции: создание, редактирование, скачивание, регенерация PDF, загрузка истории PDF, смена статуса, отзыв и удаление;
- прямые маршруты реестра документов, фильтров, завершённых назначений, публичной проверки и аудита документов покрыты smoke-проверками.

Основные маршруты:

- `/admin/documents`
- `/admin/documents?status=draft`
- `/admin/documents?status=available`
- `/admin/documents?status=revoked`
- `/admin/documents?action_required=true`
- `/admin/documents?document_type=certificate`
- `/admin/documents?q=__missing_smoke_worklist_query__`
- `/admin/documents?user_id=00000000-0000-0000-0000-000000000000`
- `/admin/documents?organization_id=00000000-0000-0000-0000-000000000000`
- `/admin/documents?enrollment_id=00000000-0000-0000-0000-000000000000`
- `/admin/documents?status=draft&action_required=true`
- `/admin/documents?status=revoked&action_required=true`
- `/admin/enrollments?status=completed`
- `/verify-document`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?action=admin.document_created`
- `/admin/audit-events?action=admin.document_regenerated`
- `/admin/audit-events?action=admin.document_revoked`
- `/admin/audit-events?action=admin.document_restored`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.61 - следующий функциональный блок после стабилизации административного реестра документов
```

---

## Checkpoint 6.61 - операционный центр административного каталога курсов

Контур административного каталога курсов, активных и неактивных программ, модулей, уроков, обязательных материалов, публичного каталога, самозаписи, назначений, завершения обучения и итоговых документов стабилизирован.

Закрыто:

- 6.61.1 - Dashboard: сценарий `Операционный центр административного каталога курсов`
- 6.61.2 - AdminCoursesPage: диагностика административного каталога курсов
- 6.61.3 - smoke-покрытие прямых маршрутов административного каталога курсов
- 6.61.4 - финальная стабилизация блока административного каталога курсов

Результат:

- Dashboard содержит отдельный сценарий контроля административного каталога курсов;
- AdminCoursesPage показывает диагностический блок каталога курсов;
- диагностируются активные и неактивные курсы, фильтры, модули, уроки, обязательные уроки, публичная карточка и тип итогового документа;
- отображаются проблемные состояния: курсы без модулей, модули без уроков, отсутствие обязательных уроков, неактивные модули/уроки, отсутствие slug и типа итогового документа;
- отображаются текущие операции: создание, редактирование, активация, деактивация и удаление курса, модуля или урока;
- прямые маршруты каталога курсов, публичного каталога, самозаписи, назначений, документов и аудита покрыты smoke-проверками.

Основные маршруты:

- `/admin/courses`
- `/admin/courses?is_active=true`
- `/admin/courses?is_active=false`
- `/admin/courses?q=__missing_smoke_course_query__`
- `/catalog`
- `/courses/SMOKE-NOT-FOUND`
- `/register`
- `/account`
- `/admin/enrollments`
- `/admin/enrollments?status=assigned`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/enrollments?action_required=true`
- `/admin/documents?status=draft`
- `/admin/documents?status=available`
- `/admin/documents?document_type=certificate`
- `/admin/audit-events?entity_type=course`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=document`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.62 - следующий функциональный блок после стабилизации административного каталога курсов
```

---

## Checkpoint 6.62 - операционный центр административных назначений обучения

Контур административных назначений обучения, статусов assigned/active/completed/cancelled, action_required, групповых назначений, связей с пользователем, организацией, группой, курсом, завершения обучения и итоговых документов стабилизирован.

Закрыто:

- 6.62.1 - Dashboard: сценарий `Операционный центр административных назначений обучения`
- 6.62.2 - AdminEnrollmentsPage: диагностика административных назначений обучения
- 6.62.3 - smoke-покрытие прямых маршрутов административных назначений обучения
- 6.62.4 - финальная стабилизация блока административных назначений обучения

Результат:

- Dashboard содержит отдельный сценарий контроля административных назначений обучения;
- AdminEnrollmentsPage показывает диагностический блок назначений;
- диагностируются статусы assigned/active/completed/cancelled, action_required, активные фильтры, связи с организацией и учебной группой;
- отображаются проблемные состояния: назначения без организации, без группы, отсутствие started_at/completed_at, отсутствие активных курсов или активных групп;
- отображаются текущие операции: создание одиночного назначения, массовое назначение группе, редактирование, завершение и удаление;
- прямые маршруты назначений, фильтров, групп, пользователей, организаций, документов и аудита покрыты smoke-проверками.

Основные маршруты:

- `/admin/enrollments`
- `/admin/enrollments?status=assigned`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/enrollments?status=cancelled`
- `/admin/enrollments?action_required=true`
- `/admin/enrollments?q=__missing_smoke_enrollment_query__`
- `/admin/enrollments?user_id=00000000-0000-0000-0000-000000000000`
- `/admin/enrollments?course_id=00000000-0000-0000-0000-000000000000`
- `/admin/enrollments?organization_id=00000000-0000-0000-0000-000000000000`
- `/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000`
- `/admin/enrollments?status=assigned&action_required=true`
- `/admin/enrollments?status=completed&action_required=true`
- `/admin/courses?is_active=true`
- `/admin/groups`
- `/admin/groups?active=true`
- `/admin/users`
- `/admin/organizations`
- `/admin/documents?status=draft`
- `/admin/documents?status=available`
- `/admin/documents?action_required=true`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=document`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.63 - следующий функциональный блок после стабилизации административных назначений обучения
```

---

## Checkpoint 6.63 - операционный центр учебных групп

Контур учебных групп, активных и неактивных групп, организаций, участников, групповых назначений, action_required, документов и аудита связей обучения стабилизирован.

Закрыто:

- 6.63.1 - Dashboard: сценарий `Операционный центр учебных групп`
- 6.63.2 - GroupsPage: диагностика операционного центра учебных групп
- 6.63.3 - smoke-покрытие прямых маршрутов учебных групп
- 6.63.4 - финальная стабилизация блока учебных групп

Результат:

- Dashboard содержит отдельный сценарий контроля учебных групп;
- GroupsPage показывает диагностический блок операционного центра учебных групп;
- диагностируются активные и неактивные группы, активные фильтры, связь с организацией, код группы и описание;
- отображаются проблемные состояния: группы без организации, без кода, без описания, отсутствие организаций для создания групп;
- сохранены переходы к участникам, организациям, пользователям, назначениям, проблемным назначениям, проблемным документам и аудиту;
- прямые маршруты групп, фильтров, организаций, пользователей, назначений, документов и аудита покрыты smoke-проверками.

Основные маршруты:

- `/admin/groups`
- `/admin/groups?status=active`
- `/admin/groups?status=inactive`
- `/admin/groups?q=__missing_smoke_group_query__`
- `/admin/groups?organization_id=00000000-0000-0000-0000-000000000000`
- `/admin/groups?status=active&organization_id=00000000-0000-0000-0000-000000000000`
- `/admin/groups?status=inactive&organization_id=00000000-0000-0000-0000-000000000000`
- `/admin/organizations`
- `/admin/organizations?q=__missing_smoke_group_org_query__`
- `/admin/users`
- `/admin/users?q=__missing_smoke_group_user_query__`
- `/admin/enrollments?status=assigned`
- `/admin/enrollments?status=active`
- `/admin/enrollments?status=completed`
- `/admin/enrollments?action_required=true`
- `/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000`
- `/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000&action_required=true`
- `/admin/courses?is_active=true`
- `/admin/documents?status=draft`
- `/admin/documents?action_required=true`
- `/admin/documents?learning_group_id=00000000-0000-0000-0000-000000000000&action_required=true`
- `/admin/audit-events?entity_type=learning_group`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=organization`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.64 - следующий функциональный блок после стабилизации учебных групп
```
