namespace IntelliFix.Core;

/// <summary>Static information about the device the agent runs on.</summary>
public sealed class DeviceInfo
{
    public string DeviceId { get; set; } = "";
    public string Hostname { get; set; } = "";
    public string? Username { get; set; }
    public string OsVersion { get; set; } = "";
    public string ProcessorName { get; set; } = "";
    public int ProcessorCores { get; set; }
    public int TotalRamGb { get; set; }
    public int TotalDiskGb { get; set; }
}

/// <summary>Point-in-time resource utilisation.</summary>
public sealed class SystemMetrics
{
    public double Cpu { get; set; }
    public double Ram { get; set; }
    public double Disk { get; set; }
    public double Network { get; set; }   // latency in ms
    public int ActiveProcesses { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>A single Windows event log record of interest.</summary>
public sealed class EventLogEntry
{
    public string Log { get; set; } = "";          // System / Application
    public string Level { get; set; } = "";         // Error / Warning / Critical
    public string Source { get; set; } = "";
    public int EventId { get; set; }
    public string Message { get; set; } = "";
    public DateTime TimeCreated { get; set; }
}

public enum ControlStatus { Pass, Fail, Warning, Unknown }

/// <summary>One compliance control result.</summary>
public sealed class ComplianceControl
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string Standard { get; set; } = "";
    public ControlStatus Status { get; set; } = ControlStatus.Unknown;
    public string Detail { get; set; } = "";
}

public sealed class ComplianceReport
{
    public int Score { get; set; }
    public List<ComplianceControl> Controls { get; set; } = new();
}

public enum IssueSeverity { Low, Medium, High, Critical }

/// <summary>An issue derived from metrics / events / compliance.</summary>
public sealed class Issue
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public IssueSeverity Severity { get; set; } = IssueSeverity.Medium;
    public int Confidence { get; set; } = 80;
    public string Category { get; set; } = "System";
    public string DetectedBy { get; set; } = "IntelliFix Agent";
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    public string? RecommendedActionType { get; set; }
}

/// <summary>The full telemetry payload pushed to the backend each cycle.</summary>
public sealed class TelemetrySnapshot
{
    public DeviceInfo Device { get; set; } = new();
    public SystemMetrics Metrics { get; set; } = new();
    public List<EventLogEntry> RecentEvents { get; set; } = new();
    public ComplianceReport Compliance { get; set; } = new();
    public List<Issue> Issues { get; set; } = new();
    public int HealthScore { get; set; }
    public int TrustScore { get; set; } = 100;
    public bool IsOnline { get; set; } = true;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>A remediation command issued by the backend for the agent to run.</summary>
public sealed class RemediationCommand
{
    public string Id { get; set; } = "";
    public string ActionType { get; set; } = "";
    public string Status { get; set; } = "queued"; // queued | running | completed | failed | denied
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class RemediationResult
{
    public string CommandId { get; set; } = "";
    public string ActionType { get; set; } = "";
    public bool Success { get; set; }
    public string Output { get; set; } = "";
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Consent request sent from the service to the user-session tray app.</summary>
public sealed class ConsentRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ActionType { get; set; } = "";
    public string Label { get; set; } = "";
    public string Description { get; set; } = "";
    public int Confidence { get; set; } = 90;
    public string Duration { get; set; } = "30s";
    public int SuccessRate { get; set; } = 95;
}

/// <summary>The user's answer to a <see cref="ConsentRequest"/>.</summary>
public sealed class ConsentResponse
{
    public string Id { get; set; } = "";
    public bool Approved { get; set; }
}

/// <summary>Metadata describing a single remediation the agent can perform.</summary>
public sealed class RemediationDescriptor
{
    public string ActionType { get; set; } = "";
    public string Label { get; set; } = "";
    public string Description { get; set; } = "";
    public bool RequiresConsent { get; set; } = true;
    public int Confidence { get; set; } = 90;
    public string Duration { get; set; } = "30s";
    public int SuccessRate { get; set; } = 95;
}
