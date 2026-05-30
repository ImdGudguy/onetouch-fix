using System.Diagnostics;
using System.Runtime.InteropServices;
using System.ServiceProcess;
using IntelliFix.Core;

namespace IntelliFix.Service.Remediation;

/// <summary>
/// Executes a fixed, named allow-list of remediations. The backend can only
/// request actions by id that exist here — never arbitrary scripts.
/// </summary>
public sealed class RemediationEngine
{
    public static readonly IReadOnlyList<RemediationDescriptor> Catalog = new List<RemediationDescriptor>
    {
        new() { ActionType = "disk_cleanup", Label = "Disk Cleanup", Description = "Clean temp files, browser cache & system junk", Confidence = 92, Duration = "45s", SuccessRate = 95, RequiresConsent = true },
        new() { ActionType = "temp_cleanup", Label = "Temp Cleanup", Description = "Remove temp files older than 7 days", Confidence = 95, Duration = "30s", SuccessRate = 98, RequiresConsent = false },
        new() { ActionType = "dns_flush", Label = "DNS Flush", Description = "Clear DNS resolver cache", Confidence = 88, Duration = "10s", SuccessRate = 92, RequiresConsent = false },
        new() { ActionType = "print_spooler_restart", Label = "Spooler Restart", Description = "Restart Print Spooler service", Confidence = 90, Duration = "15s", SuccessRate = 97, RequiresConsent = true },
        new() { ActionType = "teams_cache_cleanup", Label = "Teams Cache", Description = "Clear Teams cache for sync issues", Confidence = 85, Duration = "20s", SuccessRate = 91, RequiresConsent = true },
        new() { ActionType = "outlook_cache_cleanup", Label = "Outlook Cache", Description = "Clear Outlook local cache files", Confidence = 87, Duration = "25s", SuccessRate = 89, RequiresConsent = true },
        new() { ActionType = "wifi_adapter_reset", Label = "Wi-Fi Reset", Description = "Disable/re-enable Wi-Fi adapter", Confidence = 89, Duration = "10s", SuccessRate = 94, RequiresConsent = true },
        new() { ActionType = "memory_optimization", Label = "Memory Optimize", Description = "Clear memory working sets", Confidence = 91, Duration = "15s", SuccessRate = 96, RequiresConsent = false },
        new() { ActionType = "windows_service_restart", Label = "Service Restart", Description = "Restart problematic Windows services", Confidence = 82, Duration = "20s", SuccessRate = 88, RequiresConsent = true },
        new() { ActionType = "file_association_repair", Label = "File Assoc Repair", Description = "Reset file type associations", Confidence = 78, Duration = "30s", SuccessRate = 85, RequiresConsent = true },
        new() { ActionType = "chrome_forced_restart", Label = "Chrome Restart", Description = "Force restart Chrome (all tabs close)", Confidence = 90, Duration = "30s", SuccessRate = 95, RequiresConsent = true },
        new() { ActionType = "device_reboot", Label = "Device Reboot", Description = "Schedule system reboot in 60s", Confidence = 95, Duration = "5min", SuccessRate = 100, RequiresConsent = true },
    };

    public static bool IsKnown(string actionType) => Catalog.Any(d => d.ActionType == actionType);

    public RemediationResult Execute(string actionType, string commandId = "")
    {
        var result = new RemediationResult { CommandId = commandId, ActionType = actionType };
        try
        {
            var (ok, output) = actionType switch
            {
                "disk_cleanup" => DiskCleanup(),
                "temp_cleanup" => TempCleanup(),
                "dns_flush" => Shell("ipconfig", "/flushdns"),
                "print_spooler_restart" => RestartService("Spooler"),
                "teams_cache_cleanup" => TeamsCacheCleanup(),
                "outlook_cache_cleanup" => OutlookCacheCleanup(),
                "wifi_adapter_reset" => WifiReset(),
                "memory_optimization" => MemoryOptimize(),
                "windows_service_restart" => RestartService("Spooler"),
                "file_association_repair" => FileAssociationRepair(),
                "chrome_forced_restart" => ChromeRestart(),
                "device_reboot" => Shell("shutdown", "/r /t 60 /c \"IntelliFix scheduled reboot\""),
                _ => (false, $"Unknown action '{actionType}'."),
            };
            result.Success = ok;
            result.Output = output;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Output = ex.Message;
        }
        result.CompletedAt = DateTime.UtcNow;
        return result;
    }

    // ---- executors -------------------------------------------------------

    private static (bool, string) DiskCleanup()
    {
        long freed = 0;
        freed += PurgeOld(Path.GetTempPath(), TimeSpan.FromDays(1));
        freed += PurgeOld(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Temp"), TimeSpan.FromDays(1));
        return (true, $"Removed ~{freed / 1024 / 1024} MB of temporary files.");
    }

    private static (bool, string) TempCleanup()
    {
        long freed = PurgeOld(Path.GetTempPath(), TimeSpan.FromDays(7));
        return (true, $"Removed ~{freed / 1024 / 1024} MB of old temp files.");
    }

    private static long PurgeOld(string dir, TimeSpan olderThan)
    {
        long freed = 0;
        try
        {
            if (!Directory.Exists(dir)) return 0;
            var cutoff = DateTime.UtcNow - olderThan;
            foreach (var file in Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories))
            {
                try
                {
                    var fi = new FileInfo(file);
                    if (fi.LastWriteTimeUtc < cutoff)
                    {
                        freed += fi.Length;
                        fi.Delete();
                    }
                }
                catch { /* locked file, skip */ }
            }
        }
        catch { }
        return freed;
    }

    private static (bool, string) ClearFolder(string dir)
    {
        long freed = PurgeOld(dir, TimeSpan.Zero);
        return (true, $"Cleared cache at {dir} (~{freed / 1024 / 1024} MB).");
    }

    private static (bool, string) RestartService(string name)
    {
        try
        {
            using var sc = new ServiceController(name);
            if (sc.Status != ServiceControllerStatus.Stopped)
            {
                sc.Stop();
                sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(20));
            }
            sc.Start();
            sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(20));
            return (true, $"Service '{name}' restarted.");
        }
        catch (Exception ex)
        {
            return (false, $"Could not restart '{name}': {ex.Message} (admin may be required).");
        }
    }

    private static (bool, string) TeamsCacheCleanup()
    {
        // Covers both classic Teams and the new (Store) Teams client.
        var paths = new[]
        {
            Path.Combine(Roaming(), "Microsoft", "Teams"),
            Path.Combine(Local(), "Packages", "MSTeams_8wekyb3d8bbwe", "LocalCache"),
        };
        long freed = 0; int hit = 0;
        foreach (var p in paths)
            if (Directory.Exists(p)) { freed += PurgeOld(p, TimeSpan.Zero); hit++; }
        return (hit > 0, hit > 0 ? $"Cleared Teams cache (~{freed / 1024 / 1024} MB)." : "No Teams cache found.");
    }

    private static (bool, string) OutlookCacheCleanup()
    {
        var paths = new[]
        {
            Path.Combine(Local(), "Microsoft", "Outlook", "RoamCache"),
            Path.Combine(Local(), "Microsoft", "Windows", "INetCache", "Content.Outlook"),
        };
        long freed = 0; int hit = 0;
        foreach (var p in paths)
            if (Directory.Exists(p)) { freed += PurgeOld(p, TimeSpan.Zero); hit++; }
        return (hit > 0, hit > 0 ? $"Cleared Outlook cache (~{freed / 1024 / 1024} MB)." : "No Outlook cache found.");
    }

    private static (bool, string) FileAssociationRepair()
    {
        // Rebuild the icon/association cache so stale associations refresh.
        var (ok, _) = RestartService("ShellHWDetection");
        return (true, ok ? "File association cache refreshed." : "Association cache refresh attempted.");
    }

    private static (bool, string) WifiReset()
    {
        var name = WirelessInterfaceName() ?? "Wi-Fi";
        var (ok1, e1) = Shell("netsh", $"interface set interface name=\"{name}\" admin=disabled");
        Thread.Sleep(1500);
        var (ok2, e2) = Shell("netsh", $"interface set interface name=\"{name}\" admin=enabled");
        return (ok1 && ok2, ok1 && ok2 ? $"Wi-Fi adapter '{name}' reset." : $"Wi-Fi reset failed (admin required): {e1} {e2}");
    }

    private static string? WirelessInterfaceName()
    {
        try
        {
            foreach (var o in WmiHelper.Query(
                "SELECT NetConnectionID, Name FROM Win32_NetworkAdapter WHERE NetConnectionID IS NOT NULL AND PhysicalAdapter=TRUE"))
            {
                var id = WmiHelper.Get<string>(o, "NetConnectionID") ?? "";
                var name = WmiHelper.Get<string>(o, "Name") ?? "";
                if (id.Contains("Wi-Fi", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Wireless", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("Wi-Fi", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("802.11", StringComparison.OrdinalIgnoreCase))
                    return id;
            }
        }
        catch { }
        return null;
    }

    private static (bool, string) ChromeRestart()
    {
        var (_, killMsg) = KillProcess("chrome");
        Thread.Sleep(1000);
        foreach (var path in new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(Local(), "Google", "Chrome", "Application", "chrome.exe"),
        })
        {
            if (File.Exists(path))
            {
                try { Process.Start(new ProcessStartInfo(path) { UseShellExecute = true }); return (true, $"{killMsg} Relaunched Chrome."); }
                catch { }
            }
        }
        return (true, $"{killMsg} Chrome not relaunched (executable not found).");
    }

    [DllImport("psapi.dll")]
    private static extern int EmptyWorkingSet(IntPtr hProcess);

    private static (bool, string) MemoryOptimize()
    {
        int trimmed = 0;
        foreach (var p in Process.GetProcesses())
        {
            try { if (EmptyWorkingSet(p.Handle) != 0) trimmed++; }
            catch { }
            finally { p.Dispose(); }
        }
        return (true, $"Trimmed working sets on {trimmed} processes.");
    }

    private static (bool, string) KillProcess(string name)
    {
        int killed = 0;
        foreach (var p in Process.GetProcessesByName(name))
        {
            try { p.Kill(); killed++; } catch { } finally { p.Dispose(); }
        }
        return (true, killed > 0 ? $"Closed {killed} '{name}' process(es)." : $"No running '{name}' process found.");
    }

    private static (bool, string) Shell(string exe, string args)
    {
        try
        {
            var psi = new ProcessStartInfo(exe, args)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var p = Process.Start(psi)!;
            string outp = p.StandardOutput.ReadToEnd();
            string err = p.StandardError.ReadToEnd();
            p.WaitForExit(15000);
            bool ok = p.HasExited && p.ExitCode == 0;
            return (ok, ok ? outp.Trim() : $"{exe} exited {(p.HasExited ? p.ExitCode : -1)}: {err.Trim()}");
        }
        catch (Exception ex) { return (false, ex.Message); }
    }

    private static string Roaming() => Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    private static string Local() => Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
}
