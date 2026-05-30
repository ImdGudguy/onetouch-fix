using IntelliFix.Core;

namespace IntelliFix.Service.Collectors;

/// <summary>Gathers static facts about the host machine.</summary>
public sealed class DeviceInfoCollector
{
    public DeviceInfo Collect(string deviceId)
    {
        var info = new DeviceInfo
        {
            DeviceId = deviceId,
            Hostname = Environment.MachineName,
            ProcessorCores = Environment.ProcessorCount,
            Username = SafeUser(),
        };

        try
        {
            foreach (var os in WmiHelper.Query("SELECT Caption FROM Win32_OperatingSystem"))
            {
                info.OsVersion = WmiHelper.Get<string>(os, "Caption")?.Trim() ?? "Windows";
                break;
            }
        }
        catch { info.OsVersion = "Windows"; }

        try
        {
            foreach (var cpu in WmiHelper.Query("SELECT Name FROM Win32_Processor"))
            {
                info.ProcessorName = WmiHelper.Get<string>(cpu, "Name")?.Trim() ?? "";
                break;
            }
        }
        catch { }

        try
        {
            foreach (var cs in WmiHelper.Query("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem"))
            {
                var bytes = WmiHelper.Get<ulong>(cs, "TotalPhysicalMemory");
                info.TotalRamGb = (int)Math.Round(bytes / 1024.0 / 1024.0 / 1024.0);
                break;
            }
        }
        catch { }

        try
        {
            var sys = Path.GetPathRoot(Environment.SystemDirectory) ?? "C:\\";
            var drive = new DriveInfo(sys);
            info.TotalDiskGb = (int)Math.Round(drive.TotalSize / 1024.0 / 1024.0 / 1024.0);
        }
        catch { }

        return info;
    }

    private static string SafeUser()
    {
        try
        {
            foreach (var cs in WmiHelper.Query("SELECT UserName FROM Win32_ComputerSystem"))
            {
                var u = WmiHelper.Get<string>(cs, "UserName");
                if (!string.IsNullOrWhiteSpace(u)) return u!;
            }
        }
        catch { }
        return Environment.UserName;
    }
}
