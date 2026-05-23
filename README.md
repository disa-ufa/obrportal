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

---

## Checkpoint 6.64 - операционный центр аудита и расследований

Контур аудита и расследований, фильтров action/entity_type/entity_id/actor_user_id/limit, быстрых расследований, связанных разделов, критичных действий, RBAC-событий и document/PDF-событий стабилизирован.

Закрыто:

- 6.64.1 - Dashboard: сценарий `Операционный центр аудита и расследований`
- 6.64.2 - AuditPage: диагностика аудита и расследований
- 6.64.3 - smoke-покрытие прямых маршрутов аудита и расследований
- 6.64.4 - финальная стабилизация блока аудита и расследований

Результат:

- Dashboard содержит отдельный сценарий контроля аудита и расследований;
- AuditPage показывает диагностический блок аудита и расследований;
- диагностируются фильтры action, entity_type, entity_id, actor_user_id и limit;
- отображаются события документов, назначений, пользователей, организаций, учебных групп, курсов, ролей и прав;
- отображаются критичные действия: удаление, отзыв, восстановление, регенерация и другие действия document/PDF-контура;
- поддержаны быстрые переходы к журналу аудита, расширенной выдаче, документам, назначениям, пользователям, ролям, правам и отзывам документов;
- прямые маршруты аудита, расследований, связанных реестров, action_required документов и action_required назначений покрыты smoke-проверками.

Основные маршруты:

- `/admin/audit-events`
- `/admin/audit-events?limit=25`
- `/admin/audit-events?limit=200`
- `/admin/audit-events?action=admin.user_created`
- `/admin/audit-events?action=admin.document_created`
- `/admin/audit-events?action=admin.document_regenerated`
- `/admin/audit-events?action=admin.document_revoked`
- `/admin/audit-events?action=admin.document_restored`
- `/admin/audit-events?entity_type=user`
- `/admin/audit-events?entity_type=organization`
- `/admin/audit-events?entity_type=learning_group`
- `/admin/audit-events?entity_type=course`
- `/admin/audit-events?entity_type=enrollment`
- `/admin/audit-events?entity_type=document`
- `/admin/audit-events?entity_type=role`
- `/admin/audit-events?entity_type=permission`
- `/admin/audit-events?actor_user_id=00000000-0000-0000-0000-000000000000`
- `/admin/audit-events?entity_id=00000000-0000-0000-0000-000000000000`
- `/admin/audit-events?entity_type=document&entity_id=00000000-0000-0000-0000-000000000000`
- `/admin/audit-events?entity_type=user&actor_user_id=00000000-0000-0000-0000-000000000000`
- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/organizations`
- `/admin/groups`
- `/admin/courses`
- `/admin/enrollments`
- `/admin/documents`
- `/admin/documents?action_required=true`
- `/admin/enrollments?action_required=true`

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
6.65 - следующий функциональный блок после стабилизации аудита и расследований
```

---

## Checkpoint 6.65 - операционный центр качества frontend shell и навигации

Контур качества frontend shell, admin/public навигации, прямых маршрутов, fallback-страниц, Dashboard-ссылок, публичных страниц и защиты от сломанных переходов стабилизирован.

Закрыто:

- 6.65.1 - Dashboard: сценарий `Операционный центр качества frontend shell и навигации`
- 6.65.2 - AppShell/PublicShell: диагностика качества shell и навигации
- 6.65.3 - smoke-покрытие прямых маршрутов frontend shell и навигации
- 6.65.4 - финальная стабилизация блока frontend shell и навигации

Результат:

- Dashboard содержит отдельный сценарий контроля frontend shell и навигации;
- AppShell показывает диагностический блок качества admin shell;
- PublicShell показывает диагностический блок качества public shell;
- диагностируются admin routes, дубли path, неизвестный currentPage, count keys, состояние загрузки Admin API;
- диагностируются public nav, footer links, текущий публичный раздел, целевая зона пользователя: auth/admin/organization/account;
- прямые admin route, unknown admin route, public route, course fallback, verify fallback и public fallback покрыты smoke-проверками;
- сохранён контроль Dashboard → разделы → фильтры → публичные страницы → fallback-страницы.

Основные маршруты:

- `/admin`
- `/admin/__missing_shell_route__`
- `/admin/users?from=shell-navigation`
- `/admin/organizations?from=shell-navigation`
- `/admin/groups?from=shell-navigation`
- `/admin/courses?from=shell-navigation`
- `/admin/enrollments?from=shell-navigation`
- `/admin/documents?from=shell-navigation`
- `/admin/roles?from=shell-navigation`
- `/admin/permissions?from=shell-navigation`
- `/admin/audit-events?from=shell-navigation`
- `/`
- `/catalog?from=shell-navigation`
- `/courses/__missing_shell_navigation_course__`
- `/organization-info?from=shell-navigation`
- `/organization?from=shell-navigation`
- `/verify-document?from=shell-navigation`
- `/verify/__missing_shell_navigation_code__`
- `/contacts?from=shell-navigation`
- `/faq?from=shell-navigation`
- `/privacy?from=shell-navigation`
- `/offer?from=shell-navigation`
- `/login?from=shell-navigation`
- `/register?from=shell-navigation`
- `/account?from=shell-navigation`
- `/__missing_public_shell_route__`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_hooks_layout.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.66 - следующий функциональный блок после стабилизации frontend shell и навигации
```

---

## Checkpoint 6.66 - операционный центр качества frontend routes/builders/meta

Контур качества frontend routes/builders/meta, adminRoutes, adminLinks, publicRoutes, query builders, entity links, public meta и fallback route стабилизирован.

Закрыто:

- 6.66.1 - Dashboard: сценарий `Операционный центр качества frontend routes/builders/meta`
- 6.66.2 - adminLinks/publicRoutes: диагностика routes/builders/meta
- 6.66.3 - smoke-покрытие прямых маршрутов frontend routes/builders/meta
- 6.66.4 - финальная стабилизация блока frontend routes/builders/meta

Результат:

- Dashboard содержит отдельный сценарий контроля frontend routes/builders/meta;
- adminLinks содержит диагностические cases для builders и entity admin links;
- publicRoutes содержит диагностические cases для public routes, page keys и meta title/description;
- контролируются buildAuditPath, buildUsersPath, buildOrganizationsPath, buildGroupsPath, buildCoursesPath, buildEnrollmentsPath, buildDocumentsPath, buildRolesPath и buildPermissionsPath;
- контролируется buildEntityAdminPath для user, organization, learning_group, course, enrollment, document, role и permission;
- контролируются PUBLIC_ROUTE_MAP, getPublicPageFromPathname и buildPublicMeta;
- прямые маршруты admin builders, public meta, course fallback, verify fallback и public not-found покрыты smoke-проверками.

Основные маршруты:

- `/admin`
- `/admin/users?activity=inactive`
- `/admin/users?q=__routes_meta_user__`
- `/admin/organizations?scope=with_kpp`
- `/admin/organizations?q=__routes_meta_org__`
- `/admin/groups?status=active&organization_id=00000000-0000-0000-0000-000000000000`
- `/admin/groups?q=__routes_meta_group__`
- `/admin/courses?is_active=true&q=__routes_meta_course__`
- `/admin/courses?q=__routes_meta_course__`
- `/admin/enrollments?status=completed&action_required=true`
- `/admin/enrollments?q=__routes_meta_enrollment__`
- `/admin/documents?status=available&type=certificate`
- `/admin/documents?q=__routes_meta_document__`
- `/admin/roles?type=system`
- `/admin/roles?q=__routes_meta_role__`
- `/admin/permissions?group=audit`
- `/admin/permissions?q=__routes_meta_permission__`
- `/admin/audit-events?entity_type=document&limit=25`
- `/`
- `/catalog?from=routes-builders-meta`
- `/courses/__missing_routes_meta_course__`
- `/organization-info?from=routes-builders-meta`
- `/organization?from=routes-builders-meta`
- `/verify-document?from=routes-builders-meta`
- `/verify/__missing_routes_meta_code__`
- `/contacts?from=routes-builders-meta`
- `/faq?from=routes-builders-meta`
- `/privacy?from=routes-builders-meta`
- `/offer?from=routes-builders-meta`
- `/login?from=routes-builders-meta`
- `/register?from=routes-builders-meta`
- `/account?from=routes-builders-meta`
- `/__missing_routes_meta_public__`

Контрольные проверки:

```powershell
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_frontend_utils_routes.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_frontend_hooks_layout.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\check_no_todo_markers.py
```

Следующий функциональный блок:

```text
6.67 - следующий функциональный блок после стабилизации frontend routes/builders/meta
```

---

## Checkpoint 6.67 - операционный центр качества frontend smoke/guards coverage

Контур качества smoke/guard scripts, покрытия frontend/backend проверками, API error guard, mojibake guard, BOM/text encoding guard, bundle encoding и защиты от маркеров незавершённой реализации стабилизирован.

Закрыто:

- 6.67.1 - Dashboard: сценарий `Операционный центр качества frontend smoke/guards coverage`
- 6.67.2 - диагностика smoke/guard coverage scripts
- 6.67.3 - smoke-покрытие прямых маршрутов frontend smoke/guards coverage
- 6.67.4 - финальная стабилизация блока frontend smoke/guards coverage

Результат:

- Dashboard содержит отдельный сценарий контроля frontend smoke/guards coverage;
- check_frontend_smoke_coverage.py диагностирует обязательные frontend guard/smoke scripts;
- check_backend_smoke_coverage.py диагностирует обязательные backend guard/smoke scripts и explicit coverage hints;
- frontend_guard.py показывает диагностическую сводку по protected patterns, extensions и excluded dirs;
- smoke_frontend_core.py контролирует наличие diagnostics-блоков в coverage/guard scripts;
- прямые маршруты admin/public/fallback для smoke guards coverage покрыты smoke-проверками;
- полный gate подтверждён: secret scan, encoding guards, frontend guards, pytest, smoke scripts, coverage guards, frontend build и bundle encoding.

Основные маршруты:

- `/admin?from=smoke-guards-coverage`
- `/admin/__missing_smoke_guards_route__`
- `/admin/users?activity=inactive&from=smoke-guards-coverage`
- `/admin/organizations?scope=with_kpp&from=smoke-guards-coverage`
- `/admin/groups?status=active&from=smoke-guards-coverage`
- `/admin/courses?is_active=true&from=smoke-guards-coverage`
- `/admin/enrollments?action_required=true&from=smoke-guards-coverage`
- `/admin/documents?action_required=true&from=smoke-guards-coverage`
- `/admin/documents?status=available&type=certificate&from=smoke-guards-coverage`
- `/admin/audit-events?entity_type=document&limit=25&from=smoke-guards-coverage`
- `/admin/roles?type=system&from=smoke-guards-coverage`
- `/admin/permissions?group=audit&from=smoke-guards-coverage`
- `/`
- `/catalog?from=smoke-guards-coverage`
- `/courses/__missing_smoke_guards_course__`
- `/organization-info?from=smoke-guards-coverage`
- `/organization?from=smoke-guards-coverage`
- `/verify-document?from=smoke-guards-coverage`
- `/verify/__missing_smoke_guards_code__`
- `/contacts?from=smoke-guards-coverage`
- `/faq?from=smoke-guards-coverage`
- `/privacy?from=smoke-guards-coverage`
- `/offer?from=smoke-guards-coverage`
- `/login?from=smoke-guards-coverage`
- `/register?from=smoke-guards-coverage`
- `/account?from=smoke-guards-coverage`
- `/__missing_smoke_guards_public__`

Контрольные проверки:

```powershell
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\frontend_guard.py
docker compose exec backend pytest app/tests -q
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\smoke_frontend_hooks_layout.py
python .\scripts\smoke_frontend_utils_routes.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_frontend_smoke_coverage.py
python .\scripts\check_backend_smoke_coverage.py
python .\scripts\check_no_todo_markers.py
docker compose exec frontend npm run build
python .\scripts\check_frontend_bundle_encoding.py
```

Следующий функциональный блок:

```text
6.68 - следующий функциональный блок после стабилизации frontend smoke/guards coverage
```

---

## Checkpoint 6.68 - операционный центр качества CI/CD и локального gate

Контур качества CI/CD и локального полного gate стабилизирован: GitHub Actions синхронизирован с локальными проверками, добавлен контроль расхождений между CI workflow и локальным gate.

Закрыто:

- 6.68.1 - Dashboard: сценарий `Операционный центр качества CI/CD и локального gate`
- 6.68.2 - диагностика соответствия CI/CD и локального gate
- 6.68.3 - smoke-покрытие прямых маршрутов CI/CD и локального gate
- 6.68.4 - финальная стабилизация блока CI/CD и локального gate

Результат:

- Dashboard содержит отдельный сценарий контроля CI/CD и локального gate;
- добавлен `scripts/check_ci_local_gate.py` для проверки соответствия GitHub Actions локальному полному gate;
- `.github/workflows/ci.yml` запускает `Run CI/local gate consistency guard`;
- `check_frontend_smoke_coverage.py` учитывает `check_ci_local_gate.py` как обязательный frontend guard script;
- `smoke_frontend_core.py` контролирует наличие CI/local gate diagnostics и CI workflow step;
- прямые admin/public/fallback маршруты CI/local gate покрыты smoke-проверками;
- полный gate подтверждён: secret scan, encoding guards, frontend guards, CI/local gate guard, pytest, smoke scripts, coverage guards, frontend build и bundle encoding.

Основные маршруты:

- `/admin?from=ci-local-gate`
- `/admin/__missing_ci_gate_route__`
- `/admin/users?activity=inactive&from=ci-local-gate`
- `/admin/organizations?scope=with_kpp&from=ci-local-gate`
- `/admin/groups?status=active&from=ci-local-gate`
- `/admin/courses?is_active=true&from=ci-local-gate`
- `/admin/enrollments?action_required=true&from=ci-local-gate`
- `/admin/documents?action_required=true&from=ci-local-gate`
- `/admin/documents?status=available&type=certificate&from=ci-local-gate`
- `/admin/audit-events?entity_type=document&limit=25&from=ci-local-gate`
- `/admin/audit-events?entity_type=user&limit=25&from=ci-local-gate`
- `/admin/roles?type=system&from=ci-local-gate`
- `/admin/permissions?group=audit&from=ci-local-gate`
- `/`
- `/catalog?from=ci-local-gate`
- `/courses/__missing_ci_gate_course__`
- `/organization-info?from=ci-local-gate`
- `/organization?from=ci-local-gate`
- `/verify-document?from=ci-local-gate`
- `/verify/__missing_ci_gate_code__`
- `/contacts?from=ci-local-gate`
- `/faq?from=ci-local-gate`
- `/privacy?from=ci-local-gate`
- `/offer?from=ci-local-gate`
- `/login?from=ci-local-gate`
- `/register?from=ci-local-gate`
- `/account?from=ci-local-gate`
- `/__missing_ci_gate_public__`

Контрольные проверки:

```powershell
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\frontend_guard.py
python .\scripts\check_ci_local_gate.py
docker compose exec backend pytest app/tests -q
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\smoke_frontend_hooks_layout.py
python .\scripts\smoke_frontend_utils_routes.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_frontend_smoke_coverage.py
python .\scripts\check_backend_smoke_coverage.py
python .\scripts\check_no_todo_markers.py
docker compose exec frontend npm run build
python .\scripts\check_frontend_bundle_encoding.py
```

Следующий функциональный блок:

```text
6.69 - следующий функциональный блок после стабилизации CI/CD и локального gate
```

---

## Checkpoint 6.69 - операционный центр production readiness / release checklist

Контур production readiness / release checklist стабилизирован: env/config, Docker Compose, health/ready, migrations, seeds, storage, logs, release smoke, CI/local gate и rollback-порядок закрыты проверками.

Закрыто:

- 6.69.1 - Dashboard: сценарий `Операционный центр production readiness / release checklist`
- 6.69.2 - диагностика production readiness / release checklist
- 6.69.3 - smoke-покрытие прямых маршрутов production readiness / release checklist
- 6.69.4 - финальная стабилизация блока production readiness / release checklist

Результат:

- Dashboard содержит отдельный сценарий контроля production readiness / release checklist;
- добавлен `scripts/check_release_readiness.py` для контроля release-ready окружения;
- `.github/workflows/ci.yml` запускает `Run release readiness guard`;
- `check_ci_local_gate.py` учитывает `check_release_readiness.py` как обязательную CI/local gate проверку;
- `check_frontend_smoke_coverage.py` учитывает `check_release_readiness.py` как обязательный frontend guard script;
- `smoke_frontend_core.py` контролирует наличие release readiness diagnostics и CI workflow step;
- прямые admin/public/fallback маршруты production readiness покрыты smoke-проверками;
- полный gate подтверждён: secret scan, encoding guards, frontend guards, CI/local gate guard, release readiness guard, pytest, smoke scripts, coverage guards, frontend build и bundle encoding.

Основные маршруты:

- `/admin?from=production-readiness`
- `/admin/__missing_release_route__`
- `/admin/users?activity=inactive&from=production-readiness`
- `/admin/organizations?scope=with_kpp&from=production-readiness`
- `/admin/groups?status=active&from=production-readiness`
- `/admin/courses?is_active=true&from=production-readiness`
- `/admin/enrollments?action_required=true&from=production-readiness`
- `/admin/documents?action_required=true&from=production-readiness`
- `/admin/documents?status=available&type=certificate&from=production-readiness`
- `/admin/audit-events?entity_type=document&limit=25&from=production-readiness`
- `/admin/audit-events?entity_type=user&limit=25&from=production-readiness`
- `/admin/audit-events?entity_type=organization&limit=25&from=production-readiness`
- `/admin/roles?type=system&from=production-readiness`
- `/admin/permissions?group=audit&from=production-readiness`
- `/`
- `/catalog?from=production-readiness`
- `/courses/__missing_release_course__`
- `/organization-info?from=production-readiness`
- `/organization?from=production-readiness`
- `/verify-document?from=production-readiness`
- `/verify/__missing_release_code__`
- `/contacts?from=production-readiness`
- `/faq?from=production-readiness`
- `/privacy?from=production-readiness`
- `/offer?from=production-readiness`
- `/login?from=production-readiness`
- `/register?from=production-readiness`
- `/account?from=production-readiness`
- `/__missing_release_public__`

Контрольные проверки:

```powershell
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\frontend_guard.py
python .\scripts\check_ci_local_gate.py
python .\scripts\check_release_readiness.py
docker compose exec backend pytest app/tests -q
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\smoke_frontend_hooks_layout.py
python .\scripts\smoke_frontend_utils_routes.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_frontend_smoke_coverage.py
python .\scripts\check_backend_smoke_coverage.py
python .\scripts\check_no_todo_markers.py
docker compose exec frontend npm run build
python .\scripts\check_frontend_bundle_encoding.py
```

Следующий функциональный блок:

```text
6.70 - следующий функциональный блок после стабилизации production readiness / release checklist
```

---

## Checkpoint 6.70 - операционный центр release versioning / changelog / deployment handoff

Контур release versioning / changelog / deployment handoff стабилизирован: версия backend/frontend, changelog, release notes, tag-порядок, deployment handoff, rollback-команды, release checklist и post-release verification закрыты проверками.

Закрыто:

- 6.70.1 - Dashboard: сценарий `Операционный центр release versioning / changelog / deployment handoff`
- 6.70.2 - диагностика release versioning / changelog / deployment handoff
- 6.70.3 - smoke-покрытие прямых маршрутов release versioning / changelog / deployment handoff
- 6.70.4 - финальная стабилизация блока release versioning / changelog / deployment handoff

Результат:

- Dashboard содержит отдельный сценарий контроля release versioning / changelog / deployment handoff;
- добавлен `CHANGELOG.md` для фиксации значимых изменений проекта;
- добавлен `docs/release-handoff.md` с release checklist, deployment order, tag order, post-release verification и rollback order;
- добавлен `scripts/check_release_versioning.py` для контроля версии backend/frontend, changelog и handoff-документа;
- `.github/workflows/ci.yml` запускает `Run release versioning guard`;
- `check_ci_local_gate.py` учитывает `check_release_versioning.py` как обязательную CI/local gate проверку;
- `check_release_readiness.py` учитывает `check_release_versioning.py` как обязательную release readiness проверку;
- `check_frontend_smoke_coverage.py` учитывает `check_release_versioning.py` как обязательный frontend guard script;
- `smoke_frontend_core.py` контролирует наличие release versioning diagnostics и CI workflow step;
- прямые admin/public/fallback маршруты release versioning покрыты smoke-проверками;
- полный gate подтверждён: secret scan, encoding guards, frontend guards, CI/local gate guard, release readiness guard, release versioning guard, pytest, smoke scripts, coverage guards, frontend build и bundle encoding.

Версия релиза:

- `0.1.0-stage6`

Основные файлы release handoff:

- `CHANGELOG.md`
- `docs/release-handoff.md`
- `scripts/check_release_versioning.py`
- `.github/workflows/ci.yml`

Основные маршруты:

- `/admin?from=release-versioning`
- `/admin/__missing_release_version_route__`
- `/admin/users?activity=inactive&from=release-versioning`
- `/admin/organizations?scope=with_kpp&from=release-versioning`
- `/admin/groups?status=active&from=release-versioning`
- `/admin/courses?is_active=true&from=release-versioning`
- `/admin/enrollments?action_required=true&from=release-versioning`
- `/admin/documents?action_required=true&from=release-versioning`
- `/admin/documents?status=available&type=certificate&from=release-versioning`
- `/admin/audit-events?entity_type=document&limit=25&from=release-versioning`
- `/admin/audit-events?entity_type=user&limit=25&from=release-versioning`
- `/admin/audit-events?entity_type=organization&limit=25&from=release-versioning`
- `/admin/roles?type=system&from=release-versioning`
- `/admin/permissions?group=audit&from=release-versioning`
- `/`
- `/catalog?from=release-versioning`
- `/courses/__missing_release_version_course__`
- `/organization-info?from=release-versioning`
- `/organization?from=release-versioning`
- `/verify-document?from=release-versioning`
- `/verify/__missing_release_version_code__`
- `/contacts?from=release-versioning`
- `/faq?from=release-versioning`
- `/privacy?from=release-versioning`
- `/offer?from=release-versioning`
- `/login?from=release-versioning`
- `/register?from=release-versioning`
- `/account?from=release-versioning`
- `/__missing_release_version_public__`

Контрольные проверки:

- python .\scripts\secret_scan.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_frontend_api_errors.py
- python .\scripts\check_frontend_mojibake.py
- python .\scripts\frontend_guard.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_release_versioning.py
- docker compose exec backend pytest app/tests -q
- python .\scripts\smoke_auth_rbac.py
- python .\scripts\smoke_document_generation_flow.py
- python .\scripts\smoke_documents_page.py
- python .\scripts\smoke_admin_components.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_public_pages.py
- python .\scripts\smoke_account_page.py
- python .\scripts\smoke_frontend_hooks_layout.py
- python .\scripts\smoke_frontend_utils_routes.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_backend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- docker compose exec frontend npm run build
- python .\scripts\check_frontend_bundle_encoding.py

Следующий функциональный блок:

- 6.71 - следующий функциональный блок после стабилизации release versioning / changelog / deployment handoff

---

## Checkpoint 6.71 - операционный центр release candidate / tag readiness / post-release verification

Контур release candidate / tag readiness / post-release verification стабилизирован: RC-checklist, tag readiness, CI status readiness, post-release verification, rollback readiness и прямые маршруты release candidate закрыты проверками.

Закрыто:

- 6.71.1 - Dashboard: сценарий `Операционный центр release candidate / tag readiness / post-release verification`
- 6.71.2 - диагностика release candidate / tag readiness / post-release verification
- 6.71.3 - smoke-покрытие прямых маршрутов release candidate / tag readiness / post-release verification
- 6.71.4 - финальная стабилизация блока release candidate / tag readiness / post-release verification

Результат:

- Dashboard содержит отдельный сценарий контроля release candidate / tag readiness / post-release verification;
- добавлен `docs/release-candidate-checklist.md` с RC checklist, tag readiness, CI status readiness, post-release verification и rollback readiness;
- добавлен `scripts/check_release_candidate.py` для контроля RC-документа, handoff, changelog и CI-команд;
- `.github/workflows/ci.yml` запускает `Run release candidate guard`;
- `check_ci_local_gate.py` учитывает `check_release_candidate.py` как обязательную CI/local gate проверку;
- `check_release_readiness.py` учитывает `check_release_candidate.py` как обязательную release readiness проверку;
- `check_frontend_smoke_coverage.py` учитывает `check_release_candidate.py` как обязательный frontend guard script;
- `smoke_frontend_core.py` контролирует наличие release candidate diagnostics, CI workflow step и release candidate checklist;
- прямые admin/public/fallback маршруты release candidate покрыты smoke-проверками;
- полный gate подтверждён: secret scan, encoding guards, frontend guards, CI/local gate guard, release readiness guard, release versioning guard, release candidate guard, pytest, smoke scripts, coverage guards, frontend build и bundle encoding.

Версия RC:

- `0.1.0-stage6`

Ожидаемый tag:

- `v0.1.0-stage6`

Основные файлы RC-контура:

- `docs/release-candidate-checklist.md`
- `scripts/check_release_candidate.py`
- `.github/workflows/ci.yml`
- `docs/release-handoff.md`
- `CHANGELOG.md`

Основные маршруты:

- `/admin?from=release-candidate`
- `/admin/__missing_release_candidate_route__`
- `/admin/users?activity=inactive&from=release-candidate`
- `/admin/organizations?scope=with_kpp&from=release-candidate`
- `/admin/groups?status=active&from=release-candidate`
- `/admin/courses?is_active=true&from=release-candidate`
- `/admin/enrollments?action_required=true&from=release-candidate`
- `/admin/documents?action_required=true&from=release-candidate`
- `/admin/documents?status=available&type=certificate&from=release-candidate`
- `/admin/audit-events?entity_type=document&limit=25&from=release-candidate`
- `/admin/audit-events?entity_type=user&limit=25&from=release-candidate`
- `/admin/audit-events?entity_type=organization&limit=25&from=release-candidate`
- `/admin/roles?type=system&from=release-candidate`
- `/admin/permissions?group=audit&from=release-candidate`
- `/`
- `/catalog?from=release-candidate`
- `/courses/__missing_release_candidate_course__`
- `/organization-info?from=release-candidate`
- `/organization?from=release-candidate`
- `/verify-document?from=release-candidate`
- `/verify/__missing_release_candidate_code__`
- `/contacts?from=release-candidate`
- `/faq?from=release-candidate`
- `/privacy?from=release-candidate`
- `/offer?from=release-candidate`
- `/login?from=release-candidate`
- `/register?from=release-candidate`
- `/account?from=release-candidate`
- `/__missing_release_candidate_public__`

Контрольные проверки:

- python .\scripts\secret_scan.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_frontend_api_errors.py
- python .\scripts\check_frontend_mojibake.py
- python .\scripts\frontend_guard.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_release_versioning.py
- python .\scripts\check_release_candidate.py
- docker compose exec backend pytest app/tests -q
- python .\scripts\smoke_auth_rbac.py
- python .\scripts\smoke_document_generation_flow.py
- python .\scripts\smoke_documents_page.py
- python .\scripts\smoke_admin_components.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_public_pages.py
- python .\scripts\smoke_account_page.py
- python .\scripts\smoke_frontend_hooks_layout.py
- python .\scripts\smoke_frontend_utils_routes.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_backend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- docker compose exec frontend npm run build
- python .\scripts\check_frontend_bundle_encoding.py

Следующий функциональный блок:

- 6.72 - следующий функциональный блок после стабилизации release candidate / tag readiness / post-release verification

---

## Checkpoint 6.72 - операционный центр release tag / final publication / post-release smoke

Контур release tag / final publication / post-release smoke стабилизирован: финальный tag, release notes, publication checklist, post-release smoke, rollback checkpoint и прямые маршруты release tag закрыты проверками.

Закрыто:

- 6.72.1 - Dashboard: сценарий `Операционный центр release tag / final publication / post-release smoke`
- 6.72.2 - диагностика release tag / final publication / post-release smoke
- 6.72.3 - smoke-покрытие прямых маршрутов release tag / final publication / post-release smoke
- 6.72.4 - финальная стабилизация блока release tag / final publication / post-release smoke

Результат:

- Dashboard содержит отдельный сценарий контроля release tag / final publication / post-release smoke;
- добавлен `docs/release-publication-checklist.md` с final publication order, release notes, post-release smoke и rollback checkpoint;
- добавлен `scripts/check_release_tag.py` для контроля release publication checklist, RC checklist, handoff, changelog и CI-команд;
- `.github/workflows/ci.yml` запускает `Run release tag guard`;
- `check_ci_local_gate.py` учитывает `check_release_tag.py` как обязательную CI/local gate проверку;
- `check_release_readiness.py` учитывает `check_release_tag.py` как обязательную release readiness проверку;
- `check_frontend_smoke_coverage.py` учитывает `check_release_tag.py` как обязательный frontend guard script;
- `smoke_frontend_core.py` контролирует наличие release tag diagnostics, CI workflow step и release publication checklist;
- прямые admin/public/fallback маршруты release tag покрыты smoke-проверками;
- полный gate подтверждён: secret scan, encoding guards, frontend guards, CI/local gate guard, release readiness guard, release versioning guard, release candidate guard, release tag guard, pytest, smoke scripts, coverage guards, frontend build и bundle encoding.

Версия релиза:

- `0.1.0-stage6`

Ожидаемый tag:

- `v0.1.0-stage6`

Основные файлы release tag контура:

- `docs/release-publication-checklist.md`
- `scripts/check_release_tag.py`
- `.github/workflows/ci.yml`
- `docs/release-candidate-checklist.md`
- `docs/release-handoff.md`
- `CHANGELOG.md`

Основные маршруты:

- `/admin?from=release-tag`
- `/admin/__missing_release_tag_route__`
- `/admin/users?activity=inactive&from=release-tag`
- `/admin/organizations?scope=with_kpp&from=release-tag`
- `/admin/groups?status=active&from=release-tag`
- `/admin/courses?is_active=true&from=release-tag`
- `/admin/enrollments?action_required=true&from=release-tag`
- `/admin/documents?action_required=true&from=release-tag`
- `/admin/documents?status=available&type=certificate&from=release-tag`
- `/admin/audit-events?entity_type=document&limit=25&from=release-tag`
- `/admin/audit-events?entity_type=user&limit=25&from=release-tag`
- `/admin/audit-events?entity_type=organization&limit=25&from=release-tag`
- `/admin/roles?type=system&from=release-tag`
- `/admin/permissions?group=audit&from=release-tag`
- `/`
- `/catalog?from=release-tag`
- `/courses/__missing_release_tag_course__`
- `/organization-info?from=release-tag`
- `/organization?from=release-tag`
- `/verify-document?from=release-tag`
- `/verify/__missing_release_tag_code__`
- `/contacts?from=release-tag`
- `/faq?from=release-tag`
- `/privacy?from=release-tag`
- `/offer?from=release-tag`
- `/login?from=release-tag`
- `/register?from=release-tag`
- `/account?from=release-tag`
- `/__missing_release_tag_public__`

Контрольные проверки:

- python .\scripts\secret_scan.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_frontend_api_errors.py
- python .\scripts\check_frontend_mojibake.py
- python .\scripts\frontend_guard.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_release_versioning.py
- python .\scripts\check_release_candidate.py
- python .\scripts\check_release_tag.py
- docker compose exec backend pytest app/tests -q
- python .\scripts\smoke_auth_rbac.py
- python .\scripts\smoke_document_generation_flow.py
- python .\scripts\smoke_documents_page.py
- python .\scripts\smoke_admin_components.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_public_pages.py
- python .\scripts\smoke_account_page.py
- python .\scripts\smoke_frontend_hooks_layout.py
- python .\scripts\smoke_frontend_utils_routes.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_backend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- docker compose exec frontend npm run build
- python .\scripts\check_frontend_bundle_encoding.py

Следующий функциональный блок:

- 6.73 - финальная подготовка annotated tag `v0.1.0-stage6` и публикации релиза

---

## Checkpoint 7.1 - production deployment preparation

После публикации релиза `v0.1.0-stage6` начат Stage 7: подготовка production deployment без изменения релизного tag.

Закрыто:

- 7.1.1 - production deployment plan
- 7.1.2 - diagnostics для production deployment plan
- 7.1.3 - README checkpoint для production deployment preparation

Результат:

- релизный tag `v0.1.0-stage6` сохранён на commit `ac6f339d40567a107dd19f02ec778fbeb5e19971`;
- `main` оставлен на опубликованном релизе;
- дальнейшая работа ведётся в `develop` как post-release development;
- добавлен `docs/production-deployment-plan.md`; 
- добавлен `scripts/check_production_deployment_plan.py`;
- `.github/workflows/ci.yml` запускает `Run production deployment plan guard`;
- `check_ci_local_gate.py` учитывает production deployment plan guard;
- `check_release_readiness.py` учитывает production deployment plan guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production deployment diagnostics и production deployment plan;
- production deployment plan фиксирует release baseline, production services, env checks, pre-deployment gate, server preparation, backup order, deployment order, post-deployment smoke, rollback order и acceptance criteria.

Основные файлы:

- `docs/production-deployment-plan.md`
- `scripts/check_production_deployment_plan.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 7.2 - production environment template / server deployment checklist

---

## Checkpoint 7.2 - production environment template / server deployment checklist

Контур production environment template подготовлен после релиза `v0.1.0-stage6`: описаны production `.env`, обязательные переменные, reverse proxy requirements, storage/database настройки, seed placeholders, permissions и acceptance checklist.

Закрыто:

- 7.2.1 - production environment template
- 7.2.2 - diagnostics для production environment template
- 7.2.3 - README checkpoint для production environment template / server deployment checklist

Результат:

- добавлен `docs/production-environment-template.md`;
- добавлен `scripts/check_production_environment_template.py`;
- `.github/workflows/ci.yml` запускает `Run production environment template guard`;
- `check_ci_local_gate.py` учитывает production environment template guard;
- `check_release_readiness.py` учитывает production environment template guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production environment diagnostics и production environment template;
- production environment template фиксирует release baseline, `.env` location, application settings, backend URLs/CORS, PostgreSQL, Redis, object storage, initial administrator, organization seed placeholders, reverse proxy requirements, files/permissions и acceptance checklist.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`

Основные файлы:

- `docs/production-environment-template.md`
- `scripts/check_production_environment_template.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 7.3 - production server checklist / deploy commands / rollback commands

---

## Checkpoint 7.3 - production server checklist / deploy commands / rollback commands

Контур production server checklist подготовлен после релиза `v0.1.0-stage6`: описаны server prerequisites, директории, команды первичной подготовки сервера, `.env` permissions, backup, deploy, migrations, seed, health verification, post-deployment smoke и rollback.

Закрыто:

- 7.3.1 - production server checklist
- 7.3.2 - diagnostics для production server checklist
- 7.3.3 - README checkpoint для production server checklist / deploy commands / rollback commands

Результат:

- добавлен `docs/production-server-checklist.md`;
- добавлен `scripts/check_production_server_checklist.py`;
- `.github/workflows/ci.yml` запускает `Run production server checklist guard`;
- `check_ci_local_gate.py` учитывает production server checklist guard;
- `check_release_readiness.py` учитывает production server checklist guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production server diagnostics и production server checklist;
- production server checklist фиксирует release baseline, prerequisites, directories, first server preparation commands, production environment preparation, `.env` permissions, backup commands, deployment commands, migration commands, seed commands, health verification commands, post-deployment smoke checklist, rollback commands и acceptance criteria.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`

Основные файлы:

- `docs/production-server-checklist.md`
- `scripts/check_production_server_checklist.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 7.4 - production reverse proxy / HTTPS / domain checklist

---

## Checkpoint 7.4 - production reverse proxy / HTTPS / domain checklist

Контур production reverse proxy / HTTPS / domain checklist подготовлен после релиза `v0.1.0-stage6`: описаны domain/DNS, HTTPS, frontend routing, backend routing, upstreams, Nginx/Caddy checks, backup reverse proxy config, production verification commands, browser verification и rollback.

Закрыто:

- 7.4.1 - production reverse proxy / HTTPS / domain checklist
- 7.4.2 - diagnostics для production reverse proxy / HTTPS / domain checklist
- 7.4.3 - README checkpoint для production reverse proxy / HTTPS / domain checklist

Результат:

- добавлен `docs/production-reverse-proxy-checklist.md`;
- добавлен `scripts/check_production_reverse_proxy_checklist.py`;
- `.github/workflows/ci.yml` запускает `Run production reverse proxy checklist guard`;
- `check_ci_local_gate.py` учитывает production reverse proxy checklist guard;
- `check_release_readiness.py` учитывает production reverse proxy checklist guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production reverse proxy diagnostics и production reverse proxy checklist;
- production reverse proxy checklist фиксирует release baseline, reverse proxy goals, domain/DNS checklist, HTTPS checklist, frontend/backend routing requirements, upstreams, Nginx/Caddy checklist, backup commands, production verification commands, browser verification, rollback checklist и acceptance criteria.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`

Основные файлы:

- `docs/production-reverse-proxy-checklist.md`
- `scripts/check_production_reverse_proxy_checklist.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 7.5 - production backup / monitoring / maintenance checklist

---

## Checkpoint 7.5 - production backup / monitoring / maintenance checklist

Контур production backup / monitoring / maintenance checklist подготовлен после релиза `v0.1.0-stage6`: описаны backup goals, backup scope, backup directories, PostgreSQL backup/restore, object storage backup, `.env` backup, deployment metadata, reverse proxy backup, monitoring, maintenance, incident response и rollback readiness.

Закрыто:

- 7.5.1 - production backup / monitoring / maintenance checklist
- 7.5.2 - diagnostics для production backup / monitoring / maintenance checklist
- 7.5.3 - README checkpoint для production backup / monitoring / maintenance checklist

Результат:

- добавлен `docs/production-backup-monitoring-checklist.md`;
- добавлен `scripts/check_production_backup_monitoring_checklist.py`;
- `.github/workflows/ci.yml` запускает `Run production backup monitoring checklist guard`;
- `check_ci_local_gate.py` учитывает production backup monitoring checklist guard;
- `check_release_readiness.py` учитывает production backup monitoring checklist guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production backup monitoring diagnostics и production backup monitoring checklist;
- production backup monitoring checklist фиксирует release baseline, backup goals/scope/directories, backup preparation commands, PostgreSQL backup/restore, object storage backup, environment backup, deployment metadata, reverse proxy backup, monitoring commands, maintenance checklist, incident response checklist, rollback readiness checklist и acceptance criteria.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`

Основные файлы:

- `docs/production-backup-monitoring-checklist.md`
- `scripts/check_production_backup_monitoring_checklist.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 7.6 - production deployment final runbook / release handoff consolidation

---

## Checkpoint 7.6 - production deployment final runbook / release handoff consolidation

Контур production deployment final runbook подготовлен после релиза `v0.1.0-stage6`: финально объединены release baseline, environment preparation, server preparation, reverse proxy/HTTPS, backup/monitoring, deployment order, post-deployment verification, browser verification и rollback.

Закрыто:

- 7.6.1 - production deployment final runbook
- 7.6.2 - diagnostics для production deployment final runbook
- 7.6.3 - README checkpoint для production deployment final runbook / release handoff consolidation

Результат:

- добавлен `docs/production-deployment-runbook.md`;
- добавлен `scripts/check_production_deployment_runbook.py`;
- `.github/workflows/ci.yml` запускает `Run production deployment runbook guard`;
- `check_ci_local_gate.py` учитывает production deployment runbook guard;
- `check_release_readiness.py` учитывает production deployment runbook guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production deployment runbook diagnostics и production deployment runbook;
- production deployment runbook объединяет `production-deployment-plan`, `production-environment-template`, `production-server-checklist`, `production-reverse-proxy-checklist`, `production-backup-monitoring-checklist`, `release-handoff` и `CHANGELOG`.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`

Основные файлы:

- `docs/production-deployment-runbook.md`
- `scripts/check_production_deployment_runbook.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Итог Stage 7:

- production deployment preparation собран в документах и guard-скриптах;
- release tag `v0.1.0-stage6` не изменялся;
- `main` оставлен на опубликованном релизе;
- вся post-release production preparation работа велась в `develop`.

Следующий функциональный блок:

- 7.7 - final Stage 7 local gate / decision point before merge to main

---

## Checkpoint 8.1 - production rollout inventory / deployment target preflight

Контур production rollout inventory подготовлен для Stage 8: зафиксирована структура инвентаризации production deployment target перед реальной выкладкой на сервер.

Закрыто:

- 8.1.1 - production rollout inventory document
- 8.1.2 - diagnostics для production rollout inventory
- 8.1.3 - README checkpoint для production rollout inventory / deployment target preflight

Результат:

- добавлен `docs/production-rollout-inventory.md`;
- добавлен `scripts/check_production_rollout_inventory.py`;
- `.github/workflows/ci.yml` запускает `Run production rollout inventory guard`;
- `check_ci_local_gate.py` учитывает production rollout inventory guard;
- `check_release_readiness.py` учитывает production rollout inventory guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production rollout inventory diagnostics и inventory-документа;
- production rollout inventory фиксирует release baseline, deployment target, domain inventory, required services, ports, production environment status, backup readiness, preflight commands и rollout acceptance criteria.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`

Основные файлы:

- `docs/production-rollout-inventory.md`
- `scripts/check_production_rollout_inventory.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.2 - production server facts / real deployment target configuration

---

## Checkpoint 8.2 - production server facts / real deployment target configuration

Контур production server facts подготовлен для Stage 8: зафиксирована структура документа для хранения не-секретных фактов реального production-сервера перед выкладкой.

Закрыто:

- 8.2.1 - production server facts document
- 8.2.2 - diagnostics для production server facts / real deployment target configuration
- 8.2.3 - README checkpoint для production server facts / real deployment target configuration

Результат:

- добавлен `docs/production-server-facts.md`;
- добавлен `scripts/check_production_server_facts.py`;
- `.github/workflows/ci.yml` запускает `Run production server facts guard`;
- `check_ci_local_gate.py` учитывает production server facts guard;
- `check_release_readiness.py` учитывает production server facts guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production server facts diagnostics и server facts-документа;
- production server facts фиксирует server identity, deployment paths, domain/HTTPS facts, reverse proxy facts, Docker/runtime facts, port exposure facts, production environment facts, backup/rollback facts, server preflight commands и production acceptance criteria.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 inventory base: `415f3dd`

Основные файлы:

- `docs/production-server-facts.md`
- `scripts/check_production_server_facts.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_server_facts.py
- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.3 - production server preflight execution / fact collection

---

## Checkpoint 8.3 - production server preflight execution / fact collection

Контур production server preflight execution подготовлен для Stage 8: зафиксирован безопасный порядок сбора не-секретных фактов с реального production-сервера перед выкладкой.

Закрыто:

- 8.3.1 - production server preflight execution document
- 8.3.2 - diagnostics для production server preflight execution / fact collection
- 8.3.3 - README checkpoint для production server preflight execution / fact collection

Результат:

- добавлен `docs/production-server-preflight-execution.md`;
- добавлен `scripts/check_production_server_preflight_execution.py`;
- `.github/workflows/ci.yml` запускает `Run production server preflight execution guard`;
- `check_ci_local_gate.py` учитывает production server preflight execution guard;
- `check_release_readiness.py` учитывает production server preflight execution guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production server preflight execution diagnostics и preflight-документа;
- production server preflight execution фиксирует local preflight, server access preflight, capacity preflight, Docker/Git preflight, directory preflight, network/port preflight, reverse proxy preflight, безопасную `.env` preflight-проверку, backup preflight и fact update workflow.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 inventory base: `415f3dd`
- Stage 8 server facts base: `f2b1d13`

Основные файлы:

- `docs/production-server-preflight-execution.md`
- `scripts/check_production_server_preflight_execution.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_server_preflight_execution.py
- python .\scripts\check_production_server_facts.py
- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.4 - production fact collection result / server facts update

---

## Checkpoint 8.4 - production fact collection result / server facts update

Контур production fact collection result подготовлен для Stage 8: зафиксирована структура безопасного документа для записи результата сбора не-секретных фактов с production-сервера и последующего обновления `production-server-facts.md`.

Закрыто:

- 8.4.1 - production fact collection result document
- 8.4.2 - diagnostics для production fact collection result / server facts update
- 8.4.3 - README checkpoint для production fact collection result / server facts update

Результат:

- добавлен `docs/production-fact-collection-result.md`;
- добавлен `scripts/check_production_fact_collection_result.py`;
- `.github/workflows/ci.yml` запускает `Run production fact collection result guard`;
- `check_ci_local_gate.py` учитывает production fact collection result guard;
- `check_release_readiness.py` учитывает production fact collection result guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production fact collection result diagnostics и fact collection result-документа;
- production fact collection result фиксирует collection status, sanitized server facts summary, sanitized command result checklist, server facts update target, secret exclusion rules, local verification commands и acceptance criteria.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 inventory base: `415f3dd`
- Stage 8 server facts base: `f2b1d13`
- Stage 8 preflight base: `53066d6`

Основные файлы:

- `docs/production-fact-collection-result.md`
- `scripts/check_production_fact_collection_result.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_fact_collection_result.py
- python .\scripts\check_production_server_preflight_execution.py
- python .\scripts\check_production_server_facts.py
- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.5 - production server facts collection execution / sanitized facts update

---

## Checkpoint 8.5 - production server facts collection execution / sanitized facts update

Контур production server facts collection execution выполнен для Stage 8: проведён безопасный сбор не-секретных фактов с production-сервера и внесён sanitized snapshot в документацию.

Закрыто:

- 8.5.1 - local readiness before real server access
- 8.5.2 - safe production server preflight execution
- 8.5.3 - sanitized facts update
- 8.5.4 - README checkpoint для production server facts collection execution / sanitized facts update

Результат:

- SSH preflight выполнен для `root@89.127.203.70`;
- локальный файл `tmp/stage_8_5_2_server_preflight.txt` создан только временно и не коммитился;
- secret marker scan по preflight-файлу прошёл успешно;
- безопасные факты внесены в `docs/production-server-facts.md`;
- результат сбора фактов внесён в `docs/production-fact-collection-result.md`;
- подтверждено, что на сервере есть Docker Engine и Git;
- подтверждено, что Docker Compose plugin пока недоступен;
- подтверждено, что `/opt/obrportal`, `/opt/obrportal-backups`, production `.env`, Nginx/Caddy и backup root пока отсутствуют;
- зафиксирован существующий контейнер `amnezia-awg` и UDP-порт `34503`, которые нельзя случайно сломать при rollout.

Собранные безопасные факты:

- provider: `Fornex / inferred from hostname`; 
- server hostname: `306733.fornex.cloud`; 
- public IP: `89.127.203.70`; 
- OS: `Ubuntu 24.04.4 LTS`; 
- kernel: `Linux 6.8.0-110-generic`; 
- virtualization: `kvm / QEMU`; 
- SSH user: `root`; 
- RAM: `1.9Gi`; 
- root disk: `20G total, 23% used`; 
- swap: `0B`; 
- Docker: `29.1.3`; 
- Git: `2.43.0`; 
- reverse proxy: `missing`; 
- app directory: `/opt/obrportal missing`; 
- backup directory: `/opt/obrportal-backups missing`; 
- production `.env`: `missing`.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 inventory base: `415f3dd`
- Stage 8 server facts base: `f2b1d13`
- Stage 8 preflight base: `53066d6`

Основные файлы:

- `docs/production-server-facts.md`
- `docs/production-fact-collection-result.md`
- `docs/production-server-preflight-execution.md`
- `scripts/check_production_fact_collection_result.py`
- `scripts/check_production_server_preflight_execution.py`
- `scripts/check_production_server_facts.py`

Контрольные проверки:

- python .\scripts\check_production_fact_collection_result.py
- python .\scripts\check_production_server_preflight_execution.py
- python .\scripts\check_production_server_facts.py
- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.6 - production server remediation plan / prepare server for rollout

---

## Checkpoint 8.6 - production server remediation plan / prepare server for rollout

Контур production server remediation plan подготовлен для Stage 8: на основе sanitized server facts зафиксирован безопасный план подготовки production-сервера к реальной выкладке ObrPortal.

Закрыто:

- 8.6.1 - production server remediation plan document
- 8.6.2 - diagnostics для production server remediation plan
- 8.6.3 - README checkpoint для production server remediation plan / prepare server for rollout

Результат:

- добавлен `docs/production-server-remediation-plan.md`;
- добавлен `scripts/check_production_server_remediation_plan.py`;
- `.github/workflows/ci.yml` запускает `Run production server remediation plan guard`;
- `check_ci_local_gate.py` учитывает production server remediation plan guard;
- `check_release_readiness.py` учитывает production server remediation plan guard и support file;
- `check_frontend_smoke_coverage.py` учитывает новый guard script;
- `smoke_frontend_core.py` контролирует наличие production server remediation plan diagnostics и remediation-документа;
- remediation plan фиксирует текущие server blockers, порядок подготовки сервера, сохранение `amnezia-awg`, установку Docker Compose plugin, создание `/opt/obrportal`, создание `/opt/obrportal-backups`, выбор reverse proxy, подготовку production `.env`, clone repository и post-remediation verification.

Состояние сервера перед remediation:

- server: `306733.fornex.cloud`; 
- public IP: `89.127.203.70`; 
- OS: `Ubuntu 24.04.4 LTS`; 
- Docker Engine: `installed`, `29.1.3`; 
- Docker Compose plugin: `missing`; 
- Git: `installed`, `2.43.0`; 
- `/opt/obrportal`: `missing`; 
- `/opt/obrportal-backups`: `missing`; 
- production `.env`: `missing`; 
- reverse proxy: `missing`; 
- existing container: `amnezia-awg`; 
- existing UDP port: `34503/udp`; 
- HTTP/HTTPS public listeners: `not configured`.

Критичные правила remediation:

- не удалять и не ломать существующий контейнер `amnezia-awg`;
- не занимать и не менять UDP `34503` без отдельного решения;
- не печатать и не коммитить production `.env`; 
- перед rollout подготовить Docker Compose plugin;
- перед rollout создать application и backup directories;
- перед rollout выбрать и установить reverse proxy;
- после remediation повторно выполнить safe verification.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 remediation base: `861886c`

Основные файлы:

- `docs/production-server-remediation-plan.md`
- `scripts/check_production_server_remediation_plan.py`
- `.github/workflows/ci.yml`
- `scripts/check_ci_local_gate.py`
- `scripts/check_release_readiness.py`
- `scripts/check_frontend_smoke_coverage.py`
- `scripts/smoke_frontend_core.py`

Контрольные проверки:

- python .\scripts\check_production_server_remediation_plan.py
- python .\scripts\check_production_fact_collection_result.py
- python .\scripts\check_production_server_preflight_execution.py
- python .\scripts\check_production_server_facts.py
- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.7 - production server remediation execution / prepare server directories, Docker Compose and reverse proxy decision

---

## Checkpoint 8.7 - production server remediation execution

Контур production server remediation execution выполнен для Stage 8: на production-сервере безопасно установлен Docker Compose plugin, созданы application/backup directories, результат зафиксирован в sanitized-документации.

Закрыто:

- 8.7.1 - install Docker Compose plugin + create production directories
- 8.7.2 - sanitized remediation result update
- 8.7.3 - README checkpoint для production server remediation execution

Результат на сервере:

- Docker Compose plugin установлен;
- `docker compose version` возвращает `Docker Compose version 2.40.3+ds1-0ubuntu1~24.04.1`;
- `/opt/obrportal` создан;
- `/opt/obrportal-backups` создан;
- backup subdirectories созданы: `env`, `postgres`, `storage`, `proxy`, `deployment`;
- `/opt/obrportal-backups/env` ограничен через `chmod 700`;
- production `.env` по-прежнему отсутствует и его содержимое не печаталось;
- reverse proxy пока не установлен;
- существующий контейнер `amnezia-awg` сохранён и продолжает работать;
- UDP `34503` сохранён;
- secret marker scan по локальному remediation-логу прошёл успешно;
- временный локальный файл `tmp/stage_8_7_1_server_remediation.txt` не коммитился.

Документально зафиксировано:

- `docs/production-server-facts.md` содержит post-remediation safe facts;
- `docs/production-fact-collection-result.md` содержит remediation result snapshot;
- `docs/production-server-remediation-plan.md` содержит remediation execution result;
- remaining blockers: production `.env`, domain, reverse proxy, repository clone, deployment smoke checks.

Текущее состояние сервера после remediation:

- server: `306733.fornex.cloud`; 
- public IP: `89.127.203.70`; 
- OS: `Ubuntu 24.04.4 LTS`; 
- Docker Engine: `29.1.3`; 
- Docker Compose: `2.40.3+ds1-0ubuntu1~24.04.1`; 
- Git: `2.43.0`; 
- application directory: `/opt/obrportal exists`; 
- backup directory: `/opt/obrportal-backups exists`; 
- backup env directory: `/opt/obrportal-backups/env exists, chmod 700`; 
- production `.env`: `missing`; 
- reverse proxy: `not installed yet`; 
- existing container: `amnezia-awg running`; 
- existing UDP port: `34503/udp active`; 
- HTTP/HTTPS public listeners: `not configured`.

Критичные правила дальше:

- не удалять и не ломать `amnezia-awg`;
- не менять UDP `34503` без отдельного решения;
- не печатать и не коммитить production `.env`; 
- перед реальным rollout выбрать production domain;
- перед реальным rollout выбрать reverse proxy: Caddy или Nginx;
- repository clone и `.env` выполнять только после фиксации reverse proxy/domain decision.

Релизная база:

- `v0.1.0-stage6`
- `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 base: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 remediation execution base: `54e99ea`

Основные файлы:

- `docs/production-server-facts.md`
- `docs/production-fact-collection-result.md`
- `docs/production-server-remediation-plan.md`
- `scripts/check_production_server_remediation_plan.py`
- `scripts/check_production_fact_collection_result.py`
- `scripts/check_production_server_facts.py`

Контрольные проверки:

- python .\scripts\check_production_server_remediation_plan.py
- python .\scripts\check_production_fact_collection_result.py
- python .\scripts\check_production_server_preflight_execution.py
- python .\scripts\check_production_server_facts.py
- python .\scripts\check_production_rollout_inventory.py
- python .\scripts\check_production_deployment_runbook.py
- python .\scripts\check_production_backup_monitoring_checklist.py
- python .\scripts\check_production_reverse_proxy_checklist.py
- python .\scripts\check_production_server_checklist.py
- python .\scripts\check_production_environment_template.py
- python .\scripts\check_production_deployment_plan.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_text_encoding.py

Следующий функциональный блок:

- 8.8 - production domain and reverse proxy decision / HTTPS entrypoint planning
