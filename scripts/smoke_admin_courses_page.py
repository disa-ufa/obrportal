from pathlib import Path


def read_text(path):
    return Path(path).read_text(encoding="utf-8")


def main():
    source = read_text("frontend/src/pages/AdminCoursesPage.jsx")

    required_fragments = [
        'title="Программы"',
        'data-testid="admin-courses-compact-summary"',
        'Всего: {courseCounts.all || 0}',
        'Активные: {activeCount}',
        'Неактивные: {inactiveCount}',
        'data-testid="admin-courses-extra-tools"',
        'Дополнительно: быстрые фильтры и экспорт CSV',
        'title="Структура программ"',
        '<CourseStructureTree',
        'data-testid="admin-courses-structure-tree"',
        'data-testid={`admin-course-tree-course-${course.id}`}',
        'data-testid={`admin-course-tree-module-${module.id}`}',
        'data-testid={`admin-course-tree-lesson-${lesson.id}`}',
        'data-testid={`admin-course-tree-lesson-preview-${lesson.id}`}',
        'data-testid={`lesson-studio-open-tree-${lesson.id}`}',
        'data-testid={`admin-course-tree-module-create-${course.id}`}',
        'data-testid={`admin-course-tree-lesson-create-${module.id}`}',
        'Редактировать в Lesson Studio',
        'border border-dashed border-blue-200',
        'Действия урока',
        'Действия модуля',
        'Действия программы',
        'data-testid={`admin-course-tree-lesson-actions-${lesson.id}`}',
        'data-testid={`admin-course-tree-module-actions-${module.id}`}',
        'data-testid={`admin-course-tree-course-actions-${course.id}`}',
    ]

    missing = [fragment for fragment in required_fragments if fragment not in source]
    if missing:
        print("Admin courses structure tree smoke failed. Missing fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)

    forbidden_fragments = [
        'data-testid="admin-courses-legacy-tools"',
        'title="Технический редактор курса"',
        'data-testid="admin-courses-detailed-builder"',
        'Дополнительные инструменты: старый реестр и диагностика',
        'Открыть подробный конструктор курса',
        'onClick={() => onLessonEditStart(lesson)}',
        '<AdminMetricCard',
        'title={RU.pageTitle}',
        'className="grid gap-4 md:grid-cols-3"',
        '<AdminCourseCatalogDiagnostics',
    ]

    present = [fragment for fragment in forbidden_fragments if fragment in source]
    if present:
        print("Admin courses page still contains legacy UI fragments:")
        for fragment in present:
            print(f" - {fragment}")
        raise SystemExit(1)

    print("Admin courses page smoke passed")


if __name__ == "__main__":
    main()
