$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$FrontendDir = Join-Path $ProjectRoot "frontend"

Set-Location $FrontendDir

if (-not (Test-Path -LiteralPath (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    npm install
}

Write-Host "Building frontend into frontend\dist..."
npm run build
