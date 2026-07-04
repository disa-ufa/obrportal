from app.api.v1 import admin, public


def test_admin_image_upload_endpoint_contract():
    paths = {getattr(route, "path", "") for route in admin.router.routes}

    assert "/admin/course-lessons/{lesson_id}/image-assets" in paths


def test_public_image_view_and_download_handlers_exist():
    paths = {getattr(route, "path", "") for route in public.router.routes}

    assert "/public/lesson-images/{lesson_id}/{asset_id}/view" in paths
    assert "/public/lesson-images/{lesson_id}/{asset_id}/download" in paths
    assert callable(public.view_public_lesson_image)
    assert callable(public.download_public_lesson_image)


def test_admin_image_public_url_contract():
    urls = admin.build_lesson_image_public_urls(
        lesson_id="lesson-1",
        asset_id="asset-1",
    )

    assert urls["url"] == "/api/v1/public/lesson-images/lesson-1/asset-1/view"
    assert urls["content_url"] == "/api/v1/public/lesson-images/lesson-1/asset-1/view"
    assert urls["image_url"] == "/api/v1/public/lesson-images/lesson-1/asset-1/view"
    assert urls["image_src"] == "/api/v1/public/lesson-images/lesson-1/asset-1/view"
    assert urls["src"] == "/api/v1/public/lesson-images/lesson-1/asset-1/view"
    assert urls["download_url"] == "/api/v1/public/lesson-images/lesson-1/asset-1/download"


def test_lesson_image_allowed_extensions_contract():
    assert ".jpg" in admin.LESSON_IMAGE_ALLOWED_EXTENSIONS
    assert ".jpeg" in admin.LESSON_IMAGE_ALLOWED_EXTENSIONS
    assert ".png" in admin.LESSON_IMAGE_ALLOWED_EXTENSIONS
    assert ".webp" in admin.LESSON_IMAGE_ALLOWED_EXTENSIONS
    assert ".gif" in admin.LESSON_IMAGE_ALLOWED_EXTENSIONS
    assert ".svg" not in admin.LESSON_IMAGE_ALLOWED_EXTENSIONS
