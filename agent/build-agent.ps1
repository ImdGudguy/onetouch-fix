# Publishes the IntelliFix Agent (service) and Tray as self-contained,
# single-file win-x64 executables. End users need NO .NET installed.
$ErrorActionPreference = 'Stop'

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$dotnet = Join-Path $env:USERPROFILE '.dotnet\dotnet.exe'
if (-not (Test-Path $dotnet)) { $dotnet = 'dotnet' }

$dist = Join-Path $root 'dist\agent'
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }

Write-Host "Publishing service (IntelliFix.Agent.exe)..." -ForegroundColor Cyan
& $dotnet publish (Join-Path $root 'IntelliFix.Service\IntelliFix.Service.csproj') `
    -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true `
    -o $dist

Write-Host "Publishing tray (IntelliFix.Tray.exe)..." -ForegroundColor Cyan
& $dotnet publish (Join-Path $root 'IntelliFix.Tray\IntelliFix.Tray.csproj') `
    -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true `
    -o $dist

Write-Host "`nPublished to: $dist" -ForegroundColor Green
Get-ChildItem $dist -Filter *.exe | Select-Object Name, @{N='MB';E={[math]::Round($_.Length/1MB,1)}} | Format-Table -AutoSize

# Bundle exes + install scripts into a single downloadable zip (served by /api/agent/download).
Write-Host "Packaging installer bundle..." -ForegroundColor Cyan
$staging = Join-Path $root 'dist\bundle'
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Force -Path $staging | Out-Null
Copy-Item "$dist\*" $staging -Recurse -Force
foreach ($s in 'install-agent.ps1','uninstall-agent.ps1') {
    if (Test-Path (Join-Path $root $s)) { Copy-Item (Join-Path $root $s) $staging -Force }
}
$zip = Join-Path $root 'dist\IntelliFix-Agent.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path "$staging\*" -DestinationPath $zip -Force
Remove-Item -Recurse -Force $staging
Write-Host "Bundle: $zip" -ForegroundColor Green
