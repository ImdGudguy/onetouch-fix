# Removes the IntelliFix Agent service, tray autostart and files. Elevates if needed.
$ErrorActionPreference = 'SilentlyContinue'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

& sc.exe stop   IntelliFixAgent *> $null
& sc.exe delete IntelliFixAgent *> $null
Get-Process -Name 'IntelliFix.Tray' -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -Name 'IntelliFixTray' -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $env:ProgramFiles 'IntelliFix') -ErrorAction SilentlyContinue
Write-Host "IntelliFix Agent uninstalled. (Config/device id retained in ProgramData\IntelliFix.)" -ForegroundColor Green
