#!/usr/bin/env sh
set -eu

mc alias set local http://minio:9000 "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}"
mc mb -p local/${S3_BUCKET_PRIVATE:-obrportal-private} || true
mc mb -p local/${S3_BUCKET_PUBLIC:-obrportal-public} || true
