$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== DOCKER COMPOSE UP ===" -ForegroundColor Cyan
    docker compose up -d

    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed"
    }

    Write-Host "`n=== DOCKER COMPOSE PS ===" -ForegroundColor Cyan
    docker compose ps

    Write-Host "`nDev services are running." -ForegroundColor Green
}
finally {
    Pop-Location
}
