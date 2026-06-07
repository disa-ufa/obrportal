#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/opt/obrportal}"
cd "$ROOT_DIR"

echo "=== PRODUCTION PUBLIC SMOKE ==="

echo "=== GIT ==="
git branch --show-current
git rev-parse --short HEAD
git status --short

echo "=== DOCKER ==="
docker compose ps

echo "=== BACKEND ==="
curl -sS http://127.0.0.1:8000/health
echo
curl -sS http://127.0.0.1:8000/api/v1/ready
echo

echo "=== PUBLIC ROUTES ==="
for path in / /catalog /contacts /organization-info /faq /privacy /offer /verify-document; do
  echo "--- $path"
  curl -I "https://portal.rcdo02.ru$path"
done

echo "=== PUBLIC CONTENT CHECK ==="
docker compose exec -T frontend sh -lc 'grep -R "ГБОУ РЦДО\|0274931354\|Авроры\|Нуриев\|200 10 17\|rcdodist@gmail.com" -n /usr/share/nginx/html 2>/dev/null | head -80'

echo "=== PUBLIC SMOKE DONE ==="
