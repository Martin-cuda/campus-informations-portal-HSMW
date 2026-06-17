$ErrorActionPreference = "Stop"

Write-Host "Starting Cloudflare Quick Tunnel for Vite dev server..."
Write-Host "Keep this window open. Copy the trycloudflare.com URL it prints."
cloudflared tunnel --url http://localhost:5173
