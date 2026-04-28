$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== FRONTEND BUILD ===" -ForegroundColor Cyan
    docker compose exec -T frontend npm run build

    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed"
    }

    Write-Host "`nFrontend build passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
