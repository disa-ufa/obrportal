$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== SMOKE AUTH/RBAC/ADMIN/ORG ===" -ForegroundColor Cyan

    # Smoke пока запускаем с хоста, потому что он проверяет и backend, и frontend через опубликованные localhost-порты.
    # Остальные проверки уже идут внутри Docker-контейнеров.
    python .\scripts\smoke_auth_rbac.py

    if ($LASTEXITCODE -ne 0) {
        throw "Smoke failed"
    }

    Write-Host "`nSmoke passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
