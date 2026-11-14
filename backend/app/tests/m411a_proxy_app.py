"""Synthetic CI-only proxy target: no database, filesystem uploads or exports."""
import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import Response

from app.api.signed_scan_upload_limit import SignedScanUploadLimitRoute
from app.services.mintrud_protocol_scans import MAX_SIGNED_SCAN_BYTES, validate_signed_scan

if os.environ.get('M411A_PROXY_SYNTHETIC_ONLY') != '1':
    raise RuntimeError('Explicit synthetic proxy harness opt-in required')

app = FastAPI()
router = APIRouter(route_class=SignedScanUploadLimitRoute)
scans = {}


async def permission(request: Request):
    if request.headers.get('authorization') != 'Bearer synthetic':
        raise HTTPException(401, 'Unauthorized')


@router.post('/{protocol_id}/signed-scan')
async def upload(protocol_id: str, request: Request, file: UploadFile = File(...), user=Depends(permission)):
    with Path(os.environ['M411A_PROXY_JOURNAL']).open('a', encoding='utf-8') as journal:
        journal.write(json.dumps({'path': request.url.path, 'host': request.headers.get('host'),
                                  'proto': request.headers.get('x-forwarded-proto'),
                                  'forwarded_for': request.headers.get('x-forwarded-for')})+'\n')
    try:
        data = await file.read(MAX_SIGNED_SCAN_BYTES+1)
        media, _ = validate_signed_scan(file.filename, file.content_type, data)
        if protocol_id in scans:
            raise HTTPException(409, 'Scan already exists')
        scans[protocol_id] = (data, media)
        return {'size': len(data)}
    finally:
        await file.close()


@router.get('/{protocol_id}/signed-scan')
async def download(protocol_id: str, user=Depends(permission)):
    if protocol_id not in scans:
        raise HTTPException(404, 'Missing scan')
    data, media = scans[protocol_id]
    return Response(data, media_type=media, headers={'Cache-Control': 'private, no-store',
                    'Content-Disposition': 'attachment; filename="synthetic.pdf"', 'X-Content-Type-Options': 'nosniff'})


@router.post('/other')
async def other(request: Request):
    return {'size': len(await request.body()), 'path': request.url.path}


app.include_router(router, prefix='/api/v1/admin/mintrud/protocol-drafts')
