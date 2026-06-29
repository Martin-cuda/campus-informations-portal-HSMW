$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendScript = Join-Path $ProjectRoot "scripts\start-backend.ps1"
$FrontendScript = Join-Path $ProjectRoot "scripts\start-frontend-dev.ps1"
$BackendOut = Join-Path $ProjectRoot "backend\backend-run.out.log"
$BackendErr = Join-Path $ProjectRoot "backend\backend-run.err.log"
$FrontendOut = Join-Path $ProjectRoot "frontend\frontend-run.out.log"
$FrontendErr = Join-Path $ProjectRoot "frontend\frontend-run.err.log"

Write-Host "Starting Cloudflare service..."
$service = Get-Service cloudflared -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -ne "Running") {
        Start-Service cloudflared
    }
    Write-Host "Cloudflare service is running."
} else {
    Write-Host "Cloudflare service was not found. Install/run your named tunnel first."
}

Write-Host "Stopping old local dev servers on ports 8000 and 5173..."
foreach ($port in 8000, 5173) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -eq "Listen" } |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Start-Sleep -Seconds 2

Write-Host "Starting backend..."
Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $BackendScript) `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput $BackendOut `
    -RedirectStandardError $BackendErr `
    -WindowStyle Hidden

Start-Sleep -Seconds 8

Write-Host "Warming up backend caches..."
foreach ($url in @(
    "http://127.0.0.1:8000/api/news/?limit=20",
    "http://127.0.0.1:8000/api/mensa/heute",
    "http://127.0.0.1:8000/api/contacts/count"
)) {
    try {
        Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20 | Out-Null
    } catch {
        Write-Host "Warmup skipped for $url"
    }
}

Write-Host "Starting frontend..."
Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $FrontendScript) `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput $FrontendOut `
    -RedirectStandardError $FrontendErr `
    -WindowStyle Hidden

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Local services:"
Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object LocalAddress, LocalPort, State, OwningProcess |
    Format-Table

Write-Host ""
Write-Host "Open your custom domain:"
Write-Host "https://definitvnichtcheck24.xyz"
Write-Host ""
Write-Host "Logs:"
Write-Host $BackendErr
Write-Host $FrontendOut
