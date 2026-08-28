from __future__ import annotations

from app.api.v1 import admin


def test_admin_presentation_public_url_contract_is_same_origin_relative() -> None:
    class Request:
        base_url = "http://portal.example.test/"

    urls = admin.build_lesson_presentation_public_urls(
        request=Request(),
        lesson_id="lesson-1",
        asset_id="asset-1",
    )

    assert urls == {
        "viewer_url": (
            "/api/v1/public/lesson-presentations/"
            "lesson-1/asset-1/view"
        ),
        "download_url": (
            "/api/v1/public/lesson-presentations/"
            "lesson-1/asset-1/download"
        ),
    }
