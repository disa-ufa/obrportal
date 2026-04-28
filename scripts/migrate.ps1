$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== APPLY BACKEND MIGRATIONS ===" -ForegroundColor Cyan
    docker compose exec -T backend alembic upgrade head

    if ($LASTEXITCODE -ne 0) {
        throw "Alembic migration failed"
    }

    Write-Host "`nMigrations applied." -ForegroundColor Green
}
finally {
    Pop-Location
}
