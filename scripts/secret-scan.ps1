$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== SECRET SCAN ===" -ForegroundColor Cyan

    if (Test-Path "scripts\secret_scan.py") {
        python .\scripts\secret_scan.py

        if ($LASTEXITCODE -ne 0) {
            throw "Secret scan failed"
        }

        Write-Host "`nSecret scan passed." -ForegroundColor Green
    }
    else {
        Write-Host "scripts\secret_scan.py not found. Secret scan skipped." -ForegroundColor Yellow
    }
}
finally {
    Pop-Location
}
