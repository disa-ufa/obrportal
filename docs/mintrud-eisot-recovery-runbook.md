# Управляемое восстановление Минтруда ЕИСОТ 1.0.9

## Причина и границы

Исторический `approved` без approval snapshot/fingerprint не даёт права на экспорт.
Проверка актуальности остаётся обязательной для JSON, одиночного XML и XML-пакета.
Повторное утверждение выполняет уполномоченный пользователь через существующий
`POST /api/v1/admin/mintrud/obligations/{id}/approve`, который заново проверяет
readiness, формирует snapshot, fingerprint, дату/исполнителя и audit event.

В production на момент read-only аудита 13.10.2026 каталог и привязки пусты, хотя
код содержит 28 канонических программ. Alembic создаёт структуру; наполнение
каталога выполняет отдельный seed/sync. Наличие актуальной миграции не доказывает
наполнение. Отсутствие запуска этого шага — возможное объяснение, а не доказанная
история deployment: полных журналов прежних операций нет.

Общий `app.db.seed` меняет также роли/права и для адресного восстановления
production не используется. Startup и readiness инфраструктуры не выполняют sync.
Новая команда не вызывает внешние HTTP API и не меняет обязательства, документы,
зачисления или привязки курса. Инициализации каталога нет в пользовательском UI.

## Архитектура

1. Завершение обучения вызывает `ensure_registry_obligations_for_completed_enrollment`.
   Правила `compliance_registry_rules` определяют Минтруд/ФРДО независимо.
2. Readiness использует профиль слушателя, данные завершения, контекст Минтруда,
   активные программы курса и реквизиты представляющей организации.
3. Mapping обновляется только через защищённый `catalog.write` административный API.
   Существующий путь блокирует утверждения Минтруда, заменяет связи и выполняет
   invalidation. Повторная одинаковая установка — no-op. ФРДО не инвалидируется.
4. Изменение профиля/контекста/документа использует действующую invalidation.
   Экспорт дополнительно пересчитывает fingerprint актуальных данных.
5. XML формируется из утверждённого снимка, проходит bundled XSD до записи в storage.
   Пакет хранит состав, снимки, SHA256 и историю. Повторное скачивание проверяет SHA256.
   Подготовка пакета оставляет обязательство `approved`, пакет — `exported`.
   Одиночный portal-artifact имеет существующий отдельный переход `exported`.
   `imported/submitted/accepted` требуют отдельных действий; внешней отправки нет.

Источник закреплённого каталога указан в `app/mintrud_learn_program_catalog.py`:
`https://edu.rosmintrud.ru/api/Reference/GetLearnProgram?IsActive=true`.
ID 1 / ИД34 означает «Оказание первой помощи пострадавшим». Канонический XSD
`educated_person_import_v1.0.9.xsd` имеет SHA256
`3016889f51b5c142b8fd5baa97b31a356b07032f0dc13f8ef687b851532948fc`.
Контрольная сумма исходных байтов совпала на LOCAL и production.
В ходе текущего аудита официальный HTTP endpoint через web-инструмент был недоступен;
он не заменён непроверенными источниками или сетевой загрузкой при выполнении CLI.

## Безопасный CLI

Из каталога `backend`:

```powershell
# DSN поступает из защищённой конфигурации оператора, не из Git или аргументов команды.
# MINTRUD_CATALOG_DATABASE_URL должен быть задан явно. DATABASE_URL/.env не подхватываются.
python -m app.mintrud_catalog_cli --expected-host postgres --expected-database obrportal
```

По умолчанию — PostgreSQL REPEATABLE READ / READ ONLY с rollback, без flush/commit.
Проверяются Alembic heads текущего checkout, ограничения уникальности/допустимых ID,
UUID, состав, версия и канонические коды. Чужая версия, неизвестный ID/код или
повреждённая схема завершаются отказом. Неактивную/переименованную программу можно
восстановить, если она ещё не привязана к курсам. Изменение используемых программ
отклоняется: оно требует отдельного плана invalidation.

Результат содержит `created`, `updated`, `unchanged`, `deactivated`, `committed` и
`plan_sha256`. SHA256 связывает адрес/порт/БД, ревизии, канонический набор, текущие
строки и связи. Отчёт не содержит DSN, паролей или данных слушателей.

После отдельного согласования точного dry-run:

```powershell
python -m app.mintrud_catalog_cli --expected-host postgres --expected-database obrportal --apply --confirm-plan-sha256 <SHA256_ИЗ_ПРОСМОТРЕННОГО_DRY_RUN>
```

Apply использует собственную транзакцию, немедленную блокировку таблиц каталога и
связей, повторную проверку плана и существующий `sync_mintrud_learn_program_catalog_v109`.
Изменение плана, занятые блокировки, ошибка flush или несоответствие числа изменений
прерывают транзакцию. Ограничение запроса 15 секунд, ожидание блокировки 2 секунды.

Для пустой БД: `created=28, updated=0, unchanged=0, deactivated=0`.
Повторно: `created=0, updated=0, unchanged=28, deactivated=0`.
Dry-run показывает предполагаемые числа, `committed=false`.
CLI не поддерживает SQLite и URL query-параметры. Перед использованием нестандартного
подключения/TLS оператор отдельно проверяет требуемый драйвер и конфигурацию.

## Последовательность согласований

1. Локальный commit, просмотр diff и результатов тестов. Затем отдельное разрешение
   на push feature-ветки и создание PR в `main`. Не включать Stage 17B.
2. Дождаться CI PR и проверить все обязательные checks; merge — только отдельное разрешение.
3. После merge получить фактический SHA `origin/main`. Обновить локальный `main`
   только fast-forward. Незавершённую ветку Stage 17B и её рабочий каталог сохранить.
4. Перед production повторить read-only preflight: revisions/image IDs/labels,
   Alembic, counts, `/health`, `/api/v1/ready`, HTTPS, диск, хранилище и Redis.
5. Отдельно согласовать backup, затем сборку/перенос и переключение backend/frontend.
6. Отдельно согласовать catalog apply по свежему SHA256 плана.
7. Отдельно согласовать изменение mapping с точным числом invalidation.
8. Уполномоченный администратор проверяет данные и самостоятельно утверждает запись.
9. После действительного утверждения отдельно разрешить адресное создание XML на production.
   Скачать и проверить XML; не фиксировать внешний импорт/отправку без реального события.

До этих разрешений состояние — `READY_FOR_PRODUCTION_APPROVAL`, а не `PRODUCTION_COMPLETE`.
Ближайший gate — GitHub push/PR; готовность к нему не означает разрешение на deployment.

## Git-команды после разрешений

В новом worktree (PowerShell):

```powershell
git status --short
git log -3 --oneline
git push -u origin feature/mintrud-eisot-catalog-production-recovery
gh pr create --repo disa-ufa/obrportal --base main --head feature/mintrud-eisot-catalog-production-recovery --title "Restore managed Mintrud catalog and approval-to-XML workflow" --body-file <ПРОСМОТРЕННЫЙ_ФАЙЛ_ОПИСАНИЯ>
gh pr checks <НОМЕР_PR> --repo disa-ufa/obrportal --watch
```

Merge не входит в эти команды. После его отдельного разрешения/выполнения:

```powershell
git fetch origin main
git rev-parse origin/main
# В отдельном чистом worktree main:
git merge --ff-only origin/main
git rev-parse HEAD
```

Никаких reset/clean/force-push. SHA образов определяется фактическим утверждённым
merge commit; подставлять SHA feature-ветки вместо него нельзя.

## Production preflight, backup и release artifacts

Read-only команды на VPS (Bash):

```bash
git -C /opt/obrportal rev-parse HEAD
docker ps --format '{{.Names}} {{.Image}} {{.Status}}'
docker inspect --format '{{.Image}}' obrportal-backend obrportal-frontend
docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' obrportal-backend:release-ca1de512-stage11l obrportal-frontend:release-469e9e2-csv
df -B1 /
curl --fail --silent http://127.0.0.1:8000/health
curl --fail --silent http://127.0.0.1:8000/api/v1/ready
curl --head --fail --silent https://portal.rcdo02.ru/
```

Не печатать полное `docker inspect`: Environment содержит секреты. На момент аудита
свободно около 1.25 GiB, БД около 16.1 MiB. Собирать release на изолированном локальном
checkout/CI из утверждённого SHA, с неизменяемым тегом и OCI revision label; проверить
image ID и SHA256 экспортированного архива до передачи. Не использовать `latest`.
Размер нового backend/frontend архива и временного распакованного слоя оценить до VPS.
Если места недостаточно — остановиться, не выполнять prune/удаление старых образов.

Backup после согласования: custom-format `pg_dump` текущей БД, проверка exit code,
ненулевого размера и SHA256. `pg_restore --list` обязателен, но не заменяет restore
drill в отдельной БД PostgreSQL 16. Скопировать backup за пределы VPS в защищённое
хранилище, сверить SHA256. Восстановление production не входит в release.
Команды должны использовать установленного пользователя/БД из защищённой конфигурации:

```bash
# Выполнять только после разрешения и установки проверенных BACKUP_FILE/DB_USER/DB_NAME.
umask 077
if ! docker exec obrportal-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"; then
  exit 1
fi
test -s "$BACKUP_FILE" || exit 1
sha256sum "$BACKUP_FILE"
if ! docker exec -i obrportal-postgres pg_restore --list < "$BACKUP_FILE" > "$BACKUP_FILE.list"; then
  exit 1
fi
test -s "$BACKUP_FILE.list" || exit 1
```

Backend/front-end deployment согласуются отдельно. Сохранить конфигурацию запуска,
сети, mounts, порты, environment в защищённом месте без вывода значений секретов.
Сначала проверить кандидат backend вне основного порта, затем переключить backend;
проверить health/ready. Затем переключить frontend и проверить login/реестры/download.
В этом изменении нет новых миграций: при ревизии `20261008_registry_batch_frdo`
upgrade не нужен. Если ревизия изменилась — остановиться и пересмотреть план.

Rollback кода: вернуть сохранённые текущие образы/конфигурацию:
backend `sha256:f7553ca2b0dc6eae85b101aded08d46f948ed90addf67a458be6e3672bbf1745`,
frontend `sha256:22ef2fdf4dfc3054f881a94216c702c755d439e994d534707ebec69fc04369ee`.
Старый backend rollback-контейнер сентября ссылается на отсутствующий образ и не
считается пригодным планом отката. PostgreSQL и volumes не останавливать/не удалять.
Возврат образа не отменяет catalog/mapping/invalidation/reapproval. Эти данные
откатываются только по отдельному проверенному решению; массовый SQL rollback запрещён.

## Mapping, reapproval и XML

Сначала GET `/api/v1/admin/mintrud/learn-programs`,
найти активную запись с ID 1, кодом ИД34 и версией 1.0.9. Использовать её UUID,
не подменять его числом 1. Проверить учебный план курса: в аудитируемом курсе 14 часов,
темы первой помощи, реанимации, кровотечений/травм, прочих состояний и проверка знаний.

В админке курса или через штатный API с авторизацией пользователя:

```http
PUT /api/v1/admin/courses/{course_id}/mintrud-programs
Content-Type: application/json

{"mintrud_learn_program_ids":["<UUID_ПРОГРАММЫ_ИД34>"]}
```

Перед PUT пересчитать обязательства этого курса. Аудит дал: Минтруд 1 `approved`
и 72 `pending_data`; ФРДО 73 `needs_approval`. Ожидаемая invalidation — ровно одно
утверждение Минтруда, но эти числа не являются разрешением и требуют свежей проверки.
После PUT сверить связи, audit, сохранённую историю и отсутствие изменений ФРДО,
документов, завершений. Повторный PUT с теми же UUID не должен инвалидировать снова.

В реестре выполнить проверку готовности; при любом issue остановиться и исправить
реальные исходные данные. Затем администратор нажимает «Утвердить» или
«Повторно утвердить». Никаких серверных скриптов, имитирующих администратора.
Проверить текущий fingerprint, snapshot, дату, исполнителя, audit и отсутствие invalidation.

После отдельного согласования выбрать только нужное обязательство и создать пакет.
Ожидаются HTTP 201, status `exported`, XML UTF-8/XSD 1.0.9, LearnProgramId=1,
правильное число RegistryRecord, совпадение SHA256 и повторное скачивание тех же байтов.
История обновляется даже при сбое браузерного скачивания — повторять скачивание
из истории, не создавать лишний пакет. Внешних отправок — 0.

## Stage 17B

Историческое восстановление трёх отсутствующих пар обязательств остаётся в отдельной
ветке `feature/registry-obligations-legacy-recovery`, без изменений этого worktree.
Ранее проверенные manifest-bound dry-run/apply, READ ONLY, точные UUID/даты/правила,
блокировки и атомарность не включены в каталог. Production dry-run дал 6 потенциальных
обязательств и 0 записей; apply не разрешён. Документы/PDF, `.local-backups/`, `docs.zip`
не затрагиваются. Для интеграции Stage 17B нужны отдельные review, commit и разрешение.
