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
            'document.getElementById(`studio-block-${blockId}`)',
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
            '',
            'previewMode={previewMode}',
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
            'data-testid="lesson-studio-video-preview"',
            'data-testid="lesson-studio-canvas-type-preview"',
            'function LessonCanvasTypePreview',
            'getBlockPreviewMeta',
            "function LessonStudioInspector",
            'stage83_3_4_3_clear_missing_selected_block',
            'savingBlockId={blockActionId}',
            'variant="inline"',
            'data-testid="lesson-studio-inline-inspector-close"',
            'lesson-studio-inline-inspector',
            'const blockReady = Boolean(selectedBlock && blockIssues.length === 0);',
            'const draftBlock = selectedBlock && draftPayload ? { ...selectedBlock, ...draftPayload } : null;',
            'const draftPayload = selectedBlock ? buildInspectorBlockPayload(selectedBlock, form) : null;',
            'Перед сохранением проверьте поля:',
            'Публикация',
            'Контент',
            'Нужно заполнить',
            'Блок готов',
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
        "<LessonStudioInspector",
        'data-testid="lesson-studio-inspector-form"',
        'data-testid="lesson-studio-inline-inspector-close"',
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
        'className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-xl bg-white/95 p-3 shadow-sm ring-1 ring-slate-200 backdrop-blur"',
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
        "Проблем",
        "Скрытых",
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
        '? "py-1 text-base leading-8 text-slate-800"',
        'className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xs font-black shadow-sm ring-1 ring-black/5"',
        'className={previewMode ? "space-y-0" : "space-y-2.5"}',
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

    lesson_studio_topbar_start = lesson_studio_source.find(
        "function LessonStudioTopbar("
    )

    if lesson_studio_topbar_start < 0:
        print("Lesson Studio topbar function is missing")
        raise SystemExit(1)

    lesson_studio_topbar_end = lesson_studio_source.find(
        "\nfunction ",
        lesson_studio_topbar_start + 1,
    )

    if lesson_studio_topbar_end < 0:
        print("Lesson Studio topbar boundary is missing")
        raise SystemExit(1)

    lesson_studio_topbar_source = lesson_studio_source[
        lesson_studio_topbar_start:lesson_studio_topbar_end
    ]
    simplified_topbar_required_fragments = [
        'data-testid="lesson-studio-preview-mode-button"',
        'data-testid="lesson-studio-back-to-courses"',
        'data-testid="lesson-studio-course-link"',
        "К курсу",
    ]
    missing_simplified_topbar_required_fragments = [
        fragment for fragment in simplified_topbar_required_fragments
        if fragment not in lesson_studio_topbar_source
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
        if fragment in lesson_studio_topbar_source
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
        "const inlineEditing = !previewMode && selected && editing;",
        "previewMode || inlineEditing",
        "absolute right-5 top-5 z-10 flex items-center justify-end",
        "{!compact && !inlineEditing ? (",
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
        'const effectiveFilter = showOnlyProblems ? "problems" : structureFilter;',
        "const displayedBlocks =",
        'effectiveFilter === "problems"',
        "? problemBlocks",
        ': effectiveFilter === "required"',
        "? requiredBlocks",
        ": blocks;",
        "const hiddenByProblemFilter = Math.max(blocks.length - displayedBlocks.length, 0);",
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
        "const effectiveSavedFormSnapshot = savedFormSnapshotOverride || savedFormSnapshot;",
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
        'const blockTypeLabel = isLessonImageBlock(block) ? "Изображение" : getLessonBlockTypeLabel(block.block_type);',
        "#{index + 1} · {blockTypeLabel}",
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
        "toggleHeading({ level: 2 })",
        '<Heading2 className="h-4 w-4" aria-hidden="true" />',
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

    # stage83_3_7_6_hide_text_preview_while_editing_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    hide_text_preview_required_fragments = [
        "const inlineRichTextEditing = !previewMode && selected && editing && isLessonRichTextBlock(block);",
        "{!compact && !inlineEditing ? (",
        "<LessonCanvasTypePreview block={block} preview={preview} learnerMode={previewMode} />",
    ]

    missing_hide_text_preview_fragments = [
        fragment for fragment in hide_text_preview_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_hide_text_preview_fragments:
        print("Lesson Studio text block preview/edit duplication guard failed:")
        for fragment in missing_hide_text_preview_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_7_7_text_block_settings_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    text_block_settings_required_fragments = [
        "const inlineRichTextMode = inlineMode && richTextEditorMode;",
        "data-testid=\"lesson-studio-text-block-settings\"",
        "Настройки блока",
        "Название, обязательность и видимость блока для обучающихся.",
        "Обязательный",
        "Показывать в уроке",
        "checked={form.is_required}",
        'handleFieldChange("is_required", event.target.checked)',
        "checked={form.is_active}",
        'handleFieldChange("is_active", event.target.checked)',
        "data-testid=\"lesson-studio-inspector-section-publication\"",
        "data-testid=\"lesson-studio-inspector-title-field\"",
        "{inlineRichTextMode ? (",
    ]

    missing_text_block_settings_fragments = [
        fragment for fragment in text_block_settings_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_text_block_settings_fragments:
        print("Lesson Studio text block settings layout guard failed:")
        for fragment in missing_text_block_settings_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_7_8_rich_text_dirty_state_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    rich_text_dirty_state_required_fragments = [
        "function stableStringifyLessonValue(value)",
        "function normalizeInspectorSnapshotEditorJson(values)",
        "editor_json: stableStringifyLessonValue(normalizeInspectorSnapshotEditorJson(values))",
        "const [savedFormSnapshotOverride, setSavedFormSnapshotOverride] = useState(\"\");",
        "const effectiveSavedFormSnapshot = savedFormSnapshotOverride || savedFormSnapshot;",
        "selectedBlock && effectiveSavedFormSnapshot !== currentFormSnapshot",
        "setSavedFormSnapshotOverride(getInspectorFormSnapshot(form));",
    ]

    missing_rich_text_dirty_state_fragments = [
        fragment for fragment in rich_text_dirty_state_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_rich_text_dirty_state_fragments:
        print("Lesson Studio rich text dirty-state guard failed:")
        for fragment in missing_rich_text_dirty_state_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    forbidden_rich_text_dirty_state_fragments = [
        "editor_html: `${values?.editor_html || \"\"}`.trim(),",
        "selectedBlock && savedFormSnapshot !== currentFormSnapshot",
    ]

    present_forbidden_rich_text_dirty_state_fragments = [
        fragment for fragment in forbidden_rich_text_dirty_state_fragments
        if fragment in lesson_studio_source
    ]

    if present_forbidden_rich_text_dirty_state_fragments:
        print("Lesson Studio rich text dirty-state has stale fragments:")
        for fragment in present_forbidden_rich_text_dirty_state_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_7_9_shared_safe_rich_text_preview_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    lesson_rich_text_view_source = read_text(
        "frontend/src/components/lesson/LessonRichTextView.jsx"
    )

    studio_shared_rich_text_required_fragments = [
        'import LessonRichTextView, {',
        "getSafeLessonRichTextHref,",
        '} from "../components/lesson/LessonRichTextView";',
        "getSafeLessonRichTextHref(sourceValue, buildApiUrl)",
        "getSafeLessonRichTextHref(originalUrl, buildApiUrl)",
        "getSafeLessonRichTextHref(getAudioBlockDownloadUrl(block), buildApiUrl)",
        "getSafeLessonRichTextHref(audioUrl, buildApiUrl)",
        "getSafeLessonRichTextHref(imageUrl, buildApiUrl)",
        "getSafeLessonRichTextHref(presentationViewerUrl, buildApiUrl)",
        "getSafeLessonRichTextHref(materialUrl, buildApiUrl)",
        "function LessonRichTextSafePreview({ block, preview, learnerMode = false })",
        "<LessonRichTextView",
        "documentValue={documentValue}",
        "fallbackText={fallbackText}",
        "learnerMode={learnerMode}",
        "apiUrlBuilder={buildApiUrl}",
        'const richTextPreview = type === "rich_text" || type === "text";',
        "<LessonRichTextSafePreview block={block} preview={previewValue} learnerMode={learnerMode} />",
        "{richTextPreview ? (",
    ]

    missing_studio_shared_rich_text_fragments = [
        fragment
        for fragment in studio_shared_rich_text_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_studio_shared_rich_text_fragments:
        print("Lesson Studio shared rich text integration is incomplete:")
        for fragment in missing_studio_shared_rich_text_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    shared_rich_text_required_fragments = [
        "export default function LessonRichTextView({",
        "function isLessonRichTextDocumentEmpty(documentValue)",
        "function getLessonRichTextPlainText(node)",
        "export function getSafeLessonRichTextHref(href, apiUrlBuilder)",
        "const LESSON_RICH_TEXT_ALLOWED_COLORS",
        "function getSafeLessonRichTextColor(value)",
        "function getLessonRichTextAlignClass(value)",
        "function renderLessonRichTextMarks(",
        "function renderLessonRichTextChildren(nodes, keyPrefix, apiUrlBuilder)",
        "function renderLessonRichTextNode(node, key, apiUrlBuilder)",
        'data-testid="lesson-rich-text-safe-preview"',
        'data-testid="lesson-rich-text-safe-link"',
        '["http:", "https:", "mailto:", "tel:"]',
        'value.startsWith("/api/")',
        'value.startsWith("/")',
        'value.startsWith("#")',
        '"bold"',
        '"italic"',
        '"code"',
        '"link"',
        '"textStyle"',
        '"paragraph"',
        '"heading"',
        '"bulletList"',
        '"orderedList"',
        '"listItem"',
        '"blockquote"',
        '"codeBlock"',
    ]

    missing_shared_rich_text_fragments = [
        fragment
        for fragment in shared_rich_text_required_fragments
        if fragment not in lesson_rich_text_view_source
    ]

    if missing_shared_rich_text_fragments:
        print("Shared LessonRichTextView contract is incomplete:")
        for fragment in missing_shared_rich_text_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    forbidden_local_renderer_fragments = [
        "function isLessonRichTextDocumentEmpty(",
        "function getLessonRichTextPlainText(",
        "function getSafeLessonRichTextHref(",
        "const LESSON_RICH_TEXT_ALLOWED_COLORS",
        "function getSafeLessonRichTextColor(",
        "function getLessonRichTextAlignClass(",
        "function renderLessonRichTextMarks(",
        "function renderLessonRichTextChildren(",
        "function renderLessonRichTextNode(",
    ]

    present_local_renderer_fragments = [
        fragment
        for fragment in forbidden_local_renderer_fragments
        if fragment in lesson_studio_source
    ]

    if present_local_renderer_fragments:
        print("Lesson Studio still contains duplicated rich text presentation logic:")
        for fragment in present_local_renderer_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    if (
        "dangerouslySetInnerHTML" in lesson_studio_source
        or "dangerouslySetInnerHTML" in lesson_rich_text_view_source
    ):
        print("Safe rich text rendering uses forbidden dangerouslySetInnerHTML")
        raise SystemExit(1)


    # stage83_3_7_10_single_lesson_preview_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    lesson_rich_text_view_source = read_text(
        "frontend/src/components/lesson/LessonRichTextView.jsx"
    )

    single_lesson_preview_required_fragments = [
        'data-testid={previewMode ? "lesson-studio-learner-document" : "lesson-studio-editor-block-list"}',
        'const richTextPreview = type === "rich_text" || type === "text";',
        "function LessonRichTextSafePreview({ block, preview, learnerMode = false })",
        "<LessonRichTextView",
        '? "mt-2"',
        '? "py-1 text-base leading-8 text-slate-800"',
        "<LessonRichTextSafePreview block={block} preview={previewValue} learnerMode={learnerMode} />",
        "<LessonCanvasTypePreview block={block} preview={preview} learnerMode={previewMode} />",
        "mx-auto w-full max-w-6xl space-y-5 rounded-[1.75rem] bg-white px-7 py-6 shadow-sm ring-1 ring-slate-100 sm:px-9 lg:px-12",
        "border-b border-slate-100 pb-5 last:border-b-0 last:pb-0",
    ]

    missing_single_lesson_preview_fragments = [
        fragment
        for fragment in single_lesson_preview_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_single_lesson_preview_fragments:
        print("Lesson Studio single lesson preview guard failed:")
        for fragment in missing_single_lesson_preview_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    shared_single_lesson_preview_required_fragments = [
        'data-testid="lesson-rich-text-safe-preview"',
        'learnerMode',
        '"space-y-4 break-words text-slate-800"',
        '"space-y-3 break-words"',
    ]

    missing_shared_single_lesson_preview_fragments = [
        fragment
        for fragment in shared_single_lesson_preview_required_fragments
        if fragment not in lesson_rich_text_view_source
    ]

    if missing_shared_single_lesson_preview_fragments:
        print("Shared LessonRichTextView learner-preview contract failed:")
        for fragment in missing_shared_single_lesson_preview_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    forbidden_single_lesson_preview_fragments = [

    ]

    present_forbidden_single_lesson_preview_fragments = [
        fragment
        for fragment in forbidden_single_lesson_preview_fragments
        if fragment in lesson_studio_source
    ]

    if present_forbidden_single_lesson_preview_fragments:
        print("Lesson Studio preview still has admin banner fragments:")
        for fragment in present_forbidden_single_lesson_preview_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)


    # stage83_3_7_11_clean_preview_layout_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    clean_preview_layout_required_fragments = ['viewMode !== "preview" ? (', '? "grid gap-5"', '"mx-auto w-full max-w-6xl space-y-5 rounded-[1.75rem] bg-white px-7 py-6 shadow-sm ring-1 ring-slate-100 sm:px-9 lg:px-12"', '"border-b border-slate-100 pb-5 last:border-b-0 last:pb-0"', 'data-testid={previewMode ? "lesson-studio-learner-document" : "lesson-studio-editor-block-list"}']

    missing_clean_preview_layout_fragments = [
        fragment for fragment in clean_preview_layout_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_clean_preview_layout_fragments:
        print("Lesson Studio clean preview layout guard failed:")
        for fragment in missing_clean_preview_layout_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    clean_preview_layout_forbidden_fragments = ['xl:grid-cols-[280px_minmax(0,1fr)_320px]', '<LessonStudioPreviewPanel lesson={lesson} blocks={blocks} />']

    present_clean_preview_layout_forbidden_fragments = [
        fragment for fragment in clean_preview_layout_forbidden_fragments
        if fragment in lesson_studio_source
    ]

    if present_clean_preview_layout_forbidden_fragments:
        print("Lesson Studio clean preview layout still has stale admin layout fragments:")
        for fragment in present_clean_preview_layout_forbidden_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    # stage83_3_7_12_wide_preview_canvas_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    wide_preview_canvas_required_fragments = [
        'data-testid={previewMode ? "lesson-studio-learner-document" : "lesson-studio-editor-block-list"}',
        'mx-auto w-full max-w-6xl space-y-5 rounded-[1.75rem] bg-white px-7 py-6 shadow-sm ring-1 ring-slate-100 sm:px-9 lg:px-12',
    ]

    missing_wide_preview_canvas_fragments = [
        fragment for fragment in wide_preview_canvas_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_wide_preview_canvas_fragments:
        print("Lesson Studio wide preview canvas guard failed:")
        for fragment in missing_wide_preview_canvas_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    if 'mx-auto max-w-3xl space-y-5 rounded-[1.75rem] bg-white px-7 py-6' in lesson_studio_source:
        print("Lesson Studio preview canvas is still too narrow")
        raise SystemExit(1)

    # stage83_3_7_13_learner_preview_polish_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")
    lesson_rich_text_view_source = read_text(
        "frontend/src/components/lesson/LessonRichTextView.jsx"
    )

    learner_preview_polish_required_fragments = [
        '? "py-1 text-base leading-8 text-slate-800"',
    ]

    missing_learner_preview_polish_fragments = [
        fragment
        for fragment in learner_preview_polish_required_fragments
        if fragment not in lesson_studio_source
    ]

    if missing_learner_preview_polish_fragments:
        print("Lesson Studio learner preview polish guard failed:")
        for fragment in missing_learner_preview_polish_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    shared_rich_text_polish_required_fragments = [
        '"space-y-4 break-words text-slate-800"',
        '"space-y-3 break-words"',
        'className={`text-base leading-8 text-slate-700 ${alignClass}`}',
        "ml-6 list-disc space-y-2 text-base leading-8 text-slate-700",
        "ml-6 list-decimal space-y-2 text-base leading-8 text-slate-700",
        "rounded-2xl border-l-4 border-blue-300 bg-blue-50 px-5 py-4 text-base italic leading-8 text-slate-700",
    ]

    missing_shared_rich_text_polish_fragments = [
        fragment
        for fragment in shared_rich_text_polish_required_fragments
        if fragment not in lesson_rich_text_view_source
    ]

    if missing_shared_rich_text_polish_fragments:
        print("Shared LessonRichTextView typography guard failed:")
        for fragment in missing_shared_rich_text_polish_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)


    # stage_quiz_q1b_shared_learner_preview_guard
    lesson_studio_source = read_text("frontend/src/pages/LessonStudioPage.jsx")

    quiz_shared_import = (
        'import LessonQuizQuestionView '
        'from "../components/lesson/LessonQuizQuestionView";'
    )

    quiz_shared_presentation_import = (
        'import { LessonQuizQuestionCard, LessonQuizShell } '
        'from "../components/lesson/LessonQuizQuestionView";'
    )

    if quiz_shared_import not in lesson_studio_source:
        print("Lesson Studio Quiz shared learner-preview import is missing")
        raise SystemExit(1)

    if quiz_shared_presentation_import not in lesson_studio_source:
        print("Lesson Studio Quiz shared presentation import is missing")
        raise SystemExit(1)

    quiz_preview_start = lesson_studio_source.index(
        "function LessonQuizCanvasPreview("
    )

    quiz_preview_end = lesson_studio_source.index(
        "\n\nfunction ",
        quiz_preview_start + 1,
    )

    quiz_preview_source = lesson_studio_source[
        quiz_preview_start:quiz_preview_end
    ]

    quiz_learner_branch_start = quiz_preview_source.index(
        "  if (learnerMode) {"
    )

    quiz_editor_return_anchor = (
        '  return (\n'
        '    <div\n'
        '      data-testid="lesson-studio-quiz-preview"'
    )

    if (
        quiz_preview_source.count(
            quiz_editor_return_anchor
        )
        != 1
    ):
        print("Lesson Studio Quiz editor return anchor count is not exactly one")
        raise SystemExit(1)

    quiz_editor_return_start = quiz_preview_source.index(
        quiz_editor_return_anchor,
        quiz_learner_branch_start,
    )

    quiz_learner_branch = quiz_preview_source[
        quiz_learner_branch_start:quiz_editor_return_start
    ]

    quiz_editor_preview = quiz_preview_source[
        quiz_editor_return_start:
    ]

    quiz_shared_required_fragments = [
        "if (learnerMode)",
        "<LessonQuizShell",
        'testId="lesson-studio-quiz-preview"',
        'presentationView="lesson-quiz-preview"',
        "title={quiz.title || previewValue",
        "description={quiz.description}",
        "required={block?.is_required}",
        "{questions.map((question, index) => {",
        "<LessonQuizQuestionCard",
        'testId="lesson-studio-quiz-question-preview"',
        "showPoints={quiz.ui?.show_question_points !== false}",
        "<LessonQuizQuestionView",
        "value={undefined}",
        "disabled",
        "onChange={() => undefined}",
    ]

    missing_quiz_shared_fragments = [
        fragment
        for fragment in quiz_shared_required_fragments
        if fragment not in quiz_learner_branch
    ]

    if missing_quiz_shared_fragments:
        print("Lesson Studio Quiz learner preview shared-view fragments are missing:")
        for fragment in missing_quiz_shared_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    quiz_learner_forbidden_fragments = [
        "getQuizQuestionPreviewText",
        "correct_value",
        "accepted_answers",
        "correct_number",
        "correct_answer",
        "getAccountCourseLessonQuizAttempts",
        "submitAccountCourseLessonQuizAttempt",
        'className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"',
        "bg-amber",
        "ring-amber",
        "questionCount",
        "totalPoints",
        "passScore",
        "attemptsLabel",
        "visibleQuestions",
        r"\u0415\u0449\u0451 \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432:",
    ]

    present_quiz_learner_forbidden_fragments = [
        fragment
        for fragment in quiz_learner_forbidden_fragments
        if fragment in quiz_learner_branch
    ]

    if present_quiz_learner_forbidden_fragments:
        print("Lesson Studio Quiz learner preview exposes forbidden author/learner behavior:")
        for fragment in present_quiz_learner_forbidden_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    if (
        quiz_editor_preview.count(
            "getQuizQuestionPreviewText(question)"
        )
        != 1
    ):
        print("Lesson Studio Quiz editor author preview helper was not preserved exactly once")
        raise SystemExit(1)

    lesson_quiz_question_view_source = read_text(
        "frontend/src/components/lesson/LessonQuizQuestionView.jsx"
    )

    quiz_shared_view_required_fragments = [
        "export default function LessonQuizQuestionView(",
        "export function LessonQuizQuestionCard(",
        "export function LessonQuizShell(",
        'className="rounded-3xl bg-blue-50/70 p-5 ring-1 ring-blue-100"',
        'className="text-xs font-black uppercase tracking-[0.14em] text-blue-700"',
        'className="mt-1 text-lg font-black text-slate-950"',
        'className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200"',
        'className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"',
        'className="flex flex-wrap items-start justify-between gap-3"',
        'className="text-xs font-black uppercase tracking-[0.12em] text-slate-400"',
        'className="mt-1 text-base font-black leading-6 text-slate-950"',
        'if (type === "single_choice")',
        'if (type === "multiple_choice")',
        'if (type === "true_false")',
        'if (type === "short_text")',
        'if (type === "number")',
        "stableShuffle(",
        "stableHash(",
    ]

    missing_quiz_shared_view_fragments = [
        fragment
        for fragment in quiz_shared_view_required_fragments
        if fragment not in lesson_quiz_question_view_source
    ]

    if missing_quiz_shared_view_fragments:
        print("Shared LessonQuizQuestionView contract is incomplete:")
        for fragment in missing_quiz_shared_view_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)

    quiz_shared_view_forbidden_fragments = [
        "useState(",
        "useEffect(",
        "useMemo(",
        "getAccountCourseLessonQuizAttempts",
        "submitAccountCourseLessonQuizAttempt",
        "correct_value",
        "accepted_answers",
        "correct_number",
        "answer_key",
        "result?.correct_answer",
    ]

    present_quiz_shared_view_forbidden_fragments = [
        fragment
        for fragment in quiz_shared_view_forbidden_fragments
        if fragment in lesson_quiz_question_view_source
    ]

    if present_quiz_shared_view_forbidden_fragments:
        print("Shared LessonQuizQuestionView contains forbidden behavior/security fragments:")
        for fragment in present_quiz_shared_view_forbidden_fragments:
            print(f" - {fragment}")
        raise SystemExit(1)


    # ASSIGNMENT A5 SHARED VIEW GUARD
    assignment_shared_import = (
        'import { LessonAssignmentView } '
        'from "../components/lesson/LessonAssignmentView";'
    )

    if assignment_shared_import not in lesson_studio_source:
        print("Lesson Studio Assignment shared view import is missing")
        raise SystemExit(1)

    assignment_preview_start = lesson_studio_source.find(
        "function LessonAssignmentCanvasPreview("
    )

    if assignment_preview_start < 0:
        print("Lesson Studio Assignment preview function is missing")
        raise SystemExit(1)

    assignment_preview_end = lesson_studio_source.find(
        "\n\nfunction ",
        assignment_preview_start + 1,
    )

    if assignment_preview_end < 0:
        print("Lesson Studio Assignment preview boundary is missing")
        raise SystemExit(1)

    assignment_preview_source = lesson_studio_source[
        assignment_preview_start:assignment_preview_end
    ]

    assignment_learner_start = assignment_preview_source.find(
        "  if (learnerMode) {"
    )

    if assignment_learner_start < 0:
        print("Lesson Studio Assignment learnerMode branch is missing")
        raise SystemExit(1)

    assignment_editor_start = assignment_preview_source.find(
        "\n  return (",
        assignment_learner_start + 1,
    )

    if assignment_editor_start < 0:
        print("Lesson Studio Assignment editor branch is missing")
        raise SystemExit(1)

    assignment_learner_source = assignment_preview_source[
        assignment_learner_start:assignment_editor_start
    ]

    assignment_editor_source = assignment_preview_source[
        assignment_editor_start:
    ]

    assignment_learner_required = [
        "<LessonAssignmentView",
        "block={block}",
        'statusLabel={"\\u041d\\u0435 \\u043d\\u0430\\u0447\\u0430\\u0442\\u043e"}',
        'statusTone="bg-slate-50 text-slate-700 ring-slate-200"',
        'testId="lesson-studio-assignment-preview"',
    ]

    assignment_learner_missing = [
        fragment
        for fragment in assignment_learner_required
        if fragment not in assignment_learner_source
    ]

    if assignment_learner_missing:
        print(
            "Lesson Studio Assignment learner shared-view "
            f"fragments are missing: {assignment_learner_missing}"
        )
        raise SystemExit(1)

    assignment_learner_forbidden = [
        "getAccountCourseLessonAssignmentSubmission",
        "submitAccountCourseLessonAssignmentAnswer",
        "completeAccountCourseLessonAssignment",
        "useState(",
        "useEffect(",
        "submission?.",
        "handleSubmitAnswer",
        "handleCompleteAssignment",
        "rounded-3xl bg-red-50/80",
        "detailItems.map",
        "expectedResult",
        "submissionFormat",
        "criteria",
        "estimatedMinutes",
    ]

    assignment_learner_bad = [
        fragment
        for fragment in assignment_learner_forbidden
        if fragment in assignment_learner_source
    ]

    if assignment_learner_bad:
        print(
            "Lesson Studio Assignment learner branch "
            f"contains forbidden fragments: {assignment_learner_bad}"
        )
        raise SystemExit(1)

    assignment_editor_required = [
        'data-testid="lesson-studio-assignment-preview"',
        'className="mt-3 rounded-2xl bg-white/90 p-4 ring-1 ring-black/5"',
        "onClick={(event) => event.stopPropagation()}",
        "{reviewModeLabel}",
        "detailItems.map",
    ]

    assignment_editor_missing = [
        fragment
        for fragment in assignment_editor_required
        if fragment not in assignment_editor_source
    ]

    if assignment_editor_missing:
        print(
            "Lesson Studio Assignment editor preview "
            f"fragments are missing: {assignment_editor_missing}"
        )
        raise SystemExit(1)

    assignment_shared_source = read_text(
        "frontend/src/components/lesson/LessonAssignmentView.jsx"
    )

    assignment_shared_required = [
        "export function LessonAssignmentView(",
        'className="rounded-2xl bg-red-50/70 p-5 ring-1 ring-red-200"',
        'data-testid="learner-assignment-material-link"',
        "content.description",
        "content.text",
        "content.body",
        "content.due",
        "content.deadline",
        "content.expected_result",
        "content.submission_format",
        "content.criteria",
        "content.estimated_minutes",
        "content.url",
        "content.file_url",
        "content.material_url",
    ]

    assignment_shared_missing = [
        fragment
        for fragment in assignment_shared_required
        if fragment not in assignment_shared_source
    ]

    if assignment_shared_missing:
        print(
            "Lesson Assignment shared view "
            f"fragments are missing: {assignment_shared_missing}"
        )
        raise SystemExit(1)

    assignment_shared_forbidden = [
        "getAccountCourseLessonAssignmentSubmission",
        "submitAccountCourseLessonAssignmentAnswer",
        "completeAccountCourseLessonAssignment",
        "useState(",
        "useEffect(",
        "useMemo(",
        "submission?.",
        "review_comment",
        "reviewed_at",
        "handleSubmitAnswer",
        "handleCompleteAssignment",
    ]

    assignment_shared_bad = [
        fragment
        for fragment in assignment_shared_forbidden
        if fragment in assignment_shared_source
    ]

    if assignment_shared_bad:
        print(
            "Lesson Assignment shared view "
            f"contains forbidden fragments: {assignment_shared_bad}"
        )
        raise SystemExit(1)

    print("Lesson Studio page smoke passed")


if __name__ == "__main__":
    main()
