using IntelliFix.Core;
using IntelliFix.Service.Collectors;

namespace IntelliFix.Service;

/// <summary>Composes a full <see cref="TelemetrySnapshot"/> from all collectors.</summary>
public sealed class SnapshotBuilder
{
    private readonly DeviceInfoCollector _device = new();
    private readonly MetricsCollector _metrics = new();
    private readonly EventLogCollector _events = new();
    private readonly ComplianceCollector _compliance = new();

    public TelemetrySnapshot Build(AgentConfig config)
    {
        var device = _device.Collect(config.DeviceId);
        var metrics = _metrics.Collect();
        var events = _events.Collect();
        var compliance = _compliance.Collect();
        var issues = Analysis.DeriveIssues(metrics, events, compliance);
        var health = Analysis.HealthScore(metrics, events, compliance);

        return new TelemetrySnapshot
        {
            Device = device,
            Metrics = metrics,
            RecentEvents = events,
            Compliance = compliance,
            Issues = issues,
            HealthScore = health,
            TrustScore = 100,
            IsOnline = true,
            Timestamp = DateTime.UtcNow,
        };
    }
}
