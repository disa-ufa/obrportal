from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)

def require_not_contains_between(
    relative_path: str,
    start_marker: str,
    end_marker: str,
    fragments: list[str],
) -> None:
    text = read_text(relative_path)

    if start_marker not in text:
        raise SystemExit(f"Start marker not found in {relative_path}: {start_marker}")

    start = text.index(start_marker)
    end = text.index(end_marker, start) if end_marker in text[start:] else len(text)
    segment = text[start:end]

    forbidden = [fragment for fragment in fragments if fragment in segment]

    if forbidden:
        print(f"{relative_path} has forbidden fragments in {start_marker}:")
        for fragment in forbidden:
            print(f" - {fragment}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/pages/LessonStudioPage.jsx",
        [
            'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
            "getAdminCourseLessonDetail",
            "getAdminLessonBlocks",
            "updateAdminLessonBlock",
            'Добавить блок',
            'creatingTemplateKey={creatingTemplateKey}',
            'onCreateBlock={handleQuickCreateBlock}',
            'handleQuickCreateBlock',
            'buildStudioQuickBlockPayload',
            'getNextStudioBlockPosition',
            'STUDIO_QUICK_BLOCK_TEMPLATES',
            'createAdminLessonBlock',
            "export function LessonStudioPage({ lessonId })",
            'data-testid="lesson-studio-page"',
            'data-testid="lesson-studio-topbar"',
            'data-testid="lesson-studio-structure"',
            'data-testid="lesson-studio-canvas"',
            'data-testid="lesson-studio-visual-canvas"',
            'data-testid="lesson-studio-canvas-block"',
            'data-testid="lesson-studio-inspector-form"',
            "function LessonStudioTopbar",
            'className="sticky top-4 z-20 rounded-[2rem] bg-white/95 p-5 shadow-sm ring-1 ring-slate-200 backdrop-blur"',
            'const courseHref = courseId ? `/admin/courses#course-${courseId}` : "/admin/courses";',
            'К курсу',
            'data-testid="lesson-studio-quick-actions"',
            'data-testid="lesson-studio-title"',
            'data-testid="lesson-studio-back-to-courses"',
            "function LessonStudioStructurePanel",
            'Добавьте первый блок через левую панель или плюс на полотне.',
            'quickAddDisabled={blocksLoading || Boolean(creatingTemplateKey)}',
            'quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}',
            'data-testid="lesson-studio-sidebar-quick-add-button"',
            'data-testid="lesson-studio-sidebar-quick-add"',
            'function LessonStudioSidebarQuickAdd(',
            'className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"',
            'target.scrollIntoView({ behavior: "smooth", block: "center" });',
            'document.getElementById(`studio-block-${blockId}`)',
            'const handleSelectBlock = useCallback((blockId) => {',
            'data-testid="lesson-studio-structure-block-issues"',
            'data-testid="lesson-studio-structure-block"',
            'data-testid="lesson-studio-structure-stats"',
            'const problemBlocks = blocks.filter((block) => getBlockValidationIssues(block).length > 0);',
            "function LessonStudioCanvas",
            'Перейти к блоку',
            'Требует доработки',
            'Готов к публикации',
            'Готовность урока',
            'requiredProblemBlocks',
            'blockingIssues',
            'report={lessonReadiness}',
            '<LessonStudioReadinessChecklist',
            'getLessonReadinessReport(lesson, blocks)',
            'const lessonReadiness = useMemo(',
            'data-testid="lesson-studio-readiness-ready"',
            'data-testid="lesson-studio-readiness-problem-jump"',
            'data-testid="lesson-studio-readiness-problem"',
            'data-testid="lesson-studio-readiness-problems"',
            'data-testid="lesson-studio-readiness-item"',
            'data-testid="lesson-studio-readiness-items"',
            'data-testid="lesson-studio-readiness-status"',
            'data-testid="lesson-studio-readiness-checklist"',
            'function LessonStudioReadinessChecklist(',
            'function getLessonReadinessReport(',
            'Вид для обучающегося',
            'В предпросмотре нет активных блоков.',
            'blocks={studioStructureBlocks}',
            'const studioStructureBlocks = viewMode === "preview" ? visiblePreviewBlocks : blocks;',
            '<LessonStudioPreviewPanel lesson={lesson} blocks={blocks} />',
            'viewMode === "preview" ? (',
            '!previewMode && issues.length',
            'previewMode={previewMode}',
            'Административные действия скрыты',
            'data-testid="lesson-studio-preview-banner"',
            'blocks.filter((block) => block.is_active !== false)',
            'const visibleBlocks = previewMode',
            'const previewMode = mode === "preview";',
            'mode = "editor"',
            'function LessonStudioCanvas({',
            'data-testid="lesson-studio-preview-issues"',
            'data-testid="lesson-studio-preview-ready"',
            'data-testid="lesson-studio-preview-summary"',
            'data-testid="lesson-studio-preview-panel"',
            'function LessonStudioPreviewPanel',
            'data-testid="lesson-studio-preview-mode-button"',
            'data-testid="lesson-studio-editor-mode-button"',
            'data-testid="lesson-studio-mode-switcher"',
            'onModeChange={setViewMode}',
            'mode={viewMode}',
            'const [viewMode, setViewMode] = useState("editor");',
            "function LessonCanvasBlock",
            'Удалить',
            'Дублировать',
            'Не удалось удалить блок',
            'Не удалось дублировать блок',
            'data-testid="lesson-studio-delete-button"',
            'data-testid="lesson-studio-duplicate-button"',
            'deletingBlockId={deletingBlockId}',
            'duplicatingBlockId={duplicatingBlockId}',
            'onDeleteBlock={handleDeleteBlock}',
            'onDuplicateBlock={handleDuplicateBlock}',
            'handleDeleteBlock',
            'handleDuplicateBlock',
            'buildDuplicateStudioBlockPayload',
            'deleteAdminLessonBlock',
            'Не удалось изменить порядок блоков',
            'canMoveDown={index < visibleBlocks.length - 1}',
            'canMoveUp={index > 0}',
            'data-testid="lesson-studio-move-down-button"',
            'data-testid="lesson-studio-move-up-button"',
            'data-testid="lesson-studio-block-order-controls"',
            'movingBlockId={blockActionId}',
            'onMoveBlock={handleMoveBlock}',
            'handleMoveBlock',
            'reorderAdminLessonBlocks',
            'data-testid="lesson-studio-text-preview"',
            'data-testid="lesson-studio-callout-preview"',
            'data-testid="lesson-studio-assignment-preview"',
            'data-testid="lesson-studio-quiz-preview"',
            'data-testid="lesson-studio-link-preview"',
            'data-testid="lesson-studio-video-preview"',
            'data-testid="lesson-studio-canvas-type-preview"',
            'function LessonCanvasTypePreview',
            'getBlockPreviewMeta',
            "function LessonStudioInspector",
            'stage83_3_4_3_clear_missing_selected_block',
            'xl:grid-cols-[280px_minmax(0,1fr)]',
            'savingBlockId={blockActionId}',
            'variant="inline"',
            'data-testid="lesson-studio-inline-inspector-close"',
            'lesson-studio-inline-inspector',
            'const blockReady = Boolean(selectedBlock && blockIssues.length === 0);',
            'const draftBlock = selectedBlock && draftPayload ? { ...selectedBlock, ...draftPayload } : null;',
            'const draftPayload = selectedBlock ? buildInspectorBlockPayload(selectedBlock, form) : null;',
            'Перед сохранением проверьте поля:',
            'Служебная информация',
            'Публикация',
            'Контент',
            'Нужно заполнить',
            'Блок готов',
            'data-testid="lesson-studio-inspector-service-info"',
            'data-testid="lesson-studio-inspector-save-bar"',
            'data-testid="lesson-studio-inspector-issues"',
            'data-testid="lesson-studio-inspector-section-publication"',
            'data-testid="lesson-studio-inspector-section-content"',
            'data-testid="lesson-studio-inspector-section-main"',
            'data-testid="lesson-studio-inspector-issue-chip"',
            'data-testid="lesson-studio-inspector-readiness"',
            "buildInspectorBlockForm",
            "buildInspectorBlockPayload",
            'Текст примечания',
            'Описание задания',
            'Вопрос',
            'Ссылка на материал',
            'Ссылка на видео',
            'contentFieldMeta.help',
            'contentFieldMeta.placeholder',
            'contentFieldMeta.inputType',
            'contentFieldMeta.label',
            'data-testid="lesson-studio-inspector-content-field"',
            'getInspectorContentFieldMeta',
            "loadLesson",
            "loadBlocks",
            "reloadStudio",
            "selectedBlockId",
            "handleEditorBlocksChanged",
            "handleInspectorSaveBlock",
            "onRefreshBlocks={loadBlocks}",
            "onSaveBlock={handleInspectorSaveBlock}",
            
        ],
    )

    require_contains(
        "frontend/src/routes/AdminPageRenderer.jsx",
        [
            'const LessonStudioPage = lazyNamed(() => import("../pages/LessonStudioPage"), "LessonStudioPage");',
            "getAdminLessonStudioRouteParams",
            "lessonStudioRouteParams",
            "<LessonStudioPage lessonId={lessonStudioRouteParams.lessonId} />",
        ],
    )

    require_contains(
        "frontend/src/utils/adminRoutes.js",
        [
            "getAdminLessonStudioRouteParams",
            "/admin/lessons/",
            "/studio",
        ],
    )

    require_not_contains_between(
        "frontend/src/pages/LessonStudioPage.jsx",
        "function LessonStudioStructurePanel(",
        "\n\nfunction LessonCanvasBlock",
        ["visibleBlocks"],
    )

    require_not_contains_between(
        "frontend/src/pages/LessonStudioPage.jsx",
        "function LessonStudioCanvas(",
        "function getInspectorContentText(",
        ["<LessonStudioQuickAddPanel"],
    )

    # stage83_3_3_no_visual_canvas_intro_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    canvas_start = lesson_studio_source.index("function LessonStudioCanvas(")
    canvas_end = lesson_studio_source.index("function getInspectorContentText(", canvas_start)
    canvas_source = lesson_studio_source[canvas_start:canvas_end]
    forbidden_canvas_intro = [
        "Визуальное полотно урока",
        "Блоки отображаются как учебный материал",
    ]
    present_canvas_intro = [
        fragment for fragment in forbidden_canvas_intro if fragment in canvas_source
    ]
    if present_canvas_intro:
        print("LessonStudioCanvas still contains removed intro fragments:")
        for fragment in present_canvas_intro:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_4_no_persistent_editor_inspector_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    main_start = lesson_studio_source.index("<LessonStudioStructurePanel")
    main_end = lesson_studio_source.index("</main>", main_start)
    main_source = lesson_studio_source[main_start:main_end]
    forbidden_persistent_inspector = [
        "selectedBlock={selectedBlock}",
    ]
    present_persistent_inspector = [
        fragment for fragment in forbidden_persistent_inspector if fragment in main_source
    ]
    if present_persistent_inspector:
        print("Lesson Studio main layout still contains persistent editor inspector:")
        for fragment in present_persistent_inspector:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_4_2_close_inline_editor_after_save_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    required_close_after_save_fragments = [
        "onSaveBlock={async (...args) => {",
        "await onSaveBlock(...args);",
        'onSelect("");',
        'variant="inline"',
    ]
    missing_close_after_save_fragments = [
        fragment
        for fragment in required_close_after_save_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_close_after_save_fragments:
        print("Lesson Studio inline editor close-after-save fragments are missing:")
        for fragment in missing_close_after_save_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_4_3_explicit_editing_block_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    explicit_editing_fragments = [
        'const [editingBlockId, setEditingBlockId] = useState("");',
        "editingBlockId={editingBlockId}",
        "editing={editingBlockId === block.id}",
        "!previewMode && selected && editing ? (",
        'setEditingBlockId(blockId || "");',
    ]
    missing_explicit_editing_fragments = [
        fragment for fragment in explicit_editing_fragments if fragment not in lesson_studio_source
    ]
    if missing_explicit_editing_fragments:
        print("Lesson Studio explicit edit mode fragments are missing:")
        for fragment in missing_explicit_editing_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    if "!previewMode && selected ? (" in lesson_studio_source:
        print("Lesson Studio still opens inline editor from selected state only")
        raise SystemExit(1)

    # stage83_3_4_4_v3_robust_saved_block_focus_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    robust_saved_focus_fragments = [
        "data-lesson-studio-block-id={block.id}",
        "tabIndex={-1}",
        'scrollMarginTop: "9rem"',
        'overflowAnchor: "none"',
        "const savedBlockId = block.id;",
        "const savedBlockSelector =",
        "const scrollToSavedBlock = (behavior = \"auto\") => {",
        'block: "start"',
        'inline: "nearest"',
        'window.setTimeout(() => scrollToSavedBlock("auto"), 80);',
        'window.setTimeout(() => scrollToSavedBlock("smooth"), 220);',
        'window.setTimeout(() => scrollToSavedBlock("smooth"), 420);',
    ]
    missing_robust_saved_focus_fragments = [
        fragment for fragment in robust_saved_focus_fragments if fragment not in lesson_studio_source
    ]
    if missing_robust_saved_focus_fragments:
        print("Lesson Studio robust saved-block focus fragments are missing:")
        for fragment in missing_robust_saved_focus_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_4_remove_reserve_editor_label_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    if "Резервный редактор" in lesson_studio_source:
        print("Lesson Studio still contains redundant reserve editor label")
        raise SystemExit(1)

    # stage83_3_5_remove_technical_editor_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    forbidden_technical_editor_fragments = [
        "LessonBlocksEditor",
        "lesson-studio-technical-editor",
        "lesson-studio-advanced-technical-summary",
        "lesson-studio-advanced-technical-body",
        "Расширенные технические настройки",
    ]
    present_technical_editor_fragments = [
        fragment for fragment in forbidden_technical_editor_fragments
        if fragment in lesson_studio_source
    ]
    if present_technical_editor_fragments:
        print("Lesson Studio still contains removed technical editor fragments:")
        for fragment in present_technical_editor_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_1_compact_lesson_card_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    compact_lesson_card_fragments = [
        'data-testid="lesson-studio-card-actions"',
        'data-testid="lesson-studio-block-readiness-chip"',
        'data-testid="lesson-studio-block-issues"',
        "const blockReady = issues.length === 0;",
        "Готов",
    ]
    missing_compact_lesson_card_fragments = [
        fragment for fragment in compact_lesson_card_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_compact_lesson_card_fragments:
        print("Lesson Studio compact block card fragments are missing:")
        for fragment in missing_compact_lesson_card_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    noisy_lesson_card_fragments = [
        'const typeTone = getLessonBlockTone(block.block_type);',
        '{block.is_required ? "Обязательный" : "Дополнительный"}',
        '{block.is_active === false ? "Скрыт" : "Активен"}',
        'Нужно заполнить: {issues.join(", ")}.',
    ]
    present_noisy_lesson_card_fragments = [
        fragment for fragment in noisy_lesson_card_fragments
        if fragment in lesson_studio_source
    ]
    if present_noisy_lesson_card_fragments:
        print("Lesson Studio still contains noisy block card fragments:")
        for fragment in present_noisy_lesson_card_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_2_block_actions_menu_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    block_actions_menu_fragments = [
        'data-testid="lesson-studio-card-actions-menu"',
        'data-testid="lesson-studio-card-actions-trigger"',
        'aria-label="Действия с блоком"',
        "Переместить выше",
        "Переместить ниже",
        "⋯",
    ]
    missing_block_actions_menu_fragments = [
        fragment for fragment in block_actions_menu_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_block_actions_menu_fragments:
        print("Lesson Studio block actions menu fragments are missing:")
        for fragment in missing_block_actions_menu_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_2_close_actions_menu_outside_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    close_actions_menu_fragments = [
        "const actionsMenuRef = useRef(null);",
        "const [actionsMenuOpen, setActionsMenuOpen] = useState(false);",
        'document.addEventListener("pointerdown", handleOutsidePointerDown);',
        'document.addEventListener("keydown", handleEscapeKey);',
        "setActionsMenuOpen(false);",
        "ref={actionsMenuRef}",
        "open={actionsMenuOpen}",
        "onToggle={(event) => setActionsMenuOpen(event.currentTarget.open)}",
    ]
    missing_close_actions_menu_fragments = [
        fragment for fragment in close_actions_menu_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_close_actions_menu_fragments:
        print("Lesson Studio close-actions-menu fragments are missing:")
        for fragment in missing_close_actions_menu_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_3_compact_inline_form_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    compact_inline_form_fragments = [
        "Правка блока",
        'data-testid="lesson-studio-inline-inspector-cancel"',
        "getBlockDisplayTitle(selectedBlock)",
        'className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-[1.25rem] bg-white/95 p-2 shadow-sm ring-1 ring-slate-200 backdrop-blur"',
    ]
    missing_compact_inline_form_fragments = [
        fragment for fragment in compact_inline_form_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_compact_inline_form_fragments:
        print("Lesson Studio compact inline form fragments are missing:")
        for fragment in missing_compact_inline_form_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    noisy_inline_form_fragments = [
        '{inlineMode ? "Редактирование" : "Инспектор"}',
        '{selectedBlock ? "Редактирование блока" : "Настройки урока"}',
    ]
    present_noisy_inline_form_fragments = [
        fragment for fragment in noisy_inline_form_fragments
        if fragment in lesson_studio_source
    ]
    if present_noisy_inline_form_fragments:
        print("Lesson Studio still contains noisy inline form fragments:")
        for fragment in present_noisy_inline_form_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_4_compact_left_panel_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    compact_left_panel_fragments = [
        "Структура урока",
        'data-testid="lesson-studio-sidebar-quick-add-trigger"',
        'data-testid="lesson-studio-sidebar-quick-add-menu"',
        'data-testid="lesson-studio-structure-block-status"',
        "Проблем:",
        "Скрыто:",
        "правится",
        "line-clamp-2",
    ]
    missing_compact_left_panel_fragments = [
        fragment for fragment in compact_left_panel_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_compact_left_panel_fragments:
        print("Lesson Studio compact left panel fragments are missing:")
        for fragment in missing_compact_left_panel_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    noisy_left_panel_fragments = [
        "Незаполненных",
    ]
    present_noisy_left_panel_fragments = [
        fragment for fragment in noisy_left_panel_fragments
        if fragment in lesson_studio_source
    ]
    if present_noisy_left_panel_fragments:
        print("Lesson Studio still contains noisy left panel fragments:")
        for fragment in present_noisy_left_panel_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_5_canvas_polish_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    canvas_polish_fragments = [
        '"ring-blue-300 bg-blue-50/20"',
        'className={`mt-3 rounded-[1.25rem] p-3 text-sm leading-6 ring-1 ${meta.surfaceClass}`}',
        'className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xs font-black shadow-sm ring-1 ring-black/5"',
        '<section data-testid="lesson-studio-visual-canvas" className="space-y-2.5">',
    ]
    missing_canvas_polish_fragments = [
        fragment for fragment in canvas_polish_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_canvas_polish_fragments:
        print("Lesson Studio canvas polish fragments are missing:")
        for fragment in missing_canvas_polish_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    noisy_canvas_fragments = [
        'className={`rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 transition ${',
        'className={`mt-4 rounded-2xl p-4 text-sm leading-6 ring-1 ${meta.surfaceClass}`}',
        '<section data-testid="lesson-studio-visual-canvas" className="space-y-3">',
    ]
    present_noisy_canvas_fragments = [
        fragment for fragment in noisy_canvas_fragments
        if fragment in lesson_studio_source
    ]
    if present_noisy_canvas_fragments:
        print("Lesson Studio still contains noisy canvas fragments:")
        for fragment in present_noisy_canvas_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_6_insert_blocks_between_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    insert_blocks_between_fragments = [
        "function LessonCanvasInsertBlockControl(",
        'data-testid="lesson-studio-canvas-insert-control"',
        'data-testid="lesson-studio-canvas-insert-trigger"',
        'data-testid="lesson-studio-canvas-insert-options"',
        "getCanvasInsertTemplateKey(insertIndex, template.key)",
        "onCreateBlock(template, insertIndex)",
        "const insertDisabled =",
        "quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}",
        "setEditingBlockId(createdBlock.id);",
        "await reorderAdminLessonBlocks(lessonId, payload);",
        "Добавьте первый блок через левую панель или плюс на полотне.",
    ]
    missing_insert_blocks_between_fragments = [
        fragment for fragment in insert_blocks_between_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_insert_blocks_between_fragments:
        print("Lesson Studio insert-between-blocks fragments are missing:")
        for fragment in missing_insert_blocks_between_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_7_final_lesson_studio_cleanup_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    final_lesson_studio_required_fragments = [
        "lesson-studio-inline-inspector",
        "function getInspectorContentText(",
        "function LessonCanvasInsertBlockControl(",
        'data-testid="lesson-studio-canvas-insert-trigger"',
        'data-testid="lesson-studio-sidebar-quick-add-trigger"',
    ]
    missing_final_lesson_studio_required_fragments = [
        fragment for fragment in final_lesson_studio_required_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_final_lesson_studio_required_fragments:
        print("Lesson Studio final required fragments are missing:")
        for fragment in missing_final_lesson_studio_required_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    final_lesson_studio_removed_fragments = [
        "function LessonStudioQuickAddPanel(",
        "function getLessonBlockTone(",
        "LessonBlocksEditor",
        "Расширенные технические настройки",
    ]
    present_final_lesson_studio_removed_fragments = [
        fragment for fragment in final_lesson_studio_removed_fragments
        if fragment in lesson_studio_source
    ]
    if present_final_lesson_studio_removed_fragments:
        print("Lesson Studio still contains removed/obsolete fragments:")
        for fragment in present_final_lesson_studio_removed_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_8_simplified_topbar_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    simplified_topbar_required_fragments = [
        'data-testid="lesson-studio-mode-switcher"',
        'data-testid="lesson-studio-editor-mode-button"',
        'data-testid="lesson-studio-preview-mode-button"',
        'data-testid="lesson-studio-back-to-courses"',
        'data-testid="lesson-studio-course-link"',
        "К курсу",
    ]
    missing_simplified_topbar_required_fragments = [
        fragment for fragment in simplified_topbar_required_fragments
        if fragment not in lesson_studio_source
    ]
    if missing_simplified_topbar_required_fragments:
        print("Lesson Studio simplified topbar required fragments are missing:")
        for fragment in missing_simplified_topbar_required_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    simplified_topbar_removed_fragments = [
        'data-testid="lesson-studio-reload-button"',
        'data-testid="lesson-studio-status-badges"',
        ">Обновить<",
        "statusLabel",
    ]
    present_simplified_topbar_removed_fragments = [
        fragment for fragment in simplified_topbar_removed_fragments
        if fragment in lesson_studio_source
    ]
    if present_simplified_topbar_removed_fragments:
        print("Lesson Studio simplified topbar still contains removed fragments:")
        for fragment in present_simplified_topbar_removed_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_9_compact_canvas_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    lesson_canvas_block_source = lesson_studio_source.split("function LessonCanvasBlock(", 1)[1].split("function LessonStudioSidebarQuickAdd(", 1)[0]

    compact_canvas_required_fragments = [
        'data-compact={compact ? "true" : "false"}',
        'const compact = !previewMode && !selected;',
        'data-testid="lesson-studio-block-compact-summary"',
        "whitespace-pre-wrap break-words",
        'data-testid="lesson-studio-block-order-controls"',
        'data-testid="lesson-studio-card-actions-trigger"',
        'data-testid="lesson-studio-card-actions"',
        'compact\n              ? "mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2"',
        "!compact ? <LessonCanvasTypePreview",
    ]

    missing_compact_canvas_required_fragments = [
        fragment for fragment in compact_canvas_required_fragments
        if fragment not in lesson_canvas_block_source
    ]

    if missing_compact_canvas_required_fragments:
        print("Lesson Studio compact canvas required fragments are missing:")
        for fragment in missing_compact_canvas_required_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    compact_canvas_forbidden_fragments = [
        'data-testid="lesson-studio-block-compact-summary"\n          className={`mt-1.5 line-clamp-2',
        '{!compact ? (\n        <div\n          data-testid="lesson-studio-block-order-controls"',
    ]

    present_compact_canvas_forbidden_fragments = [
        fragment for fragment in compact_canvas_forbidden_fragments
        if fragment in lesson_canvas_block_source
    ]

    if present_compact_canvas_forbidden_fragments:
        print("Lesson Studio compact canvas still contains forbidden fragments:")
        for fragment in present_compact_canvas_forbidden_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_9_no_redundant_edit_button_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    lesson_canvas_block_source = lesson_studio_source.split("function LessonCanvasBlock(", 1)[1].split("function LessonStudioSidebarQuickAdd(", 1)[0]

    redundant_edit_button_fragments = [
        'data-testid="lesson-studio-edit-button"',
        "handleEditClick",
        ">Редактировать<",
    ]
    present_redundant_edit_button_fragments = [
        fragment for fragment in redundant_edit_button_fragments
        if fragment in lesson_canvas_block_source
    ]
    if present_redundant_edit_button_fragments:
        print("Lesson Studio canvas still contains redundant edit button fragments:")
        for fragment in present_redundant_edit_button_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_10_problem_first_workflow_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    problem_first_required_fragments = [
        "function LessonStudioReadinessChecklist({",
        "selectedBlockId,",
        "onFixFirstProblem,",
        "onFixNextProblem,",
        "const firstProblemBlock = report.problemBlocks[0]?.block || null;",
        'data-testid="lesson-studio-readiness-fix-first-problem"',
        "Исправить первую проблему",
        "handleFixFirstProblem",
        "setEditingBlockId(firstProblemBlock.id);",
        "showOnlyProblemBlocks",
        "setShowOnlyProblemBlocks",
        "const displayedBlocks = showOnlyProblems ? problemBlocks : blocks;",
        'data-testid="lesson-studio-structure-problem-filter"',
        'data-testid="lesson-studio-structure-problems-filter-button"',
        "displayedBlocks.map((block, index) => {",
    ]

    missing_problem_first_fragments = [
        fragment for fragment in problem_first_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_problem_first_fragments:
        print("Lesson Studio problem-first workflow fragments are missing:")
        for fragment in missing_problem_first_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_10_structure_editing_prop_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    structure_editing_required_fragments = [
        "function LessonStudioStructurePanel({",
        "editingBlockId,",
        "editingBlockId={editingBlockId}",
        "const editing = block.id === editingBlockId;",
    ]

    missing_structure_editing_fragments = [
        fragment for fragment in structure_editing_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_structure_editing_fragments:
        print("Lesson Studio structure editing prop fragments are missing:")
        for fragment in missing_structure_editing_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_11_next_problem_navigation_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    next_problem_required_fragments = [
        "onFixNextProblem",
        "selectedBlockId,",
        "currentProblemIndex",
        "nextProblemNumber",
        'data-testid="lesson-studio-readiness-fix-next-problem"',
        "Следующая проблема",
        "handleFixNextProblem",
        "const nextProblemIndex =",
        "setEditingBlockId(nextProblemBlock.id);",
        "selectedBlockId={selectedBlockId}",
        "onFixNextProblem={handleFixNextProblem}",
    ]

    missing_next_problem_fragments = [
        fragment for fragment in next_problem_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_next_problem_fragments:
        print("Lesson Studio next problem navigation fragments are missing:")
        for fragment in missing_next_problem_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_12_inline_save_feedback_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    inline_save_feedback_required_fragments = [
        "function getInspectorFormSnapshot(values)",
        "const savedFormSnapshot = useMemo(",
        "const currentFormSnapshot = useMemo(",
        "const hasUnsavedChanges = Boolean(selectedBlock && savedFormSnapshot !== currentFormSnapshot);",
        "const saveFeedback = saving",
        'data-testid="lesson-studio-inspector-save-status"',
        'aria-live="polite"',
        "Есть несохранённые изменения",
        "Сохранить изменения",
        "Ошибка сохранения",
        "Текущие поля совпадают с сохранённой версией блока.",
    ]

    missing_inline_save_feedback_fragments = [
        fragment for fragment in inline_save_feedback_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_inline_save_feedback_fragments:
        print("Lesson Studio inline save feedback fragments are missing:")
        for fragment in missing_inline_save_feedback_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_13_lesson_studio_jsx_cleanup_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    bad_jsx_cleanup_fragments = [
        "blocks={blocks}\n                mode={viewMode}",
        "blocksLoading={blocksLoading}\n              />",
        "const selectedBlock = useMemo(\n\n    () => blocks.find((block) => block.id === selectedBlockId) || null,",
    ]

    present_bad_jsx_cleanup_fragments = [
        fragment for fragment in bad_jsx_cleanup_fragments
        if fragment in lesson_studio_source
    ]

    if present_bad_jsx_cleanup_fragments:
        print("Lesson Studio JSX cleanup regressed:")
        for fragment in present_bad_jsx_cleanup_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_6_15_visual_block_numbering_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    obsolete_visual_numbering_fragments = [
        "#{item.block.position || item.index + 1} · {item.title}",
        "{block.position || index + 1}",
        "#{block.position || index + 1} · {getLessonBlockTypeLabel(block.block_type)}",
    ]

    present_obsolete_visual_numbering_fragments = [
        fragment for fragment in obsolete_visual_numbering_fragments
        if fragment in lesson_studio_source
    ]

    if present_obsolete_visual_numbering_fragments:
        print("Lesson Studio visual numbering still uses database position:")
        for fragment in present_obsolete_visual_numbering_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    expected_visual_numbering_fragments = [
        "#{item.index + 1} · {item.title}",
        "#{index + 1} · {getLessonBlockTypeLabel(block.block_type)}",
    ]

    missing_visual_numbering_fragments = [
        fragment for fragment in expected_visual_numbering_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_visual_numbering_fragments:
        print("Lesson Studio visual numbering fragments are missing:")
        for fragment in missing_visual_numbering_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_7_2_rich_text_editor_component_guard
    rich_text_editor_source = read_text("frontend/src/components/admin/lesson-studio/LessonRichTextEditor.jsx")
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    rich_text_editor_required_fragments = [
        "useEditor",
        "EditorContent",
        "BubbleMenu",
        "\"@tiptap/react/menus\"",
        "Placeholder",
        "CharacterCount",
        "Link.configure",
        "lesson-rich-text-toolbar",
        "lesson-rich-text-character-count",
        "lesson-rich-text-link-editor",
        "Совет: короткие абзацы",
        "H2 Заголовок",
        "Ctrl+B · Ctrl+I · Enter",
        "Редактор учебного текста",
        "applyEditorLink",
    ]

    missing_rich_text_editor_fragments = [
        fragment for fragment in rich_text_editor_required_fragments
        if fragment not in rich_text_editor_source
    ]

    forbidden_rich_text_editor_fragments = [
        "window.prompt",
    ]

    present_forbidden_rich_text_editor_fragments = [
        fragment for fragment in forbidden_rich_text_editor_fragments
        if fragment in rich_text_editor_source
    ]

    if present_forbidden_rich_text_editor_fragments:
        print("Lesson rich text editor contains forbidden UI patterns:")
        for fragment in present_forbidden_rich_text_editor_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    if missing_rich_text_editor_fragments:
        print("Lesson rich text editor component is incomplete:")
        for fragment in missing_rich_text_editor_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    lesson_studio_rich_text_required_fragments = [
        "import LessonRichTextEditor",
        "function isLessonRichTextBlock(block)",
        "contentJson.editor_json",
        "contentJson.editor_html",
        "const richTextEditorMode = isLessonRichTextBlock(selectedBlock);",
        "<LessonRichTextEditor",
    ]

    missing_lesson_studio_rich_text_fragments = [
        fragment for fragment in lesson_studio_rich_text_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_lesson_studio_rich_text_fragments:
        print("Lesson Studio rich text integration is incomplete:")
        for fragment in missing_lesson_studio_rich_text_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    print("Lesson Studio page smoke passed")


if __name__ == "__main__":
    main()
