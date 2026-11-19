"""Bound the scan request stream before FastAPI parses multipart files."""
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException
from starlette.formparsers import MultiPartException
from starlette.requests import Request

from app.services.mintrud_protocol_scans import MAX_SIGNED_SCAN_BYTES

SIGNED_SCAN_MULTIPART_OVERHEAD_BYTES = 64 * 1024
MAX_SIGNED_SCAN_REQUEST_BYTES = MAX_SIGNED_SCAN_BYTES + SIGNED_SCAN_MULTIPART_OVERHEAD_BYTES


def _declared_too_large(value: str) -> bool:
    # A missing, malformed, conflicting or understated header is never trusted
    # instead of counting the actual stream. Avoid unbounded integer parsing.
    value = value.strip()
    if not value.isascii() or not value.isdecimal():
        return False
    value = value.lstrip("0") or "0"
    ceiling = str(MAX_SIGNED_SCAN_REQUEST_BYTES)
    return len(value) > len(ceiling) or (len(value) == len(ceiling) and value > ceiling)


class SignedScanUploadLimitRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()
        if "POST" not in self.methods or not self.path.endswith("/{protocol_id}/signed-scan"):
            return handler

        async def bounded(request: Request):
            lengths = request.headers.getlist("content-length")
            if len(lengths) == 1 and _declared_too_large(lengths[0]):
                raise HTTPException(413, "Signed scan request exceeds 10 MiB plus 64 KiB multipart overhead")
            received = 0
            exceeded = False

            async def receive():
                nonlocal received, exceeded
                if not exceeded:
                    message = await request.receive()
                    if message["type"] == "http.request":
                        received += len(message.get("body", b""))
                        exceeded = received > MAX_SIGNED_SCAN_REQUEST_BYTES
                    if not exceeded:
                        return message
                # Starlette's multipart parser closes every temporary upload
                # when this exception interrupts parse(). The offending chunk
                # is never passed to the parser and the remaining body is not read.
                raise MultiPartException("Signed scan request body limit exceeded")

            try:
                response = await handler(Request(request.scope, receive=receive))
            except (HTTPException, MultiPartException):
                if not exceeded:
                    raise
            else:
                if not exceeded:
                    return response
            # Request.form() normally translates MultiPartException to 400.
            # Only our own limit signal is translated to the required 413.
            raise HTTPException(413, "Signed scan request exceeds 10 MiB plus 64 KiB multipart overhead")

        return bounded
