from __future__ import annotations

from app.api.v1 import admin, public
from app.services.lesson_blocks import LESSON_BLOCK_TYPES, normalize_lesson_block_type


def test_lesson_audio_block_type_is_registered() -> None:
    assert "audio" in LESSON_BLOCK_TYPES
    assert normalize_lesson_block_type(" Audio ") == "audio"


def test_admin_audio_upload_endpoint_contract() -> None:
    assert ".mp3" in admin.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert ".wav" in admin.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert ".m4a" in admin.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert ".ogg" in admin.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert ".webm" in admin.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert admin.LESSON_AUDIO_MAX_UPLOAD_BYTES >= 10 * 1024 * 1024

    assert admin.get_lesson_audio_mime_type(".mp3") == "audio/mpeg"
    assert admin.get_lesson_audio_mime_type(".wav") == "audio/wav"

    assert callable(admin.normalize_lesson_audio_extension)
    assert callable(admin.save_admin_lesson_audio_file)
    assert callable(admin.build_lesson_audio_public_urls)
    assert callable(admin.upload_admin_lesson_audio_asset)


def test_public_audio_stream_and_download_handlers_exist() -> None:
    assert ".mp3" in public.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert ".wav" in public.LESSON_AUDIO_ALLOWED_EXTENSIONS
    assert ".webm" in public.LESSON_AUDIO_ALLOWED_EXTENSIONS

    assert callable(public.resolve_public_lesson_audio_path)
    assert callable(public.stream_public_lesson_audio)
    assert callable(public.download_public_lesson_audio)


def test_admin_audio_public_url_contract() -> None:
    class Request:
        base_url = "https://portal.example.test/"

    urls = admin.build_lesson_audio_public_urls(
        request=Request(),
        lesson_id="lesson-1",
        asset_id="asset-1",
    )

    assert urls == {
        "stream_url": "https://portal.example.test/api/v1/public/lesson-audio/lesson-1/asset-1/stream",
        "download_url": "https://portal.example.test/api/v1/public/lesson-audio/lesson-1/asset-1/download",
    }
