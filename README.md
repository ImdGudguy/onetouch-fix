# IntelliFix AI — OneTouch-Fix

> Enterprise Device Intelligence & Autonomous Remediation Platform

IntelliFix is a real, working endpoint-management platform: a futuristic web dashboard, a backend API, and a **Windows agent** that collects live telemetry / Event Viewer data / compliance posture from a PC and performs **consent-gated** remediations on it.

![status](https://img.shields.io/badge/status-active-00e5ff) ![stack](https://img.shields.io/badge/web-Next.js%2015-blue) ![agent](https://img.shields.io/badge/agent-.NET%208-purple)

---

## What it does

- **Live telemetry** — CPU / RAM / Disk / network, process count, refreshed every few seconds.
- **Event Viewer ingestion** — recent Critical / Error / Warning records from the System & Application logs.
- **Compliance scanning** — Defender, real-time protection, firewall, UAC, Secure Boot, BitLocker, Windows Update, screen-lock — scored against CIS / NIST / ISO27001 / SOC2.
- **Autonomous remediation** — a fixed allow-list of 12 named fixes (disk cleanup, DNS flush, spooler/service restart, Wi-Fi reset, memory optimise, Teams/Outlook cache, Chrome restart, reboot…). Every fix is **consent-gated**: a confirm popup on the web *and* a futuristic Yes/No popup on the device.
- **AI assistant** — an in-app chat powered by the Claude API. It's grounded in the live telemetry and can **queue remediations on your behalf** via tool use (still subject to on-device consent).

## Architecture (one paragraph)

A **Next.js** app serves the dashboard and a set of API route handlers backed by **SQLite** (`node:sqlite`, no native build). A **.NET 8 Windows Service** (`IntelliFix.Agent`) collects data and pushes telemetry to the API every few seconds, and polls a command queue for remediations to run. A small **WPF tray app** (`IntelliFix.Tray`) runs in the user session and shows the native consent popup, talking to the service over a secured named pipe. See [ARCHITECTURE.md](ARCHITECTURE.md).

```
 Web dashboard ──HTTP──▶ Next.js API + SQLite ◀──HTTP── .NET Agent (Windows Service, LocalSystem)
   (page.tsx)            /api/dashboard/*                 ├─ collectors (metrics/events/compliance)
   confirm popup         /api/agent/*  (token-auth)       ├─ remediation engine (fixed allow-list)
                         /api/remediation/*                └─ named pipe ─▶ WPF Tray (consent popup)
```

## Quick start (local, single PC)

Prereqs: **Node 22+**, and for the agent **.NET 8 SDK** (only to build it).

```bash
cp .env.example .env.local          # set ANTHROPIC_API_KEY for the AI chat (optional)
npm install
npm run dev                         # http://localhost:3000
```
Build & install the agent (PowerShell, as admin):
```powershell
.\agent\build-agent.ps1                                   # self-contained exes + installer zip
.\agent\install-agent.ps1 -BackendUrl http://localhost:3000   # auto-elevates; installs service + tray
```
Within seconds the dashboard shows your real device. Click **Execute Fix** on any module → confirm → the agent runs it.

## Real-time / non-localhost demo

LAN, public HTTPS tunnel, or Docker — all covered in **[DEPLOY.md](DEPLOY.md)**. TL;DR:
```powershell
npm run start:lan          # bind 0.0.0.0
.\tunnel.ps1               # public https URL via Cloudflare
.\agent\install-agent.ps1 -BackendUrl <that-url> -AgentToken <secret>
```
Or `docker compose up -d --build`.

## Documentation

| Doc | What's inside |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, data flow, API surface, data model |
| [AGENT.md](AGENT.md) | Building, installing, configuring, and running the Windows agent |
| [REMEDIATIONS.md](REMEDIATIONS.md) | Every remediation, what it does, admin needs, reliability |
| [SECURITY.md](SECURITY.md) | Threat model, agent auth, consent model, hardening checklist |
| [DEPLOY.md](DEPLOY.md) | LAN / tunnel / Docker / cloud deployment |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, conventions, how to add a remediation |
| [.env.example](.env.example) | Every configuration variable (nothing is hardcoded) |

## Tech stack

- **Web:** Next.js 15 (App Router), TypeScript, Tailwind, Framer Motion, Recharts
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) with tool use + prompt caching
- **Backend store:** SQLite via Node 22 built-in `node:sqlite`
- **Agent:** .NET 8 Worker Service + WPF consent tray (self-contained single-file exes)

## License

[MIT](LICENSE) © Naveen Singh
