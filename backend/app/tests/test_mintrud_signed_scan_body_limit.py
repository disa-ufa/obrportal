"""Real FastAPI multipart parsing with synthetic ASGI streams; no DB or Docker."""
import ast
import asyncio
import io
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Request, UploadFile
from starlette import formparsers
import pytest

from app.api.signed_scan_upload_limit import (
    MAX_SIGNED_SCAN_REQUEST_BYTES as BUDGET, SignedScanUploadLimitRoute,
)
from app.services.mintrud_protocol_scans import MAX_SIGNED_SCAN_BYTES, validate_signed_scan

PATH = '/api/v1/admin/mintrud/protocol-drafts/synthetic/signed-scan'
PREFIX = b'--boundary\r\nContent-Disposition: form-data; name="file"; filename="scan.pdf"\r\nContent-Type: application/pdf\r\n\r\n'
SUFFIX = b'\r\n--boundary--\r\n'


def pdf(size):
    # A valid blank-page PDF, padded with one PDF comment before the xref.
    data = b'%PDF-1.4\n'
    offsets = []
    for obj in [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>', b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>']:
        offsets.append(len(data))
        data += str(len(offsets)).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
    def tail(start):
        return b'xref\n0 4\n0000000000 65535 f \n'+b''.join(f'{n:010} 00000 n \n'.encode() for n in offsets)+b'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n'+str(start).encode()+b'\n%%EOF\n'
    padding = size-len(data)-len(tail(size))
    for _ in range(4):
        padding = size-len(data)-len(tail(len(data)+padding))
    assert padding >= 2
    data += b'%'+b'x'*(padding-2)+b'\n'
    return data+tail(len(data))


def application(route_class=SignedScanUploadLimitRoute):
    app = FastAPI()
    router = APIRouter(route_class=route_class)
    calls = []
    async def permission(request: Request):
        calls.append('authorization')
        if request.headers.get('authorization') != 'Bearer synthetic':
            raise HTTPException(401, 'Unauthorized')
    @router.post('/{protocol_id}/signed-scan')
    async def upload(protocol_id: str, file: UploadFile = File(...), user=Depends(permission)):
        calls.append('endpoint')
        try:
            data = await file.read(MAX_SIGNED_SCAN_BYTES+1)
            media, _ = validate_signed_scan(file.filename, file.content_type, data)
            return {'size': len(data), 'media': media}
        finally:
            await file.close()
    @router.post('/other')
    async def other(request: Request):
        return {'size': len(await request.body())}
    @router.get('/{protocol_id}/signed-scan')
    async def download():
        return {'untouched': True}
    app.include_router(router, prefix='/api/v1/admin/mintrud/protocol-drafts')
    return app, calls


async def invoke(app, chunks, length=None, authorized=True, path=PATH, method='POST'):
    headers = [(b'content-type', b'multipart/form-data; boundary=boundary')]
    if length is not None:
        headers += [(b'content-length', value) for value in (length if isinstance(length, list) else [length])]
    if authorized:
        headers.append((b'authorization', b'Bearer synthetic'))
    scope = dict(type='http', asgi={'version': '3.0'}, http_version='1.1', method=method,
                 scheme='http', path=path, raw_path=path.encode(), query_string=b'',
                 headers=headers, client=('127.0.0.1', 1234), server=('127.0.0.1', 8000), root_path='')
    messages = []; iterator = iter(chunks); consumed = 0
    async def receive():
        nonlocal consumed
        try:
            chunk = next(iterator); consumed += len(chunk)
            return {'type': 'http.request', 'body': chunk, 'more_body': True}
        except StopIteration:
            return {'type': 'http.request', 'body': b'', 'more_body': False}
    async def send(message): messages.append(message)
    await app(scope, receive, send)
    return next(m['status'] for m in messages if m['type']=='http.response.start'), consumed, messages


@pytest.fixture
def files(monkeypatch):
    observed = []
    class TrackedFile(io.BytesIO):
        _rolled = False
        written = 0
        def write(self, data):
            self.written += len(data)
            return super().write(data)
    def create(*args, **kwargs):
        file = TrackedFile(); observed.append(file); return file
    monkeypatch.setattr(formparsers, 'SpooledTemporaryFile', create)
    return observed


@pytest.mark.parametrize('authorized', [True, False])
@pytest.mark.parametrize('length', [None, b'1', b'not-a-number', b'-1', [b'1', b'2']])
def test_huge_unknown_stream_is_bounded_before_authorization_and_spooling(files, authorized, length):
    app, calls = application()
    produced = 0
    def huge():
        nonlocal produced
        yield PREFIX
        # Models 64 GiB without allocating it or consuming more than the budget.
        for _ in range(1024*1024):
            produced += 1
            yield b'x'*65536
        raise AssertionError('The entire huge stream was consumed')
    status, consumed, _ = asyncio.run(invoke(app, huge(), length, authorized))
    assert status == 413 and not calls
    assert produced < 170 and consumed <= BUDGET+65536
    assert files and all(f.closed for f in files)
    assert sum(f.written for f in files) <= BUDGET


@pytest.mark.parametrize('length', [str(BUDGET+1).encode(), b'9'*10000, b'000'+str(BUDGET+1).encode()],
                         ids=['one-byte-over', 'huge-declared-header', 'leading-zero-header'])
def test_oversized_declared_length_rejected_without_reading_or_creating_files(files, length):
    app, calls = application()
    def unread(): raise AssertionError('Body must not be read'); yield b''
    status, consumed, _ = asyncio.run(invoke(app, unread(), length, False))
    assert (status, consumed, calls, files) == (413, 0, [], [])


@pytest.mark.parametrize('length', [None, b'bad', b'1', 'actual'])
def test_exact_ten_mib_pdf_and_normal_overhead_are_accepted(files, length):
    app, calls = application(); data = pdf(MAX_SIGNED_SCAN_BYTES)
    assert len(data) == MAX_SIGNED_SCAN_BYTES
    body = PREFIX+data+SUFFIX
    if length == 'actual': length = str(len(body)).encode()
    status, consumed, _ = asyncio.run(invoke(app, (body[n:n+65536] for n in range(0,len(body),65536)), length))
    assert status == 200 and consumed == len(body)
    assert calls == ['authorization', 'endpoint'] and all(f.closed for f in files)


def test_file_limit_remains_ten_mib_even_within_total_request_budget(files):
    app, _ = application()
    assert asyncio.run(invoke(app, [PREFIX+pdf(MAX_SIGNED_SCAN_BYTES+1)+SUFFIX]))[0] == 413
    assert all(f.closed for f in files)


def test_small_unauthorized_upload_still_requires_permission(files):
    app, calls = application()
    assert asyncio.run(invoke(app, [PREFIX+pdf(1024)+SUFFIX], authorized=False))[0] == 401
    assert calls == ['authorization'] and all(f.closed for f in files)


def test_other_endpoints_and_download_are_not_limited(files):
    app, _ = application()
    assert asyncio.run(invoke(app, [b'x'*65536]*(BUDGET//65536+2), path=PATH.rsplit('/',2)[0]+'/other', length=b'9'*100))[0] == 200
    assert asyncio.run(invoke(app, [], method='GET', length=b'9'*100))[0] == 200


def test_ordinary_malformed_multipart_is_not_relabelled_as_oversize(files):
    app, _ = application()
    status, _, _ = asyncio.run(invoke(app, [b'--boundary\r\nContent-Disposition: form-data; filename="a.pdf"\r\n\r\nx\r\n--boundary--\r\n']))
    assert status == 400


def test_production_router_uses_the_limit_route():
    source = (Path(__file__).resolve().parents[1]/'api/v1/mintrud_protocol_drafts.py').read_text(encoding='utf-8')
    tree = ast.parse(source)
    router = next(n.value for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t,ast.Name) and t.id=='router' for t in n.targets))
    assert any(k.arg=='route_class' and isinstance(k.value,ast.Name) and k.value.id=='SignedScanUploadLimitRoute' for k in router.keywords)


def test_negative_control_ordinary_fastapi_spools_past_the_request_budget(files):
    from fastapi.routing import APIRoute
    app, calls = application(APIRoute)
    def finite_oversize():
        yield PREFIX
        for _ in range(BUDGET//65536+2): yield b'x'*65536
        yield SUFFIX
    status, _, _ = asyncio.run(invoke(app, finite_oversize(), authorized=False))
    assert status == 401 and calls == ['authorization']
    assert sum(f.written for f in files) > BUDGET and all(f.closed for f in files)


def test_total_budget_includes_all_multipart_files(files):
    app, calls = application()
    def several():
        yield PREFIX
        for _ in range(96): yield b'x'*65536
        yield b'\r\n'+PREFIX
        for _ in range(96): yield b'x'*65536
        yield SUFFIX
    status, _, _ = asyncio.run(invoke(app, several()))
    assert status == 413 and not calls
    assert len(files) == 2 and sum(f.written for f in files) <= BUDGET
    assert all(f.closed for f in files)
