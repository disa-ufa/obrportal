from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_lesson import CourseLesson
from app.models.lesson_block import LessonBlock


def lesson_readiness_text_from_tiptap_node(node) -> str:
    if not isinstance(node, dict):
        return ""

    if node.get("type") == "text":
        return str(node.get("text") or "")

    if node.get("type") == "hardBreak":
        return "\\n"

    children = node.get("content")

    if not isinstance(children, list):
        return ""

    return "".join(lesson_readiness_text_from_tiptap_node(child) for child in children)


def lesson_readiness_has_tiptap_text(value) -> bool:
    if not isinstance(value, dict):
        return False

    return bool(lesson_readiness_text_from_tiptap_node(value).strip())


def get_lesson_block_content_dict(block: LessonBlock) -> dict:
    content = block.content_json or {}

    return content if isinstance(content, dict) else {}


def get_lesson_block_content_value(content: dict, keys: list[str]) -> str:
    for key in keys:
        value = content.get(key)

        if isinstance(value, str) and value.strip():
            return value.strip()

    return ""


def get_lesson_block_readiness_issues(block: LessonBlock) -> list[str]:
    block_type = (block.block_type or "rich_text").strip().lower()
    content = get_lesson_block_content_dict(block)
    issues: list[str] = []

    if not (block.title or content.get("title") or "").strip():
        issues.append("\u043d\u0435\u0442 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u0430")

    if block_type in {"rich_text", "text", "callout"}:
        has_text = bool(
            get_lesson_block_content_value(content, ["text", "content_text", "body", "description"])
            or lesson_readiness_has_tiptap_text(content.get("editor_json"))
        )

        if not has_text:
            issues.append("\u043d\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u0430")

    elif block_type == "video":
        has_source = bool(
            get_lesson_block_content_value(
                content,
                ["url", "content_url", "video_url", "src", "embed_code", "video_embed_code", "iframe"],
            )
        )

        if not has_source:
            issues.append("\u043d\u0435\u0442 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430 \u0432\u0438\u0434\u0435\u043e")

    elif block_type == "audio":
        has_audio = bool(
            get_lesson_block_content_value(
                content,
                ["url", "content_url", "audio_url", "stream_url", "src", "file_url", "href", "download_url"],
            )
        )

        if not has_audio:
            issues.append("\u043d\u0435\u0442 \u0430\u0443\u0434\u0438\u043e")

    elif block_type == "presentation":
        has_presentation = bool(
            get_lesson_block_content_value(
                content,
                ["viewer_url", "url", "content_url", "file_url", "href", "download_url", "original_url"],
            )
        )

        if not has_presentation:
            issues.append("\u043d\u0435\u0442 \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u0438")

    elif block_type in {"file_link", "file", "link"}:
        kind = str(content.get("material_kind") or content.get("kind") or content.get("media_type") or "").lower()
        title = str(block.title or content.get("title") or "").lower()
        looks_like_image = kind == "image" or "\u0438\u0437\u043e\u0431\u0440\u0430\u0436" in title

        if looks_like_image:
            has_image = bool(
                get_lesson_block_content_value(
                    content,
                    ["image_url", "image_src", "src", "url", "content_url"],
                )
            )

            if not has_image:
                issues.append("\u043d\u0435\u0442 \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f")
        else:
            has_link = bool(
                get_lesson_block_content_value(
                    content,
                    ["url", "content_url", "file_url", "href", "download_url"],
                )
            )

            if not has_link:
                issues.append("\u043d\u0435\u0442 \u0441\u0441\u044b\u043b\u043a\u0438")

    elif block_type == "quiz":
        questions = content.get("questions")

        if not isinstance(questions, list) or not questions:
            issues.append("\u043d\u0435\u0442 \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432")
        else:
            empty_questions = 0

            for question in questions:
                if not isinstance(question, dict):
                    empty_questions += 1
                    continue

                question_title = str(
                    question.get("title")
                    or question.get("question")
                    or question.get("text")
                    or ""
                ).strip()

                if not question_title:
                    empty_questions += 1

            if empty_questions:
                issues.append("\u0435\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u0431\u0435\u0437 \u0442\u0435\u043a\u0441\u0442\u0430")

    elif block_type == "assignment":
        has_assignment = bool(
            get_lesson_block_content_value(
                content,
                ["description", "text", "content_text", "assignment_text", "body"],
            )
        )

        if not has_assignment:
            issues.append("\u043d\u0435\u0442 \u0437\u0430\u0434\u0430\u043d\u0438\u044f")

    else:
        has_generic_content = bool(
            get_lesson_block_content_value(
                content,
                ["text", "content_text", "body", "description", "url", "content_url", "src"],
            )
        )

        if not has_generic_content:
            issues.append("\u043d\u0435\u0442 \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u043c\u043e\u0433\u043e")

    return issues


def get_legacy_course_lesson_content_ready(lesson: CourseLesson) -> bool:
    content_type = (lesson.content_type or "text").strip().lower()
    content_text = (lesson.content_text or "").strip()
    content_url = (lesson.content_url or "").strip()
    description = (lesson.description or "").strip()

    if content_type in {"text", "rich_text"}:
        return bool(content_text)

    if content_type in {"video", "file", "link"}:
        return bool(content_url or content_text)

    if content_type == "assignment":
        return bool(description or content_text)

    return bool(content_text or content_url or description)


def normalize_admin_lesson_readiness_payload(payload: dict | None = None) -> dict:
    payload = payload or {}

    return {
        "blocks_count": int(payload.get("blocks_count") or 0),
        "active_blocks_count": int(payload.get("active_blocks_count") or 0),
        "problem_blocks_count": int(payload.get("problem_blocks_count") or 0),
        "is_content_ready": bool(payload.get("is_content_ready")),
        "readiness_status": payload.get("readiness_status") or "empty",
        "readiness_issues": list(payload.get("readiness_issues") or []),
    }


def build_admin_lesson_readiness_payload(
    lesson: CourseLesson,
    blocks: list[LessonBlock],
) -> dict:
    safe_blocks = list(blocks or [])
    active_blocks = [block for block in safe_blocks if block.is_active is not False]
    problem_items = []

    for block in active_blocks:
        issues = get_lesson_block_readiness_issues(block)

        if issues:
            block_label = block.title or f"\u0411\u043b\u043e\u043a {block.position}"
            problem_items.append(f"{block_label}: {', '.join(issues)}")

    legacy_ready = get_legacy_course_lesson_content_ready(lesson)

    if active_blocks:
        is_ready = len(problem_items) == 0
        readiness_status = "ready" if is_ready else "needs_work"
        readiness_issues = problem_items
    elif safe_blocks:
        is_ready = False
        readiness_status = "hidden"
        readiness_issues = ["\u0412 \u0443\u0440\u043e\u043a\u0435 \u0435\u0441\u0442\u044c \u0431\u043b\u043e\u043a\u0438 Lesson Studio, \u043d\u043e \u0432\u0441\u0435 \u043e\u043d\u0438 \u0441\u043a\u0440\u044b\u0442\u044b."]
    elif legacy_ready:
        is_ready = True
        readiness_status = "legacy_ready"
        readiness_issues = []
    else:
        is_ready = False
        readiness_status = "empty"
        readiness_issues = ["\u0412 \u0443\u0440\u043e\u043a\u0435 \u043d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0445 \u0431\u043b\u043e\u043a\u043e\u0432."]

    return normalize_admin_lesson_readiness_payload(
        {
            "blocks_count": len(safe_blocks),
            "active_blocks_count": len(active_blocks),
            "problem_blocks_count": len(problem_items),
            "is_content_ready": is_ready,
            "readiness_status": readiness_status,
            "readiness_issues": readiness_issues,
        }
    )


async def get_admin_lessons_readiness_map(
    lessons: list[CourseLesson],
    session: AsyncSession,
) -> dict[str, dict]:
    lesson_ids = [lesson.id for lesson in lessons]

    if not lesson_ids:
        return {}

    result = await session.execute(
        select(LessonBlock)
        .where(LessonBlock.lesson_id.in_(lesson_ids))
        .order_by(
            LessonBlock.lesson_id.asc(),
            LessonBlock.position.asc(),
            LessonBlock.title.asc(),
        )
    )
    blocks = result.scalars().all()
    blocks_by_lesson_id: dict[str, list[LessonBlock]] = {}

    for block in blocks:
        blocks_by_lesson_id.setdefault(str(block.lesson_id), []).append(block)

    return {
        str(lesson.id): build_admin_lesson_readiness_payload(
            lesson,
            blocks_by_lesson_id.get(str(lesson.id), []),
        )
        for lesson in lessons
    }


async def get_admin_lesson_readiness_payload(
    lesson: CourseLesson,
    session: AsyncSession,
) -> dict:
    readiness_map = await get_admin_lessons_readiness_map([lesson], session)

    return readiness_map.get(str(lesson.id), normalize_admin_lesson_readiness_payload())
