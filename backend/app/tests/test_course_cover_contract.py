import asyncio
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, UploadFile

from app.api.v1 import admin as admin_api
from app.api.v1 import public as public_api


PNG_CONTENT = b"\x89PNG\r\n\x1a\ncourse-cover-test"
JPEG_CONTENT = b"\xff\xd8\xff\xe0course-cover-test"
WEBP_CONTENT = (
    b"RIFF"
    + b"\x10\x00\x00\x00"
    + b"WEBP"
    + b"course-cover-test"
)


def make_upload(
    filename: str,
    content: bytes,
) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
    )


@pytest.mark.parametrize(
    ("filename", "expected_extension"),
    [
        ("cover.jpg", ".jpg"),
        ("cover.JPEG", ".jpeg"),
        ("cover.png", ".png"),
        ("cover.webp", ".webp"),
    ],
)
def test_course_cover_filename_formats_are_supported(
    filename,
    expected_extension,
):
    assert (
        admin_api.normalize_course_cover_extension(
            filename
        )
        == expected_extension
    )


@pytest.mark.parametrize(
    "filename",
    [
        "cover.gif",
        "cover.svg",
        "cover.exe",
        "cover",
    ],
)
def test_course_cover_filename_formats_reject_unsupported(
    filename,
):
    with pytest.raises(HTTPException) as exc_info:
        admin_api.normalize_course_cover_extension(
            filename
        )

    assert exc_info.value.status_code == 415


@pytest.mark.parametrize(
    ("content", "expected_extension"),
    [
        (PNG_CONTENT, ".png"),
        (JPEG_CONTENT, ".jpg"),
        (WEBP_CONTENT, ".webp"),
    ],
)
def test_course_cover_content_signature_detection(
    content,
    expected_extension,
):
    assert (
        admin_api.detect_course_cover_content_extension(
            content
        )
        == expected_extension
    )


def test_course_cover_content_signature_rejects_fake_image():
    with pytest.raises(HTTPException) as exc_info:
        admin_api.detect_course_cover_content_extension(
            b"not-an-image"
        )

    assert exc_info.value.status_code == 415


@pytest.mark.parametrize(
    ("requested", "detected", "expected"),
    [
        (".jpg", ".jpg", True),
        (".jpeg", ".jpg", True),
        (".png", ".png", True),
        (".webp", ".webp", True),
        (".png", ".jpg", False),
        (".jpg", ".png", False),
        (".webp", ".png", False),
    ],
)
def test_course_cover_extension_must_match_content(
    requested,
    detected,
    expected,
):
    assert (
        admin_api.course_cover_extensions_match(
            requested,
            detected,
        )
        is expected
    )


def test_save_course_cover_writes_expected_storage_path(
    monkeypatch,
):
    captured = {}

    def fake_write(storage_path, content):
        captured["storage_path"] = storage_path
        captured["content"] = content
        return storage_path

    monkeypatch.setattr(
        admin_api,
        "write_private_storage_file",
        fake_write,
    )

    upload = make_upload(
        "cover.png",
        PNG_CONTENT,
    )

    storage_path, size_bytes = asyncio.run(
        admin_api.save_admin_course_cover_file(
            upload,
            course_id="course-123",
            asset_id="asset-456",
            extension=".png",
        )
    )

    assert (
        storage_path
        == "course-covers/course-123/"
        "asset-456.png"
    )
    assert captured["storage_path"] == storage_path
    assert captured["content"] == PNG_CONTENT
    assert size_bytes == len(PNG_CONTENT)


def test_save_course_cover_rejects_extension_content_mismatch(
    monkeypatch,
):
    called = False

    def fake_write(storage_path, content):
        nonlocal called
        called = True
        return storage_path

    monkeypatch.setattr(
        admin_api,
        "write_private_storage_file",
        fake_write,
    )

    upload = make_upload(
        "cover.png",
        JPEG_CONTENT,
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            admin_api.save_admin_course_cover_file(
                upload,
                course_id="course-123",
                asset_id="asset-456",
                extension=".png",
            )
        )

    assert exc_info.value.status_code == 415
    assert called is False


def test_save_course_cover_rejects_empty_file(
    monkeypatch,
):
    called = False

    def fake_write(storage_path, content):
        nonlocal called
        called = True
        return storage_path

    monkeypatch.setattr(
        admin_api,
        "write_private_storage_file",
        fake_write,
    )

    upload = make_upload(
        "cover.png",
        b"",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            admin_api.save_admin_course_cover_file(
                upload,
                course_id="course-123",
                asset_id="asset-456",
                extension=".png",
            )
        )

    assert exc_info.value.status_code == 422
    assert called is False


def test_save_course_cover_rejects_file_over_limit(
    monkeypatch,
):
    called = False

    def fake_write(storage_path, content):
        nonlocal called
        called = True
        return storage_path

    monkeypatch.setattr(
        admin_api,
        "write_private_storage_file",
        fake_write,
    )

    content = (
        PNG_CONTENT[:8]
        + b"x"
        * (
            admin_api.COURSE_COVER_MAX_UPLOAD_BYTES
            + 1
        )
    )

    upload = make_upload(
        "cover.png",
        content,
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            admin_api.save_admin_course_cover_file(
                upload,
                course_id="course-123",
                asset_id="asset-456",
                extension=".png",
            )
        )

    assert exc_info.value.status_code == 413
    assert called is False


def test_admin_course_cover_url_uses_current_storage_path():
    course = SimpleNamespace(
        id="course-123",
        cover_image_path=(
            "course-covers/course-123/"
            "asset-456.webp"
        ),
    )

    assert (
        admin_api.build_course_cover_public_url(
            course
        )
        == (
            "/api/v1/public/course-covers/"
            "course-123/asset-456/view"
        )
    )


def test_public_course_cover_url_uses_current_storage_path():
    course = SimpleNamespace(
        id="course-123",
        cover_image_path=(
            "course-covers/course-123/"
            "asset-456.jpeg"
        ),
    )

    assert (
        public_api.build_public_course_cover_url(
            course
        )
        == (
            "/api/v1/public/course-covers/"
            "course-123/asset-456/view"
        )
    )


@pytest.mark.parametrize(
    "storage_path",
    [
        None,
        "",
        "../asset.png",
        "course-covers/other-course/asset.png",
        "course-covers/course-123/asset.gif",
    ],
)
def test_course_cover_url_rejects_invalid_storage_reference(
    storage_path,
):
    course = SimpleNamespace(
        id="course-123",
        cover_image_path=storage_path,
    )

    assert (
        admin_api.build_course_cover_public_url(
            course
        )
        is None
    )

    assert (
        public_api.build_public_course_cover_url(
            course
        )
        is None
    )


def test_public_resolver_only_serves_current_asset(
    tmp_path,
    monkeypatch,
):
    cover_file = tmp_path / "asset-456.png"
    cover_file.write_bytes(PNG_CONTENT)

    expected_storage_path = (
        "course-covers/course-123/"
        "asset-456.png"
    )

    resolved_requests = []

    def fake_resolve(storage_path):
        resolved_requests.append(storage_path)

        if storage_path == expected_storage_path:
            return cover_file

        return None

    monkeypatch.setattr(
        public_api,
        "resolve_private_storage_path",
        fake_resolve,
    )

    course = SimpleNamespace(
        id="course-123",
        cover_image_path=expected_storage_path,
    )

    path, media_type = (
        public_api.resolve_current_course_cover_path(
            course,
            asset_id="asset-456",
        )
    )

    assert path == cover_file
    assert media_type == "image/png"
    assert resolved_requests == [
        expected_storage_path
    ]

    stale_path, stale_media_type = (
        public_api.resolve_current_course_cover_path(
            course,
            asset_id="old-asset",
        )
    )

    assert stale_path is None
    assert (
        stale_media_type
        == "application/octet-stream"
    )

    # Stale asset is rejected before storage lookup.
    assert resolved_requests == [
        expected_storage_path
    ]


def test_admin_course_item_exposes_cover_url():
    course = SimpleNamespace(
        id="course-123",
        slug="course-slug",
        title="Course",
        description=None,
        hours=72,
        format="online",
        document_type="certificate",
        direction="direction",
        cover_image_path=(
            "course-covers/course-123/"
            "asset-456.jpg"
        ),
        is_public=True,
        is_active=True,
    )

    item = admin_api.build_admin_course_item(
        course
    )

    assert (
        item.cover_image_url
        == (
            "/api/v1/public/course-covers/"
            "course-123/asset-456/view"
        )
    )


def test_public_course_item_exposes_cover_url():
    course = SimpleNamespace(
        id="course-123",
        slug="course-slug",
        title="Course",
        description=None,
        hours=72,
        format="online",
        document_type="certificate",
        direction="direction",
        cover_image_path=(
            "course-covers/course-123/"
            "asset-456.webp"
        ),
    )

    item = public_api.build_public_course_item(
        course
    )

    assert (
        item.cover_image_url
        == (
            "/api/v1/public/course-covers/"
            "course-123/asset-456/view"
        )
    )


def test_course_cover_transaction_order_contract():
    admin_source = Path(
        admin_api.__file__
    ).read_text(
        encoding="utf-8-sig"
    )

    upload_start = admin_source.index(
        "async def upload_admin_course_cover("
    )
    delete_start = admin_source.index(
        "async def delete_admin_course_cover("
    )
    update_start = admin_source.index(
        '@router.patch("/courses/{course_id}"'
    )

    upload_body = admin_source[
        upload_start:delete_start
    ]

    delete_body = admin_source[
        delete_start:update_start
    ]

    assert (
        upload_body.index(
            "await session.commit()"
        )
        < upload_body.index(
            "await session.refresh(course)"
        )
        < upload_body.rindex(
            "delete_course_cover_file_safely("
        )
    )

    assert (
        delete_body.index(
            "await session.commit()"
        )
        < delete_body.index(
            "await session.refresh(course)"
        )
        < delete_body.rindex(
            "delete_course_cover_file_safely("
        )
    )


def test_course_cover_route_and_permission_contract():
    admin_source = Path(
        admin_api.__file__
    ).read_text(
        encoding="utf-8-sig"
    )

    public_source = Path(
        public_api.__file__
    ).read_text(
        encoding="utf-8-sig"
    )

    assert (
        admin_source.count(
            '"/courses/{course_id}/cover"'
        )
        == 2
    )

    assert (
        'require_permission("catalog.write")'
        in admin_source[
            admin_source.index(
                "async def upload_admin_course_cover("
            ):
            admin_source.index(
                "async def delete_admin_course_cover("
            )
        ]
    )

    assert (
        "/course-covers/"
        "{course_id}/{asset_id}/view"
        in public_source
    )

def test_account_course_cover_url_contract() -> None:
    from app.api.v1.account import (
        build_account_course_cover_url,
    )

    course_id = "course-cover-account-test"
    asset_id = "asset-cover-account-test"

    assert build_account_course_cover_url(
        course_id=course_id,
        storage_path=(
            f"course-covers/{course_id}/"
            f"{asset_id}.webp"
        ),
    ) == (
        f"/api/v1/public/course-covers/"
        f"{course_id}/{asset_id}/view"
    )

    assert build_account_course_cover_url(
        course_id=course_id,
        storage_path=None,
    ) is None


def test_account_course_cover_url_rejects_invalid_paths() -> None:
    from app.api.v1.account import (
        build_account_course_cover_url,
    )

    course_id = "course-cover-account-test"

    invalid_paths = (
        "course-covers/other-course/asset.jpg",
        f"course-covers/{course_id}/asset.gif",
        f"course-covers/{course_id}/../asset.jpg",
        "asset.jpg",
    )

    for storage_path in invalid_paths:
        assert build_account_course_cover_url(
            course_id=course_id,
            storage_path=storage_path,
        ) is None


def test_account_course_response_schema_exposes_cover_url() -> None:
    from app.schemas.account import (
        AccountCourseDetailResponse,
        AccountCourseItemResponse,
    )

    assert (
        "cover_image_url"
        in AccountCourseItemResponse.model_fields
    )

    assert (
        "cover_image_url"
        in AccountCourseDetailResponse.model_fields
    )


def test_account_course_item_builder_maps_cover_url() -> None:
    from types import SimpleNamespace

    from app.api.v1.account import (
        build_account_course_item_from_row,
    )

    course_id = "course-cover-account-test"
    asset_id = "asset-cover-account-test"

    row = SimpleNamespace(
        enrollment_id="enrollment-cover-test",
        course_id=course_id,
        course_slug="cover-account-course",
        course_title="Cover account course",
        course_description=None,
        status="assigned",
        hours=8,
        format="online",
        document_type=None,
        cover_image_path=(
            f"course-covers/{course_id}/"
            f"{asset_id}.jpg"
        ),
        organization_name=None,
        learning_group_name=None,
        started_at=None,
        completed_at=None,
    )

    item = build_account_course_item_from_row(
        row
    )

    assert item.cover_image_url == (
        f"/api/v1/public/course-covers/"
        f"{course_id}/{asset_id}/view"
    )


def test_account_course_item_builder_tolerates_row_without_cover() -> None:
    from types import SimpleNamespace

    from app.api.v1.account import (
        build_account_course_item_from_row,
    )

    row = SimpleNamespace(
        enrollment_id="enrollment-no-cover-test",
        course_id="course-no-cover-test",
        course_slug="course-no-cover",
        course_title="Course without cover",
        course_description=None,
        status="assigned",
        hours=None,
        format=None,
        document_type=None,
        organization_name=None,
        learning_group_name=None,
        started_at=None,
        completed_at=None,
    )

    item = build_account_course_item_from_row(
        row
    )

    assert item.cover_image_url is None


def test_account_course_detail_builder_maps_cover_url() -> None:
    from types import SimpleNamespace

    from app.api.v1.account import (
        build_account_course_detail_from_row,
    )

    course_id = "course-cover-detail-test"
    asset_id = "asset-cover-detail-test"

    row = SimpleNamespace(
        enrollment_id="enrollment-cover-detail-test",
        course_id=course_id,
        course_slug="cover-detail-course",
        course_title="Cover detail course",
        course_description=None,
        status="active",
        hours=12,
        format="online",
        document_type=None,
        cover_image_path=(
            f"course-covers/{course_id}/"
            f"{asset_id}.png"
        ),
        organization_name=None,
        learning_group_name=None,
        started_at=None,
        completed_at=None,
    )

    detail = build_account_course_detail_from_row(
        row,
        [],
    )

    assert detail.cover_image_url == (
        f"/api/v1/public/course-covers/"
        f"{course_id}/{asset_id}/view"
    )

    assert detail.modules == []
    assert detail.progress_percent == 0


def test_account_course_cover_query_contract() -> None:
    import ast
    from pathlib import Path

    path = (
        Path(__file__).resolve().parents[1]
        / "api"
        / "v1"
        / "account.py"
    )

    source = path.read_text(
        encoding="utf-8-sig"
    )

    assert source.count(
        'Course.cover_image_path.label("cover_image_path")'
    ) == 2

    tree = ast.parse(source)

    targets = {
        node.name: node
        for node in tree.body
        if isinstance(
            node,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef,
            ),
        )
    }

    for function_name in (
        "get_account_courses",
        "get_account_course_row_or_404",
    ):
        node = targets[function_name]

        segment = ast.get_source_segment(
            source,
            node,
        )

        assert segment is not None
        assert (
            'Course.cover_image_path.label('
            '"cover_image_path")'
            in segment
        )

    for function_name in (
        "get_account_courses",
        "build_account_course_item_from_row",
        "build_account_course_detail_from_row",
    ):
        node = targets[function_name]

        segment = ast.get_source_segment(
            source,
            node,
        )

        assert segment is not None
        assert (
            "build_account_course_cover_url("
            in segment
        )
