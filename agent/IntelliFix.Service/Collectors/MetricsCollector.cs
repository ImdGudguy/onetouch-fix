using System.Diagnostics;
using System.Net.NetworkInformation;
using IntelliFix.Core;

namespace IntelliFix.Service.Collectors;

/// <summary>Samples live CPU / RAM / Disk / Network utilisation.</summary>
public sealed class MetricsCollector
{
    public SystemMetrics Collect()
    {
        return new SystemMetrics
        {
            Cpu = Math.Round(CpuPercent(), 1),
            Ram = Math.Round(RamPercent(), 1),
            Disk = Math.Round(DiskPercent(), 1),
            Network = Math.Round(NetworkLatencyMs(), 0),
            ActiveProcesses = SafeProcessCount(),
            Timestamp = DateTime.UtcNow,
        };
    }

    private static double CpuPercent()
    {
        try
        {
            double total = 0; int n = 0;
            foreach (var p in WmiHelper.Query("SELECT LoadPercentage FROM Win32_Processor"))
            {
                total += WmiHelper.Get<uint>(p, "LoadPercentage");
                n++;
            }
            return n > 0 ? total / n : 0;
        }
        catch { return 0; }
    }

    private static double RamPercent()
    {
        try
        {
            foreach (var os in WmiHelper.Query("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem"))
            {
                double totalKb = WmiHelper.Get<ulong>(os, "TotalVisibleMemorySize");
                double freeKb = WmiHelper.Get<ulong>(os, "FreePhysicalMemory");
                if (totalKb > 0) return (totalKb - freeKb) / totalKb * 100.0;
            }
        }
        catch { }
        return 0;
    }

    private static double DiskPercent()
    {
        try
        {
            var sys = Path.GetPathRoot(Environment.SystemDirectory) ?? "C:\\";
            var d = new DriveInfo(sys);
            if (d.TotalSize > 0)
                return (double)(d.TotalSize - d.AvailableFreeSpace) / d.TotalSize * 100.0;
        }
        catch { }
        return 0;
    }

    private static double NetworkLatencyMs()
    {
        try
        {
            using var ping = new Ping();
            var reply = ping.Send("1.1.1.1", 1000);
            if (reply is { Status: IPStatus.Success }) return reply.RoundtripTime;
        }
        catch { }
        return 0;
    }

    private static int SafeProcessCount()
    {
        try { return Process.GetProcesses().Length; }
        catch { return 0; }
    }
}
