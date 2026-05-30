using System.Management;

namespace IntelliFix.Service.Collectors;

/// <summary>Small helpers around WMI so collectors stay terse and exception-safe.</summary>
internal static class WmiHelper
{
    public static IEnumerable<ManagementObject> Query(string wql, string scope = "root\\CIMV2")
    {
        using var searcher = new ManagementObjectSearcher(scope, wql);
        foreach (ManagementBaseObject o in searcher.Get())
            yield return (ManagementObject)o;
    }

    public static T? Get<T>(ManagementBaseObject obj, string prop)
    {
        try
        {
            var v = obj[prop];
            if (v is null) return default;
            return (T)Convert.ChangeType(v, typeof(T));
        }
        catch { return default; }
    }
}
