# Stage 76 - Public organization documents section

stage76_status=implementation_ready  
stage76_release_manifest_required=yes  
stage76_guard_required=yes  
stage76_no_unverified_legal_document_numbers=yes

## Цель

Подготовить на публичной странице `/organization-info` полноценный блок
официальных документов организации без публикации неподтвержденных реквизитов.

## Что меняется

- На странице сведений об организации появляется отдельный раздел
  `Документы организации`.
- Раздел группирует документы по смысловым категориям:
  - учредительные документы;
  - лицензия и образовательная деятельность;
  - локальные нормативные акты;
  - отчеты и обязательная публичная информация.
- Для каждого блока показывается статус подготовки к публикации и список
  типов документов, которые будут размещаться после проверки.

## Что сознательно не публикуется

- номера лицензий;
- даты выдачи лицензий;
- ссылки на PDF-файлы без утвержденных документов;
- внешние URL, не прошедшие проверку;
- служебные или персональные данные.

## Проверки

- `python .\scripts\check_release_manifest.py`
- `python .\scripts\check_stage76_public_organization_documents.py`
- `python .\scripts\check_stage75_public_ui_cleanup.py`
- `python .\scripts\check_stage75_public_content_polish.py`
- `python .\scripts\check_source_bom.py`
- `python .\scripts\check_text_encoding.py`
- `python .\scripts\check_no_todo_markers.py`
- `python .\scripts\smoke_public_pages.py`
- `docker compose exec frontend npm run build`
- `git diff --check`

## Границы безопасности

Stage 76 является frontend-only изменением.

- Backend не меняется.
- База данных не меняется.
- Миграции не добавляются и не запускаются.
- Auth/RBAC не меняются.
- Production config не меняется.
- Непроверенные юридически значимые номера и ссылки не публикуются.
