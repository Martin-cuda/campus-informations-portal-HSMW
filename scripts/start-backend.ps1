$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvDir = Join-Path $BackendDir "venv"
if (-not (Test-Path -LiteralPath (Join-Path $VenvDir "Scripts\python.exe"))) {
    $VenvDir = Join-Path $BackendDir ".venv"
}
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"
$Requirements = Join-Path $ProjectRoot "requirements.txt"

Set-Location $BackendDir

if (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-Host "Creating backend virtual environment..."
    py -m venv $VenvDir
    & $VenvPython -m pip install --upgrade pip
}

Write-Host "Installing/updating backend dependencies..."
& $VenvPip install -r $Requirements

Write-Host "Starting FastAPI backend on http://127.0.0.1:8000"
& $VenvPython -m uvicorn main:app --host 127.0.0.1 --port 8000
