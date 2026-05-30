# IntelliFix Agent

The agent is a .NET 8 solution under `agent/`:

```
agent/
├─ IntelliFix.Core/        shared models
├─ IntelliFix.Service/     Windows Service: collectors, remediation, consent broker  → IntelliFix.Agent.exe
├─ IntelliFix.Tray/        WPF consent popup (user session)                          → IntelliFix.Tray.exe
├─ build-agent.ps1         publish self-contained exes + installer zip
├─ install-agent.ps1       install service (LocalSystem) + tray autostart  (elevates)
└─ uninstall-agent.ps1     remove service, tray, files  (elevates)
```

## Prerequisites

- **.NET 8 SDK** to build (end users need nothing — the published exes are self-contained).
  - No admin? Install per-user: `iwr https://dot.net/v1/dotnet-install.ps1 -OutFile dotnet-install.ps1; .\dotnet-install.ps1 -Channel 8.0 -InstallDir $env:USERPROFILE\.dotnet`

## Build

```powershell
.\agent\build-agent.ps1
# → agent/dist/agent/IntelliFix.Agent.exe   (~67 MB, self-contained)
# → agent/dist/agent/IntelliFix.Tray.exe    (~146 MB, WPF self-contained)
# → agent/dist/IntelliFix-Agent.zip         (bundle served by /api/agent/download)
```

## Install (run as admin — the script auto-elevates)

```powershell
.\agent\install-agent.ps1 -BackendUrl http://localhost:3000
# production:
.\agent\install-agent.ps1 -BackendUrl https://intellifix.yourco.com -AgentToken <secret>
```
This copies the exes to `C:\Program Files\IntelliFix`, writes config to `C:\ProgramData\IntelliFix\agent.json`, creates the **`IntelliFixAgent`** service (LocalSystem, automatic start, auto-restart on failure), starts it, and registers the consent tray to launch at logon.

Uninstall: `.\agent\uninstall-agent.ps1`.

## Why it runs as administrator

The service is installed as **LocalSystem**, which has full administrative rights — required for service restarts, Wi-Fi reset, BitLocker status, system reboot, etc. The installer enforces elevation, so the agent always has the rights it needs to remediate. The consent **tray** intentionally runs as the normal user (it only needs to draw a window).

## Configuration (`C:\ProgramData\IntelliFix\agent.json`)

```json
{
  "deviceId": "auto-generated GUID (persisted)",
  "backendUrl": "http://localhost:3000",
  "telemetryIntervalSeconds": 5,
  "agentToken": ""
}
```
The installer writes this; you can also edit it and restart the service (`Restart-Service IntelliFixAgent`).

## Run without installing (dev / testing)

```powershell
$env:DOTNET_ROOT="$env:USERPROFILE\.dotnet"
# one-shot telemetry snapshot (prints JSON):
& "$env:USERPROFILE\.dotnet\dotnet.exe" run --project agent/IntelliFix.Service -- --collect-once
# run a single remediation:
& "$env:USERPROFILE\.dotnet\dotnet.exe" run --project agent/IntelliFix.Service -- --run-fix dns_flush
# list the allow-list:
& "$env:USERPROFILE\.dotnet\dotnet.exe" run --project agent/IntelliFix.Service -- --catalog
# run the full loop in console mode (pushes telemetry + polls commands):
& "$env:USERPROFILE\.dotnet\dotnet.exe" run --project agent/IntelliFix.Service
```

## Logs

As a service, logs go to the Windows **Application** event log (source `IntelliFixAgent`). In console mode they print to stdout.

## What it collects

See [ARCHITECTURE.md](ARCHITECTURE.md) and the `Collectors/` folder: device info (WMI), metrics (WMI + DriveInfo + ping), Event Viewer (last 6h of Critical/Error/Warning), and compliance (Defender/Firewall/UAC/Secure Boot/BitLocker/Update/screen-lock). Issues and a health score are derived in `Analysis.cs`.
