# ObrPortal - локальный запуск и demo-сценарий

Документ фиксирует воспроизводимый порядок локального развёртывания ObrPortal.

## 1. Обновление проекта

```powershell
Set-Location C:\root\obrportal
git switch develop
git fetch origin
git pull --ff-only origin develop
git switch main
git pull --ff-only origin main
git switch develop
git branch -vv
git log --oneline -3
git status
```

## 2. Локальный запуск

Базовый запуск:

```powershell
.\scripts\local_bootstrap.ps1
```

Полный demo-запуск с очисткой volumes и созданием demo-данных:

```powershell
.\scripts\local_bootstrap.ps1 -ResetVolumes -WithDemoLearning
```

Быстрый запуск без smoke-проверки:

```powershell
.\scripts\local_bootstrap.ps1 -ResetVolumes -SkipSmoke -WithDemoLearning
```

## 3. Что создаётся в demo-режиме

- администратор: admin@obrportal.local / Admin123Local2026!
- слушатель: learner@obrportal.local / Learner123Local2026!
- организация: GBOU RCDO
- программа: Demo Course
- группа: Demo Group / DEMO-GROUP
- demo-назначение
- demo-документ после завершения обучения

## 4. Проверки

```powershell
docker compose exec backend pytest app/tests -q
python .\scripts\smoke_auth_rbac.py
docker compose run --rm frontend npm run build
```

## 5. Адреса

- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Ready: http://localhost:8000/api/v1/ready

## 6. Важное для Docker Desktop на Windows

В local_bootstrap.ps1 принудительно задано:

```powershell
$env:COMPOSE_BAKE = "false"
```

Это нужно, чтобы избежать ошибки Docker Compose:

```text
failed to execute bake: read |0: file already closed
```

## 7. Публичная проверка документа

После публикации документа в админке можно открыть публичную проверку по номеру или коду проверки.

Пример маршрута:

```text
http://localhost:5173/verify-document?number=DOCV-...
```
