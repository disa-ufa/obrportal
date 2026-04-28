param(
    [string]$Path = "app/tests"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== BACKEND TESTS: $Path ===" -ForegroundColor Cyan
    docker compose exec -T backend pytest $Path -q

    if ($LASTEXITCODE -ne 0) {
        throw "Backend tests failed"
    }

    Write-Host "`nBackend tests passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
