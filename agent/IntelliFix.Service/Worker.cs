using System.Text.Json;
using IntelliFix.Core;
using IntelliFix.Service.Ipc;
using IntelliFix.Service.Remediation;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace IntelliFix.Service;

/// <summary>
/// Core agent loop: collect telemetry, push it to the backend, pull queued
/// remediation commands, execute them and report results.
/// </summary>
public sealed class Worker : BackgroundService
{
    private readonly ILogger<Worker> _log;
    private readonly AgentConfig _config;
    private readonly SnapshotBuilder _snapshots;
    private readonly RemediationEngine _remediation;
    private readonly BackendClient _backend;
    private readonly ConsentBroker _consent;

    public Worker(ILogger<Worker> log, AgentConfig config, SnapshotBuilder snapshots,
                  RemediationEngine remediation, BackendClient backend, ConsentBroker consent)
    {
        _log = log;
        _config = config;
        _snapshots = snapshots;
        _remediation = remediation;
        _backend = backend;
        _consent = consent;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _consent.Start();
        _log.LogInformation("IntelliFix Agent started. Device {DeviceId}, backend {Url}", _config.DeviceId, _config.BackendUrl);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. Collect + persist a local snapshot.
                var snapshot = _snapshots.Build(_config);
                try { File.WriteAllText(AgentConfig.SnapshotPath, JsonSerializer.Serialize(snapshot, Json.Options)); } catch { }

                // 2. Push telemetry to the backend.
                bool pushed = await _backend.PushTelemetryAsync(snapshot, stoppingToken);
                _log.LogInformation("Telemetry: CPU {Cpu}% RAM {Ram}% Disk {Disk}% | health {Health} | {Issues} issues | pushed={Pushed}",
                    snapshot.Metrics.Cpu, snapshot.Metrics.Ram, snapshot.Metrics.Disk, snapshot.HealthScore, snapshot.Issues.Count, pushed);

                // 3. Pull and run any queued remediation commands.
                //    Consent is captured on the web before a command is queued; the
                //    on-PC native consent popup is layered in via the tray companion.
                var commands = await _backend.FetchCommandsAsync(stoppingToken);
                foreach (var cmd in commands)
                {
                    var descriptor = RemediationEngine.Catalog.FirstOrDefault(d => d.ActionType == cmd.ActionType);
                    if (descriptor is null)
                    {
                        _log.LogWarning("Skipping unknown action {Action}", cmd.ActionType);
                        continue;
                    }

                    // Native on-PC consent (in addition to the web approval that queued this).
                    if (descriptor.RequiresConsent)
                    {
                        bool approved = await _consent.RequestConsentAsync(descriptor, TimeSpan.FromSeconds(60), stoppingToken);
                        if (!approved)
                        {
                            _log.LogInformation("User denied consent for {Action}", cmd.ActionType);
                            await _backend.ReportResultAsync(new RemediationResult
                            {
                                CommandId = cmd.Id, ActionType = cmd.ActionType, Success = false,
                                Output = "Denied by user at the device.", CompletedAt = DateTime.UtcNow,
                            }, stoppingToken);
                            continue;
                        }
                    }

                    _log.LogInformation("Executing remediation {Action} ({Id})", cmd.ActionType, cmd.Id);
                    var result = _remediation.Execute(cmd.ActionType, cmd.Id);
                    await _backend.ReportResultAsync(result, stoppingToken);
                    _log.LogInformation("Remediation {Action} -> success={Success}: {Output}", cmd.ActionType, result.Success, result.Output);
                }
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Agent cycle failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Max(2, _config.TelemetryIntervalSeconds)), stoppingToken);
        }
    }
}
