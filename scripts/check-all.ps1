param(
    [switch]$SkipSmoke,
    [switch]$SkipSecretScan
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== 1. DOCKER SERVICES ===" -ForegroundColor Cyan
    & .\scripts\dev-up.ps1

    Write-Host "`n=== 2. MIGRATIONS ===" -ForegroundColor Cyan
    & .\scripts\migrate.ps1

    if (-not $SkipSecretScan) {
        Write-Host "`n=== 3. SECRET SCAN ===" -ForegroundColor Cyan
        & .\scripts\secret-scan.ps1
    }
    else {
        Write-Host "`n=== 3. SECRET SCAN SKIPPED ===" -ForegroundColor Yellow
    }

    Write-Host "`n=== 4. FRONTEND GUARD ===" -ForegroundColor Cyan
    python scripts/frontend_guard.py

    Write-Host "`n=== 5. BACKEND TESTS ===" -ForegroundColor Cyan
    & .\scripts\test-backend.ps1

    Write-Host "`n=== 6. FRONTEND BUILD ===" -ForegroundColor Cyan
    & .\scripts\test-frontend.ps1

    if (-not $SkipSmoke) {
        Write-Host "`n=== 7. SMOKE ===" -ForegroundColor Cyan
        & .\scripts\smoke.ps1
    }
    else {
        Write-Host "`n=== 7. SMOKE SKIPPED ===" -ForegroundColor Yellow
    }

    Write-Host "`n=== 8. GIT STATUS ===" -ForegroundColor Cyan
    git status --short
    git branch -vv

    Write-Host "`nAll checks passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
