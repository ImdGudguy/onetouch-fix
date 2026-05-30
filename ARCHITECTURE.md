# Architecture

IntelliFix has three deployable units that talk over HTTP and a local named pipe.

```
┌────────────────────┐      same-origin /api       ┌─────────────────────────────────┐
│  Web dashboard     │ ──────────────────────────▶ │  Next.js route handlers (Node)  │
│  src/app/page.tsx  │ ◀────────────────────────── │  + SQLite store (node:sqlite)   │
│  - live tiles      │   GET dashboard, POST fix    │  data/intellifix.db             │
│  - confirm popup   │                              │                                 │
│  - AI chat widget  │                              │  /api/dashboard/*               │
└────────────────────┘                              │  /api/remediation/*             │
                                                     │  /api/agent/*   (token-auth)    │
                                                     │  /api/chat       (Claude)       │
                                                     └───────────────┬─────────────────┘
                                  push telemetry (5s) │   ▲ poll command queue
                                                       ▼   │ report result
                                          ┌─────────────────────────────────────┐
                                          │  IntelliFix.Agent (Windows Service) │
                                          │  runs as LocalSystem                │
                                          │  • DeviceInfo / Metrics collectors  │
                                          │  • EventLog collector               │
                                          │  • Compliance collector             │
                                          │  • RemediationEngine (allow-list)   │
                                          │  • ConsentBroker (named-pipe host)  │
                                          └───────────────┬─────────────────────┘
                                            named pipe    │  consent request / response
                                                          ▼
                                          ┌─────────────────────────────────────┐
                                          │  IntelliFix.Tray (WPF, user session)│
                                          │  • futuristic Yes/No consent popup  │
                                          │  • tray icon                        │
                                          └─────────────────────────────────────┘
```

## Web + API (`src/`)

- **`app/page.tsx`** — the entire single-page dashboard (sidebar, top bar, dashboard, devices, incidents, remediation, AI insights, analytics, compliance, settings) plus the chat widget and the confirm/progress popups. Polls `/api/dashboard/*` every 5s.
- **Route handlers** (`app/api/**/route.ts`) — Node runtime, `force-dynamic`:
  - `dashboard/devices|summary|fleet|compliance` — read the store, shape it for the UI.
  - `remediation/execute` — the web consent gate; on "Yes" it **queues** a command.
  - `remediation/history` — completed/failed results.
  - `agent/telemetry` (POST), `agent/[deviceId]/commands` (GET), `agent/result` (POST) — the agent channel, protected by `x-intellifix-token` when `INTELLIFIX_AGENT_TOKEN` is set.
  - `agent/download` — streams the packaged agent installer zip.
  - `chat` — Claude API with tool use (`get_device_status`, `list_remediations`, `queue_remediation`); falls back to a local telemetry-grounded responder if no API key.
- **`lib/db.ts`** — SQLite schema + helpers (`devices`, `commands`, `history`). One memoised connection.
- **`lib/map.ts`** — maps the agent's snapshot JSON into the shapes the dashboard expects + fleet aggregates.
- **`lib/auth.ts`** — agent-channel token check.
- **`lib/remediations.ts`** — the canonical remediation allow-list (kept in sync with the agent).

## Agent (`agent/`)

A .NET 8 solution with three projects:

- **`IntelliFix.Core`** — shared POCO models (DeviceInfo, SystemMetrics, EventLogEntry, ComplianceReport, Issue, TelemetrySnapshot, RemediationCommand/Result, ConsentRequest/Response).
- **`IntelliFix.Service`** — the Worker Service:
  - `Collectors/` — WMI/registry/Event-log/Drive/Ping based collectors.
  - `Analysis.cs` — derives issues + a health score from raw telemetry.
  - `Remediation/RemediationEngine.cs` — the **fixed allow-list** of executors (never arbitrary scripts).
  - `Ipc/ConsentBroker.cs` — hosts the named pipe, asks the tray for consent.
  - `BackendClient.cs` — pushes telemetry, pulls commands, reports results (sends the agent token).
  - `Worker.cs` — the loop: collect → push → pull commands → consent → execute → report.
- **`IntelliFix.Tray`** — WPF user-session app: connects to the pipe, shows `ConsentWindow` (the futuristic popup), relays the answer.

## Data flow

1. Agent builds a `TelemetrySnapshot` every `telemetryIntervalSeconds` (default 5) and POSTs it to `/api/agent/telemetry`.
2. The API upserts it into the `devices` table (snapshot JSON + `updatedAt`). "Online" = seen within 30s.
3. The dashboard polls `/api/dashboard/*`, which reshapes the latest snapshots.
4. Operator clicks **Execute Fix** → web confirm popup → `POST /api/remediation/execute` inserts a row into `commands` (`status=queued`).
5. Agent polls `GET /api/agent/{deviceId}/commands`, which returns queued commands and marks them `running`.
6. For consent-required actions the agent asks the tray (named pipe) → native popup → Yes/No.
7. Agent runs the executor, `POST /api/agent/result` → inserted into `history`, command marked `completed`/`failed`.
8. Dashboard's next poll shows the result in Remediation History.

## Data model (SQLite)

```sql
devices  (deviceId PK, snapshot TEXT, updatedAt, registeredAt)
commands (id PK, deviceId, actionType, status, createdAt)   -- queued|running|completed|failed
history  (id PK, deviceId, actionType, success, output, completedAt)
```

## Why these choices

- **`node:sqlite`** avoids a native build (`better-sqlite3` needs MSVC; Node 22 ships SQLite in-box).
- **Command queue + polling** means the agent needs no inbound ports and works behind NAT/firewalls.
- **Fixed allow-list** keyed by `actionType` means the server can never make the agent run arbitrary code — only named, reviewed remediations.
- **Service + tray split** is required because a Session-0 Windows service cannot draw UI; the tray runs in the interactive session.
