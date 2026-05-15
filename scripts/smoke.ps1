$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== SMOKE AUTH/RBAC/ADMIN/ORG ===" -ForegroundColor Cyan

    # Smoke пока запускаем с хоста, потому что он проверяет и backend, и frontend через опубликованные localhost-порты.
    # Остальные проверки уже идут внутри Docker-контейнеров.
    function Invoke-SmokeCheck {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Path
        )

        & python $Path

        if ($LASTEXITCODE -ne 0) {
            throw "Smoke failed: $Path"
        }
    }

    Invoke-SmokeCheck ".\scripts\smoke_auth_rbac.py"
    Invoke-SmokeCheck ".\scripts\smoke_org_cabinet_utils.py"
    Invoke-SmokeCheck ".\scripts\smoke_org_cabinet_page.py"
    Invoke-SmokeCheck ".\scripts\smoke_org_cabinet_route.py"
    Invoke-SmokeCheck ".\scripts\smoke_documents_page.py"
    Invoke-SmokeCheck ".\scripts\smoke_account_page.py"
    Invoke-SmokeCheck ".\scripts\smoke_public_pages.py"
    Invoke-SmokeCheck ".\scripts\smoke_auth_pages.py"

    Write-Host "`nSmoke passed." -ForegroundColor Green
}
finally {
    Pop-Location
}
