# Remediations

The agent executes **only** the named actions in this allow-list — never arbitrary commands from the server. Each is keyed by `actionType`; the web side mirrors the list in `src/lib/remediations.ts`, the agent implements it in `agent/IntelliFix.Service/Remediation/RemediationEngine.cs`.

Legend — **Reliability**: ✅ works in user or service context · 🔐 needs admin/SYSTEM (i.e. the installed service) · ⚠️ best-effort / environment-dependent.

| actionType | What it actually does | Consent | Reliability |
|---|---|---|---|
| `temp_cleanup` | Deletes files in `%TEMP%` older than 7 days. | no | ✅ |
| `disk_cleanup` | Deletes old files from `%TEMP%` and `C:\Windows\Temp` (>1 day). | yes | ✅ user temp; 🔐 Windows\Temp needs admin |
| `dns_flush` | `ipconfig /flushdns`. | no | ✅ |
| `memory_optimization` | Calls `EmptyWorkingSet` on all accessible processes to trim RAM. | no | ✅ (trims what it can access; more under SYSTEM) |
| `print_spooler_restart` | Stops & starts the `Spooler` service. | yes | 🔐 |
| `windows_service_restart` | Restarts a problematic service (Spooler by default). | yes | 🔐 |
| `teams_cache_cleanup` | Clears cache for **classic** (`%AppData%\Microsoft\Teams`) and **new** Teams (`%LocalAppData%\Packages\MSTeams_8wekyb3d8bbwe\LocalCache`). | yes | ✅ (whichever exists) |
| `outlook_cache_cleanup` | Clears `…\Outlook\RoamCache` and `…\INetCache\Content.Outlook`. | yes | ✅ |
| `wifi_adapter_reset` | Detects the wireless adapter via WMI, then `netsh interface set interface … disabled/enabled`. | yes | 🔐 |
| `chrome_forced_restart` | Kills `chrome` processes, then relaunches Chrome from the first path it finds. | yes | ✅ |
| `file_association_repair` | Restarts `ShellHWDetection` to refresh the association/icon cache. | yes | 🔐 |
| `device_reboot` | `shutdown /r /t 60` (60-second scheduled reboot). | yes | 🔐 |

## How many "actually work"?

- **Run as the user (e.g. `--run-fix` while testing):** `temp_cleanup`, `dns_flush`, `memory_optimization`, `teams_cache_cleanup`, `outlook_cache_cleanup`, `chrome_forced_restart`, and the user-temp half of `disk_cleanup` work without elevation. Service/adapter/reboot actions need admin.
- **Run as the installed service (LocalSystem):** all 12 work, because the service has full administrative rights. This is why the agent is installed as a service (see [SECURITY.md](SECURITY.md) and [AGENT.md](AGENT.md)).

## Testing a single remediation

```powershell
# from a built agent (no service needed) — runs the named action and prints the result JSON
.\agent\dist\agent\IntelliFix.Agent.exe --run-fix dns_flush
.\agent\dist\agent\IntelliFix.Agent.exe --catalog        # list all known actions
```

## Adding a new remediation

1. Add an executor + a `RemediationDescriptor` entry in `RemediationEngine.cs` (set `RequiresConsent`).
2. Add the matching entry to `src/lib/remediations.ts` (same `id`, `requiresConsent`).
3. (Optional) add a card to the dashboard's `remediationCards` in `src/app/page.tsx`.
4. Document it in the table above.

Keep the three lists in sync — the backend validates every queued `actionType` against `src/lib/remediations.ts`, and the agent re-validates against its own catalog before executing.
