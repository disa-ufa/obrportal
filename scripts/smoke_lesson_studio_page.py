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


def main() -> None:
    require_contains(
        "frontend/src/pages/LessonStudioPage.jsx",
        [
            'import { useCallback, useEffect, useMemo, useState } from "react";',
            "getAdminCourseLessonDetail",
            "getAdminLessonBlocks",
            "updateAdminLessonBlock",
            "LessonBlocksEditor",
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
            'data-testid="lesson-studio-inspector"',
            'data-testid="lesson-studio-inspector-form"',
            'data-testid="lesson-studio-technical-editor"',
            'data-testid="lesson-studio-advanced-technical-body"',
            'data-testid="lesson-studio-advanced-technical-summary"',
            'Основное наполнение урока теперь выполняется на визуальном полотне',
            'Используйте только для ручной диагностики и резервного редактирования',
            'Резервный редактор',
            'Расширенные технические настройки',
            "function LessonStudioTopbar",
            "function LessonStudioStructurePanel",
            "function LessonStudioCanvas",
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
            'canMoveDown={index < blocks.length - 1}',
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
            "Обновить полотно",
            
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
        "frontend/src/components/admin/LessonBlocksEditor.jsx",
        [
            "export function LessonBlocksEditor({ lessonId, onBlocksChanged })",
            'typeof onBlocksChanged === "function"',
            "onBlocksChanged(nextBlocks)",
        ],
    )

    print("Lesson Studio page smoke passed")


if __name__ == "__main__":
    main()
