# Contributing

## Repo layout

```
src/                 Next.js app (dashboard + API route handlers + lib)
  app/page.tsx       the whole dashboard UI (single file, client component)
  app/api/**         route handlers (nodejs runtime)
  lib/               db (sqlite), map, auth, remediations catalog
agent/               .NET 8 agent solution (Service + Tray + Core)
*.md                 documentation
Dockerfile, docker-compose.yml, tunnel.ps1   deployment
```

## Web dev

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY for full chat
npm run dev                     # http://localhost:3000
```

- TypeScript throughout. Keep API routes `runtime = 'nodejs'` + `dynamic = 'force-dynamic'`.
- Don't run `npm run build` while `npm run dev` is running on the same checkout — it corrupts `.next`. Stop dev first.
- The dashboard reads `/api` on the same origin; don't hardcode hostnames. Anything configurable goes through env (`.env.example`).

## Agent dev

See [AGENT.md](AGENT.md). Build with `agent/build-agent.ps1`; quick-test with `--collect-once` / `--run-fix <id>` / `--catalog` (no service install needed).

## Adding a remediation

Keep three places in sync (the backend validates against the first, the agent against its own catalog):

1. `agent/IntelliFix.Service/Remediation/RemediationEngine.cs` — executor + `RemediationDescriptor`.
2. `src/lib/remediations.ts` — same `id`, `label`, `requiresConsent`.
3. `src/app/page.tsx` — (optional) a card in `remediationCards`.
4. `REMEDIATIONS.md` — document it.

## Conventions

- No hardcoded secrets — everything via env; update `.env.example` when adding a variable.
- Remediations are a **fixed allow-list**. Never add a "run arbitrary command/script" path.
- Match the surrounding code style; keep components/handlers small and focused.

## Commit / PR

- Branch off the default branch; open a PR with a clear description.
- Run `npm run build` (web) and `agent/build-agent.ps1` (agent) before requesting review.
