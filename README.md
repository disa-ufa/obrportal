# ОбрПортал — стартовый каркас Stage 6

Стартовый monorepo для физической разработки единой образовательной платформы.

## Состав

- `backend` — FastAPI backend, health/readiness, auth/RBAC skeleton, SQLAlchemy, Alembic.
- `frontend` — React/Vite shell, подключен текущий UX/UI-макет Stage 5.
- `infra` — инфраструктурные настройки.
- `scripts` — smoke-check и сервисные команды.
- `docs` — ADR, архитектурные заметки, чек-листы.

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d --build
```

После запуска:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- MinIO console: http://localhost:9001

## Smoke-check

```bash
python scripts/smoke_check.py
```

## Что уже заложено

- единая структура monorepo;
- local окружение через Docker Compose;
- PostgreSQL, Redis, MinIO;
- FastAPI health/readiness;
- базовая модель ролей/RBAC;
- аудит как обязательный контур;
- frontend shell на основе макета Stage 5;
- `.env.example` без секретов.

## Следующий шаг разработки

1. Поднять проект локально.
2. Проверить `/health` и `/ready`.
3. Применить первую миграцию Alembic.
4. Добавить seed ролей и тестового администратора.
5. Реализовать `/auth/login`, `/auth/me`, `/admin/users`, `/admin/roles`.
