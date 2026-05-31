# IntelliFix — Deployment & Real-Time Demo Guide

IntelliFix has three parts:

1. **Web + API** — the Next.js dashboard and backend route handlers (`src/`), backed by SQLite (`data/intellifix.db`).
2. **Agent** — a .NET 8 Windows Service that collects telemetry / Event Viewer / compliance and runs remediations (`agent/IntelliFix.Service`).
3. **Consent Tray** — a WPF app in the user session that shows the futuristic Yes/No popup (`agent/IntelliFix.Tray`).

The web app reads the API from the **same origin** (`/api`), so it needs no extra config. The **agent** is pointed at the server with `install-agent.ps1 -BackendUrl <url>`.

---

## A. Local single-PC (dev)
```powershell
npm run dev                       # http://localhost:3000
# agent already defaults to http://localhost:3000
```

## B. LAN demo (other PCs on your network)
Run the server bound to all interfaces, then point agents at this machine's LAN IP.
```powershell
npm run build
npm run start:lan                 # binds 0.0.0.0:3000
# find your IP:  ipconfig  ->  e.g. 192.168.1.50
# on each device:
.\agent\build-agent.ps1
.\agent\install-agent.ps1 -BackendUrl http://192.168.1.50:3000
```

## C. Public internet demo (fastest, real HTTPS)
```powershell
npm run start:lan                 # or npm run dev
.\tunnel.ps1                      # prints https://<random>.trycloudflare.com
.\agent\install-agent.ps1 -BackendUrl https://<random>.trycloudflare.com
```

## D′. Netlify (recommended hosted path)
The app ships with `netlify.toml` + `@netlify/plugin-nextjs`. Persistence uses
**Netlify Blobs** automatically in the cloud (the store layer detects `NETLIFY`
and switches from local SQLite to Blobs — no DB to provision).

1. Push the repo to GitHub (already done) and **Import** it in Netlify.
2. Set environment variables (Site settings → Environment):
   - `SESSION_SECRET` (required) — `openssl rand -hex 32`
   - `INTELLIFIX_AGENT_TOKEN` (required for prod) — shared agent secret
   - `ANTHROPIC_API_KEY` (optional) — enables the Claude assistant
   - `RESEND_API_KEY` + `RESEND_FROM` (optional) — real reset emails
3. Deploy. Then point agents at the Netlify URL:
   `./agent/install-agent.ps1 -BackendUrl https://<your-site>.netlify.app -AgentToken <secret>`

First visit → cookie banner + "create the first admin account". The agent's
telemetry persists in Blobs, so live device data shows across function calls.

## D. Cloud / VM (durable enterprise host) — Docker
SQLite persists in a named volume; Node 22's built-in `node:sqlite` means **no native build**.
```bash
docker compose up -d --build      # serves on :3000
# put it behind your reverse proxy / domain, then:
#   install-agent.ps1 -BackendUrl https://intellifix.yourco.com
```
Any always-on Node 22+ host (VM, Render, Railway, Fly, a NAS) works the same way; just keep the `data/` directory on a persistent disk.

---

## Agent lifecycle (run as admin)
```powershell
.\agent\build-agent.ps1           # produces self-contained single-file exes (no .NET needed on target)
.\agent\install-agent.ps1 -BackendUrl <server-url>   # installs the service + consent tray (auto-elevates)
.\agent\uninstall-agent.ps1       # removes service, tray autostart, files
```

Running the service as **LocalSystem** unlocks the checks/fixes that need elevation
(BitLocker status, service restarts, Wi-Fi reset, etc.).

## How a fix flows end-to-end
1. Operator clicks **Execute Fix** in the dashboard → web confirm popup (consent #1) → `POST /api/remediation/execute` queues a command.
2. The agent polls `/api/agent/{deviceId}/commands`, and for consent-required actions asks the **tray** to show the on-PC futuristic Yes/No popup (consent #2).
3. On **Yes**, the agent runs the named remediation (fixed allow-list only), then `POST /api/agent/result` → it appears in **Remediation History**.

## Security notes
- The agent executes only a **fixed, named allow-list** of remediations — never arbitrary scripts from the server.
- For internet-facing deploys, terminate TLS at your proxy and add an auth token to the `/api/agent/*` routes before production use.
