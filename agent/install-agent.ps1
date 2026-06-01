# Installs the IntelliFix Agent as a Windows Service (LocalSystem) and registers
# the consent tray app to run at logon. Re-launches itself elevated if needed.
#
#   .\install-agent.ps1 -BackendUrl https://intellifix.example.com
#
param(
    [string]$BackendUrl = 'http://localhost:3000',
    [string]$AgentToken = '',
    [string]$EnrollToken = ''
)
$ErrorActionPreference = 'Stop'

# --- elevate (the agent MUST run with administrative rights to remediate) ---
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Elevation required - relaunching as administrator..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -BackendUrl `"$BackendUrl`" -AgentToken `"$AgentToken`" -EnrollToken `"$EnrollToken`""
    exit
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
# Exes may sit beside this script (downloaded bundle) or under dist\agent (local build).
if (Test-Path (Join-Path $root 'IntelliFix.Agent.exe')) {
    $src = $root
} elseif (Test-Path (Join-Path $root 'dist\agent\IntelliFix.Agent.exe')) {
    $src = Join-Path $root 'dist\agent'
} else {
    throw "IntelliFix.Agent.exe not found. Run .\build-agent.ps1 first, or run this script from the extracted agent bundle."
}

$dest = Join-Path $env:ProgramFiles 'IntelliFix'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$srcFull  = (Resolve-Path $src).Path.TrimEnd('\')
$destFull = (Resolve-Path $dest).Path.TrimEnd('\')
if ($srcFull -ieq $destFull) {
    Write-Host "Agent files already in $dest." -ForegroundColor Green
} else {
    Copy-Item "$src\*" $dest -Recurse -Force
    Write-Host "Copied agent to $dest" -ForegroundColor Green
}

# --- config (preserve existing device id) ---
$cfgDir  = Join-Path $env:ProgramData 'IntelliFix'
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfgPath = Join-Path $cfgDir 'agent.json'
$deviceId = if (Test-Path $cfgPath) { (Get-Content $cfgPath -Raw | ConvertFrom-Json).deviceId } else { [guid]::NewGuid().ToString() }
[ordered]@{
    deviceId = $deviceId
    backendUrl = $BackendUrl
    telemetryIntervalSeconds = 5
    agentToken = $AgentToken
    enrollToken = $EnrollToken
    deviceToken = ''
} | ConvertTo-Json | Set-Content -Path $cfgPath -Encoding utf8
Write-Host "Backend URL set to $BackendUrl (device $deviceId)" -ForegroundColor Green

# --- (re)create the service ---
& sc.exe stop   IntelliFixAgent  *> $null
& sc.exe delete IntelliFixAgent  *> $null
Start-Sleep -Seconds 1
New-Service -Name 'IntelliFixAgent' -DisplayName 'IntelliFix Agent' `
    -Description 'IntelliFix endpoint intelligence, telemetry and autonomous remediation agent.' `
    -BinaryPathName "`"$dest\IntelliFix.Agent.exe`"" -StartupType Automatic | Out-Null
# Run with full administrative rights (LocalSystem) so remediations can execute,
# and auto-restart on failure.
& sc.exe config IntelliFixAgent obj= LocalSystem *> $null
& sc.exe failure IntelliFixAgent reset= 86400 actions= restart/5000/restart/5000/restart/5000 *> $null
Start-Service IntelliFixAgent
Write-Host "Service 'IntelliFixAgent' installed (LocalSystem) and started." -ForegroundColor Green

# --- consent tray: run for all users at logon, and launch now ---
$runKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'
Set-ItemProperty -Path $runKey -Name 'IntelliFixTray' -Value "`"$dest\IntelliFix.Tray.exe`""
Start-Process "$dest\IntelliFix.Tray.exe"
Write-Host "Consent tray registered at logon and started." -ForegroundColor Green

Write-Host "`nIntelliFix Agent installation complete." -ForegroundColor Cyan
