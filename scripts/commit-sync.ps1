param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    Write-Host "`n=== 1. CURRENT STATUS ===" -ForegroundColor Cyan
    git status --short

    if (-not $SkipChecks) {
        Write-Host "`n=== 2. RUN FULL CHECKS ===" -ForegroundColor Cyan
        & .\scripts\check-all.ps1
    }
    else {
        Write-Host "`n=== 2. CHECKS SKIPPED ===" -ForegroundColor Yellow
    }

    Write-Host "`n=== 3. SECRET SCAN BEFORE COMMIT ===" -ForegroundColor Cyan
    & .\scripts\secret-scan.ps1

    Write-Host "`n=== 4. ADD CHANGES ===" -ForegroundColor Cyan
    git add .

    Write-Host "`n=== 5. STAGED DIFF ===" -ForegroundColor Cyan
    git diff --cached --stat

    $staged = git diff --cached --name-only
    if (-not $staged) {
        throw "No staged changes to commit"
    }

    Write-Host "`n=== 6. COMMIT ===" -ForegroundColor Cyan
    git commit -m $Message

    if ($LASTEXITCODE -ne 0) {
        throw "Commit failed"
    }

    Write-Host "`n=== 7. PUSH develop ===" -ForegroundColor Cyan
    git push origin develop

    if ($LASTEXITCODE -ne 0) {
        throw "Push develop failed"
    }

    Write-Host "`n=== 8. SYNC main ===" -ForegroundColor Cyan
    git switch main
    git merge --ff-only develop

    if ($LASTEXITCODE -ne 0) {
        throw "Merge develop into main failed"
    }

    git push origin main

    if ($LASTEXITCODE -ne 0) {
        throw "Push main failed"
    }

    Write-Host "`n=== 9. RETURN TO develop ===" -ForegroundColor Cyan
    git switch develop

    Write-Host "`n=== 10. VERIFY ===" -ForegroundColor Cyan
    git fetch --all --prune

    Write-Host "`ndevelop vs origin/develop:"
    git rev-list --left-right --count develop...origin/develop

    Write-Host "`nmain vs origin/main:"
    git rev-list --left-right --count main...origin/main

    Write-Host "`ndevelop vs main:"
    git rev-list --left-right --count develop...main

    Write-Host "`nSTATUS:"
    git status --short
    git branch -vv

    Write-Host "`nCommit and sync completed." -ForegroundColor Green
}
finally {
    Pop-Location
}
