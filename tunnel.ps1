# Exposes the local IntelliFix web app on a public HTTPS URL via a Cloudflare
# Quick Tunnel - the fastest way to run a real (non-localhost) demo over the
# internet. Copy the printed https://*.trycloudflare.com URL and install the
# agent against it:  .\agent\install-agent.ps1 -BackendUrl <that-url>
param([int]$Port = 3000)

$cf = Join-Path $env:TEMP 'cloudflared.exe'
if (-not (Test-Path $cf)) {
    Write-Host "Downloading cloudflared..." -ForegroundColor Cyan
    Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' `
        -OutFile $cf -UseBasicParsing
}

Write-Host "Opening public tunnel to http://localhost:$Port" -ForegroundColor Green
Write-Host "Use the https://*.trycloudflare.com URL below as the agent BackendUrl.`n" -ForegroundColor Yellow
& $cf tunnel --url "http://localhost:$Port"
