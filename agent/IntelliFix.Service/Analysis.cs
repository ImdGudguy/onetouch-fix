using IntelliFix.Core;

namespace IntelliFix.Service;

/// <summary>Turns raw telemetry into derived issues and an overall health score.</summary>
public static class Analysis
{
    public static List<Issue> DeriveIssues(SystemMetrics m, IReadOnlyList<EventLogEntry> events, ComplianceReport compliance)
    {
        var issues = new List<Issue>();

        if (m.Disk >= 90)
            issues.Add(new Issue { Title = "Disk Space Critical", Category = "Storage", Severity = IssueSeverity.Critical, Confidence = 96,
                Description = $"System drive at {m.Disk:0}% capacity. Free space to restore performance.", RecommendedActionType = "disk_cleanup" });
        else if (m.Disk >= 80)
            issues.Add(new Issue { Title = "Low Disk Space", Category = "Storage", Severity = IssueSeverity.High, Confidence = 88,
                Description = $"System drive at {m.Disk:0}% capacity.", RecommendedActionType = "disk_cleanup" });

        if (m.Ram >= 90)
            issues.Add(new Issue { Title = "High Memory Usage Detected", Category = "Memory", Severity = IssueSeverity.High, Confidence = 87,
                Description = $"Memory utilisation at {m.Ram:0}%. Optimising working sets is recommended.", RecommendedActionType = "memory_optimization" });

        if (m.Cpu >= 90)
            issues.Add(new Issue { Title = "High CPU Usage", Category = "Performance", Severity = IssueSeverity.High, Confidence = 85,
                Description = $"Processor load at {m.Cpu:0}%.", RecommendedActionType = null });

        foreach (var ctrl in compliance.Controls.Where(c => c.Status == ControlStatus.Fail &&
                     (c.Id is "CC001" or "CC002" or "CC003")))
        {
            issues.Add(new Issue { Title = $"Security control failing: {ctrl.Name}", Category = "Compliance", Severity = IssueSeverity.High, Confidence = 99,
                Description = $"{ctrl.Name} reported '{ctrl.Detail}'. This weakens endpoint security posture." });
        }

        int errorCount = events.Count(e => e.Level is "Error" or "Critical");
        if (errorCount >= 5)
            issues.Add(new Issue { Title = "Multiple System Errors Logged", Category = "System", Severity = IssueSeverity.Medium, Confidence = 72,
                Description = $"{errorCount} error/critical events in the last 6 hours across System and Application logs." });

        return issues;
    }

    public static int HealthScore(SystemMetrics m, IReadOnlyList<EventLogEntry> events, ComplianceReport compliance)
    {
        double score = 100;

        if (m.Cpu > 70) score -= (m.Cpu - 70) * 0.4;
        if (m.Ram > 70) score -= (m.Ram - 70) * 0.4;
        if (m.Disk > 75) score -= (m.Disk - 75) * 0.6;

        score -= compliance.Controls.Count(c => c.Status == ControlStatus.Fail) * 6;
        score -= compliance.Controls.Count(c => c.Status == ControlStatus.Warning) * 2;

        score -= events.Count(e => e.Level == "Critical") * 4;
        score -= events.Count(e => e.Level == "Error") * 1.5;

        return Math.Clamp((int)Math.Round(score), 0, 100);
    }
}
