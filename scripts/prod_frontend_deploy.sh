#!/usr/bin/env bash
set -euo pipefail

TARGET_BRANCH="${1:-develop}"
ROOT_DIR="${ROOT_DIR:-/opt/obrportal}"

cd "$ROOT_DIR"

echo "=== SAFE FRONTEND-ONLY DEPLOY ==="
echo "target_branch=$TARGET_BRANCH"
echo "root_dir=$ROOT_DIR"

echo "=== BEFORE ==="
git branch --show-current
git rev-parse --short HEAD
git status --short

echo "=== PULL ==="
git fetch origin
git pull --ff-only origin "$TARGET_BRANCH"

echo "=== AFTER PULL ==="
git rev-parse --short HEAD
git log --oneline -5
git status --short

echo "=== FRONTEND BUILD ==="
docker compose build frontend

echo "=== FRONTEND RESTART ==="
docker compose up -d --no-deps frontend

echo "=== HEALTH ==="
docker compose ps
curl -sS http://127.0.0.1:8000/health
echo
curl -sS http://127.0.0.1:8000/api/v1/ready
echo

echo "=== PUBLIC ROUTES ==="
for path in / /catalog /contacts /organization-info /faq /privacy /offer /verify-document; do
  echo "--- $path"
  curl -I "https://portal.rcdo02.ru$path"
done

echo "=== DONE ==="
