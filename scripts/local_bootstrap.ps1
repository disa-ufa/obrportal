param(
    [switch]$ResetVolumes,
    [switch]$NoBuild,
    [switch]$SkipSmoke,
    [switch]$WithDemoLearning
)

$ErrorActionPreference = "Stop"

# Disable Docker Compose Bake for stable Docker Desktop builds on Windows.
# Some Compose/Desktop versions fail with: failed to execute bake: read |0: file already closed.
$env:COMPOSE_BAKE = "false"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Compose {
    param([string[]]$ComposeArgs)

    & docker compose @ComposeArgs

    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($ComposeArgs -join ' ')"
    }
}

function Invoke-HostPython {
    param([string[]]$PythonArgs)

    & python @PythonArgs

    if ($LASTEXITCODE -ne 0) {
        throw "python failed: $($PythonArgs -join ' ')"
    }
}

function Ensure-EnvFile {
    param(
        [string]$ProjectRoot,
        [string]$EnvPath,
        [string]$EnvExamplePath
    )

    if (-not (Test-Path $EnvPath)) {
        if (-not (Test-Path $EnvExamplePath)) {
            throw ".env.example not found: $EnvExamplePath"
        }

        Copy-Item $EnvExamplePath $EnvPath
        Write-Host "Created .env from .env.example"
    }

    $defaults = [ordered]@{
        "SEED_ADMIN_EMAIL"        = "admin@obrportal.local"
        "SEED_ADMIN_PASSWORD"     = "Admin123Local2026!"
        "SEED_DEMO_EMAIL"         = "learner@obrportal.local"
        "SEED_DEMO_PASSWORD"      = "Learner123Local2026!"
        "SEED_DEMO_ROLE"          = "learner_fl"

        "SEED_ORG_INN"            = "0278000001"
        "SEED_ORG_KPP"            = "027801001"
        "SEED_ORG_OGRN"           = "1020200000001"
        "SEED_ORG_NAME"           = "GBOU RCDO"
        "SEED_ORG_LEGAL_ADDRESS"  = "Republic of Bashkortostan, Ufa"
        "SEED_ORG_ACTUAL_ADDRESS" = "Republic of Bashkortostan, Ufa"

        "SMOKE_BASE_URL"          = "http://localhost:8000"
        "SMOKE_FRONTEND_BASE_URL" = "http://localhost:5173"
        "SMOKE_ADMIN_EMAIL"       = "admin@obrportal.local"
        "SMOKE_ADMIN_PASSWORD"    = "Admin123Local2026!"
        "SMOKE_LEARNER_EMAIL"     = "learner@obrportal.local"
        "SMOKE_LEARNER_PASSWORD"  = "Learner123Local2026!"
    }

    $content = Get-Content $EnvPath -Raw

    foreach ($key in $defaults.Keys) {
        $value = $defaults[$key]

        if ($content -match "(?m)^$key=") {
            $content = [regex]::Replace($content, "(?m)^$key=.*$", "$key=$value")
        } else {
            $content += "`n$key=$value"
        }
    }

    Set-Content -Path $EnvPath -Value $content -Encoding UTF8
}

function Import-EnvFile {
    param([string]$EnvPath)

    foreach ($line in Get-Content $EnvPath) {
        $trimmed = $line.Trim()

        if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")

        if ($separatorIndex -le 0) {
            continue
        }

        $name = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Wait-HttpOk {
    param(
        [string]$Url,
        [string]$Label,
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastError = $null

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 5

            if ($response.status -eq "ok") {
                Write-Host "$Label OK: $Url"
                return
            }

            $lastError = "Unexpected response status: $($response.status)"
        } catch {
            $lastError = $_.Exception.Message
        }

        Start-Sleep -Seconds 2
    }

    throw "$Label did not become ready: $Url. Last error: $lastError"
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Step "ObrPortal local bootstrap"
Write-Host "Project root: $ProjectRoot"

if (-not (Test-Path (Join-Path $ProjectRoot "docker-compose.yml"))) {
    throw "docker-compose.yml not found. Run this script from the ObrPortal repository."
}

if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
    throw ".git directory not found. Run this script from the ObrPortal repository."
}

Write-Step "Git status"
git branch -vv
git status --short

Write-Step "Prepare .env"
$EnvPath = Join-Path $ProjectRoot ".env"
$EnvExamplePath = Join-Path $ProjectRoot ".env.example"

Ensure-EnvFile -ProjectRoot $ProjectRoot -EnvPath $EnvPath -EnvExamplePath $EnvExamplePath
Import-EnvFile -EnvPath $EnvPath

Write-Host ".env ready"

Write-Step "Docker version"
docker version
docker compose version

if ($ResetVolumes) {
    Write-Step "Reset Docker volumes"
    Invoke-Compose @("down", "-v", "--remove-orphans")
}

Write-Step "Start Docker Compose"

if ($NoBuild) {
    Invoke-Compose @("up", "-d")
} else {
    Invoke-Compose @("up", "-d", "--build")
}

Invoke-Compose @("ps")

Write-Step "Wait for API"
Wait-HttpOk -Url "http://127.0.0.1:8000/health" -Label "health"
Wait-HttpOk -Url "http://127.0.0.1:8000/api/v1/ready" -Label "ready"

Write-Step "Apply migrations"
Invoke-Compose @("exec", "-T", "backend", "alembic", "upgrade", "head")

Write-Step "Run seeds"
Invoke-Compose @("exec", "-T", "backend", "python", "-m", "app.db.seed")
Invoke-Compose @("exec", "-T", "backend", "python", "-m", "app.db.seed_admin")
Invoke-Compose @("exec", "-T", "backend", "python", "-m", "app.db.seed_demo_user")
Invoke-Compose @("exec", "-T", "backend", "python", "-m", "app.db.seed_org")

if ($WithDemoLearning) {
    Write-Step "Run demo learning seed"
    Invoke-Compose @("exec", "-T", "backend", "python", "-m", "app.db.seed_demo_learning")
} else {
    Write-Host "Demo learning seed skipped. Use -WithDemoLearning to create Demo Course and Demo Group."
}

Write-Step "Verify API after seeds"
Wait-HttpOk -Url "http://127.0.0.1:8000/health" -Label "health"
Wait-HttpOk -Url "http://127.0.0.1:8000/api/v1/ready" -Label "ready"

if (-not $SkipSmoke) {
    Write-Step "Run smoke"
    Invoke-HostPython @(".\scripts\smoke_auth_rbac.py")
    Invoke-HostPython @(".\scripts\smoke_org_cabinet_utils.py")
    Invoke-HostPython @(".\scripts\smoke_org_cabinet_page.py")
    Invoke-HostPython @(".\scripts\smoke_org_cabinet_route.py")
    Invoke-HostPython @(".\scripts\smoke_documents_page.py")
    Invoke-HostPython @(".\scripts\smoke_account_page.py")
    Invoke-HostPython @(".\scripts\smoke_public_pages.py")
    Invoke-HostPython @(".\scripts\smoke_auth_pages.py")
} else {
    Write-Host "Smoke skipped"
}

Write-Step "Done"
Write-Host "Local bootstrap completed successfully." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend docs: http://localhost:8000/docs"
Write-Host "Admin login: admin@obrportal.local / Admin123Local2026!"

if ($WithDemoLearning) {
    Write-Host "Demo learning data: Demo Course / Demo Group"
}
