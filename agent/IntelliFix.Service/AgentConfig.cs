using System.Text.Json;

namespace IntelliFix.Service;

/// <summary>Persisted agent configuration (device id, backend url, interval).</summary>
public sealed class AgentConfig
{
    public string DeviceId { get; set; } = "";
    public string BackendUrl { get; set; } = "http://localhost:3000";
    public int TelemetryIntervalSeconds { get; set; } = 5;
    public string AgentToken { get; set; } = "";   // legacy shared token (optional)
    public string EnrollToken { get; set; } = "";   // single-use, redeemed on first run
    public string DeviceToken { get; set; } = "";    // long-lived per-device token (issued)

    private static string ConfigDir =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "IntelliFix");

    private static string ConfigPath => Path.Combine(ConfigDir, "agent.json");

    /// <summary>Load existing config or create a new one with a fresh device id.</summary>
    public static AgentConfig LoadOrCreate()
    {
        try
        {
            Directory.CreateDirectory(ConfigDir);
            if (File.Exists(ConfigPath))
            {
                var cfg = JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(ConfigPath),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (cfg is not null && !string.IsNullOrWhiteSpace(cfg.DeviceId))
                    return cfg;
            }
        }
        catch { /* fall through to create */ }

        var created = new AgentConfig { DeviceId = Guid.NewGuid().ToString() };
        created.Save();
        return created;
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(ConfigDir);
            File.WriteAllText(ConfigPath, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch { /* best effort */ }
    }

    public static string SnapshotPath => Path.Combine(ConfigDir, "last-snapshot.json");
}
