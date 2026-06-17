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
            'import { useCallback, useEffect, useMemo, useState } from "react";',
            "getAdminCourseLessonDetail",
            "getAdminLessonBlocks",
            "updateAdminLessonBlock",
            'Добавить блок',
            'creatingTemplateKey={creatingTemplateKey}',
            'onCreateBlock={handleQuickCreateBlock}',
            'handleQuickCreateBlock',
            'data-testid="lesson-studio-quick-add-button"',
            'data-testid="lesson-studio-quick-add"',
            'function LessonStudioQuickAddPanel',
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
            'Основное наполнение урока теперь выполняется на визуальном полотне',
            'Используйте только для ручной диагностики и резервного редактирования',
            "function LessonStudioTopbar",
            'className="sticky top-4 z-20 rounded-[2rem] bg-white/95 p-5 shadow-sm ring-1 ring-slate-200 backdrop-blur"',
            'const courseHref = courseId ? `/admin/courses#course-${courseId}` : "/admin/courses";',
            'lesson?.is_active === false ? "Скрыт" : "Активен"',
            'Скрытых:',
            'К курсу',
            'data-testid="lesson-studio-topbar-error"',
            'data-testid="lesson-studio-status-strip"',
            'data-testid="lesson-studio-open-course-button"',
            'data-testid="lesson-studio-reload-button"',
            'data-testid="lesson-studio-quick-actions"',
            'data-testid="lesson-studio-title"',
            'data-testid="lesson-studio-back-to-courses"',
            "function LessonStudioStructurePanel",
            'Добавьте первый блок через левую панель.',
            'quickAddDisabled={blocksLoading}',
            'quickAddTemplates={STUDIO_QUICK_BLOCK_TEMPLATES}',
            'data-testid="lesson-studio-sidebar-quick-add-button"',
            'data-testid="lesson-studio-sidebar-quick-add"',
            'function LessonStudioSidebarQuickAdd(',
            'className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"',
            'onSelectBlock={handleSelectBlock}',
            'target.scrollIntoView({ behavior: "smooth", block: "center" });',
            'document.getElementById(`studio-block-${blockId}`)',
            'const handleSelectBlock = useCallback((blockId) => {',
            'плавно перейдёт к карточке на полотне',
            'Компактная карта урока',
            'Незаполненных',
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
            'className={previewMode ? "hidden" : "mt-4 flex flex-wrap items-center gap-2"}',
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
            'previewMode ? "Предпросмотр" : "Редактор"',
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
            'Измените основные поля блока прямо в карточке',
            'xl:grid-cols-[280px_minmax(0,1fr)]',
            'savingBlockId={blockActionId}',
            'variant="inline"',
            'data-testid="lesson-studio-inline-inspector-close"',
            'lesson-studio-inline-inspector',
            'className="sticky bottom-0 -mx-1 rounded-[1.25rem] bg-white/95 p-2 shadow-sm ring-1 ring-slate-200 backdrop-blur"',
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
            "onBlocksChanged={handleEditorBlocksChanged}",
            "onRefreshBlocks={loadBlocks}",
            "onSaveBlock={handleInspectorSaveBlock}",
            
            "Сохранить блок",
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

    require_contains(
        [
            'typeof onBlocksChanged === "function"',
            "onBlocksChanged(nextBlocks)",
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
        "Обновить полотно",
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

    print("Lesson Studio page smoke passed")


if __name__ == "__main__":
    main()
