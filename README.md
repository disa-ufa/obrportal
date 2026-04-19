# ObrPortal

ObrPortal — образовательный портал и back-office foundation для дальнейшей разработки LMS, личных кабинетов, административной панели, документов, ЭДО, ФРДО, финансового контура и интеграций.

Текущий этап: Stage 6 — DevOps-фундамент, auth/RBAC, admin API и frontend admin shell.

## Что уже реализовано

- Docker Compose local environment
- Backend на FastAPI
- Frontend на React + Vite + Tailwind
- PostgreSQL
- Redis
- MinIO / S3-compatible storage
- Alembic migrations
- Seed ролей и прав
- Seed demo users
- JWT auth
- RBAC permission checks
- Audit events для login_success / login_failed
- Read-only Admin API
- Frontend admin read-only panel
- Pytest backend coverage
- Smoke-test auth/RBAC/admin API
- Local secret scan
- GitHub Actions CI

## Стек

Backend:

- Python 3.12
- FastAPI
- SQLAlchemy async
- Alembic
- PostgreSQL
- Redis
- MinIO
- Pytest

Frontend:

- React
- Vite
- Tailwind CSS

Infra:

- Docker Compose
- GitHub Actions
- local secret scan

## Быстрый старт

Клонировать проект:

    git clone https://github.com/disa-ufa/obrportal.git
    cd obrportal

Создать .env:

    Copy-Item .env.example .env

Запустить проект:

    docker compose up -d --build

Проверить контейнеры:

    docker compose ps

## URL

Frontend:

    http://localhost:5173

Backend API:

    http://localhost:8000

Swagger:

    http://localhost:8000/docs

MinIO Console:

    http://localhost:9001

## Проверка backend

    curl http://localhost:8000/health
    curl http://localhost:8000/api/v1/ready

Ожидаемый результат:

    status = ok
    database = ok
    redis = ok
    storage = ok

## Миграции

Применить миграции:

    docker compose exec backend alembic upgrade head

Проверить текущую миграцию:

    docker compose exec backend alembic current

## Seed ролей и прав

    docker compose exec backend python -m app.db.seed

Создаются роли:

- admin
- learner_fl
- learner_org
- org_rep
- teacher
- methodist
- finance_operator
- edo_operator
- frdo_operator

## Demo users

Admin:

    email:    admin@obrportal.local
    password: Admin123Local2026!
    role:     admin

Создать admin:

    docker compose exec `
      -e SEED_ADMIN_EMAIL=admin@obrportal.local `
      -e SEED_ADMIN_PASSWORD='Admin123Local2026!' `
      backend python -m app.db.seed_admin

Learner:

    email:    learner@obrportal.local
    password: Learner123Local2026!
    role:     learner_fl

Создать learner:

    docker compose exec `
      -e SEED_DEMO_EMAIL=learner@obrportal.local `
      -e SEED_DEMO_PASSWORD='Learner123Local2026!' `
      -e SEED_DEMO_ROLE=learner_fl `
      backend python -m app.db.seed_demo_user

Demo-пароли используются только для local/dev окружения.

## Auth API

Login:

    POST /api/v1/auth/login

Body:

    {
      "email": "admin@obrportal.local",
      "password": "Admin123Local2026!"
    }

Current user:

    GET /api/v1/auth/me
    Authorization: Bearer <token>

## Admin API

Read-only endpoints:

    GET /api/v1/admin/rbac-check
    GET /api/v1/admin/users
    GET /api/v1/admin/roles
    GET /api/v1/admin/permissions
    GET /api/v1/admin/audit-events

Доступ защищён RBAC:

- admin проходит проверки
- learner_fl получает 403

## Frontend admin shell

Открыть:

    http://localhost:5173

На текущем этапе реализованы:

- вход администратора
- сохранение JWT
- запрос /auth/me
- отображение текущего пользователя
- RBAC-check
- read-only таблицы пользователей, ролей, прав и audit events

## Smoke-test

    python scripts/smoke_auth_rbac.py

Проверяет:

- health
- ready
- admin login
- /auth/me
- /admin/rbac-check
- /admin/users
- /admin/roles
- /admin/permissions
- /admin/audit-events
- 401 без токена
- 403 для learner

Ожидаемый результат:

    Smoke auth/RBAC/admin API passed

## Pytest

    docker compose exec backend pytest app/tests -q

Ожидаемый результат:

    7 passed

## Frontend build

    docker compose exec frontend npm run build

Ожидаемый результат:

    built

## Secret scan

    python scripts/secret_scan.py

Ожидаемый результат:

    Secret scan passed. No obvious secrets found.

## Полный локальный quality gate

Перед push выполнить:

    python .\scripts\secret_scan.py

    docker compose exec backend alembic upgrade head
    docker compose exec backend python -m app.db.seed

    docker compose exec `
      -e SEED_ADMIN_EMAIL=admin@obrportal.local `
      -e SEED_ADMIN_PASSWORD='Admin123Local2026!' `
      backend python -m app.db.seed_admin

    docker compose exec `
      -e SEED_DEMO_EMAIL=learner@obrportal.local `
      -e SEED_DEMO_PASSWORD='Learner123Local2026!' `
      -e SEED_DEMO_ROLE=learner_fl `
      backend python -m app.db.seed_demo_user

    docker compose exec backend pytest app/tests -q

    python .\scripts\smoke_auth_rbac.py

    docker compose exec frontend npm run build

    git status

## Git workflow

Используются ветки:

- main — стабильная ветка
- develop — рабочая ветка разработки

Процесс:

1. разработка идёт в develop
2. перед push выполняется локальный quality gate
3. изменения пушатся в develop
4. стабильное состояние fast-forward merge в main
5. GitHub Actions должен быть зелёным

## GitHub Actions

Workflow:

    .github/workflows/ci.yml

CI запускается на:

- push в main
- push в develop
- pull request в main/develop

CI выполняет:

1. secret scan
2. docker compose up -d --build
3. ожидание backend /health
4. alembic upgrade head
5. seed roles
6. seed admin
7. seed learner
8. backend pytest
9. smoke auth/RBAC/admin API
10. frontend build
11. docker compose down -v

## Безопасность

- .env не коммитится
- .env.example содержит только безопасные placeholders/local demo values
- local secret scan запускается в CI
- demo credentials предназначены только для local/dev
- production secrets должны храниться только в защищённом окружении

## Текущая контрольная точка

Stage 6 foundation готов:

- auth
- RBAC
- admin API
- frontend admin shell
- tests
- smoke
- CI
- secret scan

Следующий крупный блок разработки — расширение admin shell и переход к предметным модулям портала.