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
