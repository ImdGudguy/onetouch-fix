using System.ServiceProcess;
using Microsoft.Win32;
using IntelliFix.Core;

namespace IntelliFix.Service.Collectors;

/// <summary>Runs a set of endpoint security controls and produces a compliance report.</summary>
public sealed class ComplianceCollector
{
    public ComplianceReport Collect()
    {
        var controls = new List<ComplianceControl>
        {
            Antivirus(),
            RealTimeProtection(),
            Firewall(),
            BitLocker(),
            Uac(),
            AutoUpdates(),
            SecureBoot(),
            ScreenLock(),
        };

        int considered = controls.Count(c => c.Status != ControlStatus.Unknown);
        int passed = controls.Count(c => c.Status == ControlStatus.Pass);
        int score = considered == 0 ? 0 : (int)Math.Round(passed / (double)considered * 100);

        return new ComplianceReport { Score = score, Controls = controls };
    }

    private static ComplianceControl Defender(string id, string name, string standard, string prop)
    {
        var c = new ComplianceControl { Id = id, Name = name, Category = "Security", Standard = standard };
        try
        {
            foreach (var o in WmiHelper.Query($"SELECT {prop} FROM MSFT_MpComputerStatus", "root\\Microsoft\\Windows\\Defender"))
            {
                bool on = WmiHelper.Get<bool>(o, prop);
                c.Status = on ? ControlStatus.Pass : ControlStatus.Fail;
                c.Detail = on ? "Enabled" : "Disabled";
                return c;
            }
            c.Status = ControlStatus.Unknown;
            c.Detail = "Defender status unavailable";
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Query failed"; }
        return c;
    }

    private ComplianceControl Antivirus() =>
        Defender("CC001", "Antivirus Active", "CIS", "AntivirusEnabled");

    private ComplianceControl RealTimeProtection() =>
        Defender("CC002", "Real-Time Protection", "CIS", "RealTimeProtectionEnabled");

    private static ComplianceControl Firewall()
    {
        var c = new ComplianceControl { Id = "CC003", Name = "Firewall Enabled", Category = "Security", Standard = "CIS" };
        try
        {
            bool all = true; int n = 0;
            foreach (var o in WmiHelper.Query("SELECT Enabled FROM MSFT_NetFirewallProfile", "root\\StandardCimv2"))
            {
                n++;
                if (!WmiHelper.Get<bool>(o, "Enabled")) all = false;
            }
            if (n == 0) { c.Status = ControlStatus.Unknown; c.Detail = "No profiles found"; }
            else { c.Status = all ? ControlStatus.Pass : ControlStatus.Fail; c.Detail = all ? "All profiles on" : "A profile is disabled"; }
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Query failed"; }
        return c;
    }

    private static ComplianceControl BitLocker()
    {
        var c = new ComplianceControl { Id = "CC004", Name = "BitLocker Encryption", Category = "Encryption", Standard = "ISO27001" };
        try
        {
            var sysDrive = (Path.GetPathRoot(Environment.SystemDirectory) ?? "C:\\").TrimEnd('\\');
            foreach (var o in WmiHelper.Query(
                $"SELECT DriveLetter, ProtectionStatus FROM Win32_EncryptableVolume WHERE DriveLetter='{sysDrive}'",
                "root\\CIMV2\\Security\\MicrosoftVolumeEncryption"))
            {
                uint status = WmiHelper.Get<uint>(o, "ProtectionStatus"); // 1 = on
                c.Status = status == 1 ? ControlStatus.Pass : ControlStatus.Fail;
                c.Detail = status == 1 ? "Protected" : "Not protected";
                return c;
            }
            c.Status = ControlStatus.Unknown;
            c.Detail = "Requires elevation";
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Requires elevation"; }
        return c;
    }

    private static ComplianceControl Uac()
    {
        var c = new ComplianceControl { Id = "CC005", Name = "UAC Enabled", Category = "Policy", Standard = "NIST" };
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System");
            var v = key?.GetValue("EnableLUA");
            bool on = v is int i && i == 1;
            c.Status = on ? ControlStatus.Pass : ControlStatus.Fail;
            c.Detail = on ? "Enabled" : "Disabled";
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Query failed"; }
        return c;
    }

    private static ComplianceControl AutoUpdates()
    {
        var c = new ComplianceControl { Id = "CC006", Name = "Windows Update Service", Category = "Patching", Standard = "NIST" };
        try
        {
            using var sc = new ServiceController("wuauserv");
            bool disabled = sc.StartType == ServiceStartMode.Disabled;
            c.Status = disabled ? ControlStatus.Fail : ControlStatus.Pass;
            c.Detail = disabled ? "Update service disabled" : $"{sc.Status}";
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Query failed"; }
        return c;
    }

    private static ComplianceControl SecureBoot()
    {
        var c = new ComplianceControl { Id = "CC007", Name = "Secure Boot", Category = "Security", Standard = "CIS" };
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\SecureBoot\State");
            var v = key?.GetValue("UEFISecureBootEnabled");
            if (v is int i)
            {
                c.Status = i == 1 ? ControlStatus.Pass : ControlStatus.Fail;
                c.Detail = i == 1 ? "Enabled" : "Disabled";
            }
            else { c.Status = ControlStatus.Unknown; c.Detail = "Legacy/unknown"; }
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Query failed"; }
        return c;
    }

    private static ComplianceControl ScreenLock()
    {
        var c = new ComplianceControl { Id = "CC008", Name = "Screen Lock Timeout", Category = "Policy", Standard = "SOC2" };
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Control Panel\Desktop");
            var secure = key?.GetValue("ScreenSaverIsSecure")?.ToString();
            var timeoutStr = key?.GetValue("ScreenSaveTimeOut")?.ToString();
            int.TryParse(timeoutStr, out int timeout);
            bool ok = secure == "1" && timeout > 0 && timeout <= 900;
            c.Status = ok ? ControlStatus.Pass : ControlStatus.Warning;
            c.Detail = ok ? $"Locks after {timeout}s" : "No secure timeout set";
        }
        catch { c.Status = ControlStatus.Unknown; c.Detail = "Query failed"; }
        return c;
    }
}
