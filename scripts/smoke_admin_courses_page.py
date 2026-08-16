from pathlib import Path


def read_text(path):
    return Path(path).read_text(encoding="utf-8")


def main():
    source = read_text("frontend/src/pages/AdminCoursesPage.jsx")

    required_fragments = [
        '<CourseStructureTree',
        'data-testid="admin-courses-structure-tree"',
        'data-testid={`admin-course-tree-course-${course.id}`}',
        'data-testid={`admin-course-tree-module-${module.id}`}',
        'data-testid={`admin-course-tree-lesson-${lesson.id}`}',
        'data-testid={`lesson-studio-open-tree-${lesson.id}`}',
        'data-testid={`admin-course-tree-module-create-${course.id}`}',
        'data-testid={`admin-course-tree-lesson-create-${module.id}`}',
        'border border-dashed border-blue-200',
        'data-testid={`admin-course-tree-lesson-actions-${lesson.id}`}',
        'data-testid={`admin-course-tree-module-actions-${module.id}`}',
        'data-testid={`admin-course-tree-course-actions-${course.id}`}',
        'data-testid={`${prefix}course-publication-control`}',
        'id={`${prefix}is-public`}',
        'checked={values.is_public}',
        'onChange={(event) => onChange("is_public", event.target.checked)}',
        'is_public: false',
        'is_public: Boolean(course.is_public)',
        'is_public: Boolean(values.is_public)',
        'function getCoursePublicationTone(course)',
        'function getCoursePublicationLabel(course)',
        'const publicEnabled = Boolean(course.is_public);',
        'const published = active && publicEnabled;',
        'async function handleTogglePublic(course)',
        'onTogglePublic={handleTogglePublic}',
        'Опубликована в каталоге',
        'Опубликовать в каталоге',
        'Снять с публикации',
        'course.slug && course.is_active && course.is_public',
        'publishCourse',
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
