from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PublicDocumentVerifyResponse(BaseModel):
    document_number: str
    document_type: str
    title: str
    holder_name: str | None = None
    course_title: str | None = None
    issued_at: datetime | None = None
    registry_status: str
    verification_status: str