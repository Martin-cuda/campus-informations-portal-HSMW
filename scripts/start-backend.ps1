$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvPip = Join-Path $BackendDir ".venv\Scripts\pip.exe"
$Requirements = Join-Path $ProjectRoot "requirements.txt"

Set-Location $BackendDir

if (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-Host "Creating backend virtual environment..."
    py -m venv .venv
    & $VenvPython -m pip install --upgrade pip
    & $VenvPip install -r $Requirements
}

Write-Host "Starting FastAPI backend on http://127.0.0.1:8000"
& $VenvPython -m uvicorn main:app --host 127.0.0.1 --port 8000
