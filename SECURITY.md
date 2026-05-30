# Security

IntelliFix performs privileged actions on endpoints, so the trust model matters. This document describes the controls in place and the hardening required before any non-demo deployment.

## Trust model

| Component | Runs as | Trust |
|---|---|---|
| Web dashboard | Browser | Operator UI |
| Next.js API | Node process | Trusted server |
| Agent service | **LocalSystem** | Fully privileged on the endpoint |
| Consent tray | Logged-in user | Shows consent UI only |

## Controls in place

### 1. Fixed remediation allow-list (no arbitrary code)
The server can never make the agent run arbitrary commands. It can only enqueue an `actionType` from a **fixed, named allow-list** (`src/lib/remediations.ts` ⇄ `RemediationEngine.cs`). The agent re-validates every command against its own catalog before executing. There is no "run this script" path.

### 2. Two-layer consent for every sensitive fix
1. **Web confirm popup** — the operator must approve in the dashboard; only then is a command queued.
2. **On-device native popup** — for `RequiresConsent` actions the agent asks the WPF tray to show a Yes/No popup **on the actual PC** before executing. Denied or timed-out (60s) → the fix does not run and is reported as denied.

### 3. Agent-channel authentication
When `INTELLIFIX_AGENT_TOKEN` is set, every `/api/agent/*` request must present a matching `x-intellifix-token` header (constant-time compared). The installer writes the token into the agent config (`-AgentToken`). **Production deployments must set this token** — without it the agent channel is open (intended only for a trusted-localhost demo).

### 4. Named-pipe ACL
The consent pipe (`IntelliFixConsent`) is created with an explicit ACL granting LocalSystem full control and authenticated users read/write — so the user-session tray can connect to the SYSTEM-hosted pipe without exposing it more broadly.

### 5. No hardcoded secrets
All secrets come from the environment (`.env.example` documents every variable). `.gitignore` excludes `.env*`, the SQLite store, agent build output, and node_modules.

## Hardening checklist (before production / internet exposure)

- [ ] **Set `INTELLIFIX_AGENT_TOKEN`** (e.g. `openssl rand -hex 32`) and install agents with `-AgentToken`.
- [ ] **Terminate TLS** at a reverse proxy (nginx/Caddy/Cloud LB); never expose plain HTTP publicly.
- [ ] **Authenticate the dashboard** — add SSO/auth in front of the web app and the `remediation/execute` route. (Today the dashboard is unauthenticated; fine for a single-operator/LAN demo, not for production.)
- [ ] **Restrict `/api/agent/*`** to known device tokens; rotate tokens on offboarding.
- [ ] **Pin the backend URL** the agent talks to (HTTPS), and validate the cert.
- [ ] **Review the remediation allow-list** against your change-control policy; remove any you don't want operators triggering.
- [ ] **Log & monitor** remediation history; ship the `history` table to your SIEM.
- [ ] **Scope the agent account** — LocalSystem is required for some fixes; if your policy forbids it, run as a dedicated admin service account and accept that a few SYSTEM-only fixes degrade.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository, or email the maintainer. Do not file public issues for vulnerabilities.
