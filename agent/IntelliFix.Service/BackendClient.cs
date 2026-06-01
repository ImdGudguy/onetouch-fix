using System.Net.Http.Json;
using IntelliFix.Core;

namespace IntelliFix.Service;

/// <summary>Talks to the IntelliFix web backend: pushes telemetry, pulls the command queue.</summary>
public sealed class BackendClient
{
    private readonly HttpClient _http;
    private readonly AgentConfig _config;

    public BackendClient(HttpClient http, AgentConfig config)
    {
        _http = http;
        _config = config;
        _http.Timeout = TimeSpan.FromSeconds(10);
        ApplyAuthHeader();
    }

    /// <summary>Sets the auth header to the per-device token if present, else the legacy shared token.</summary>
    public void ApplyAuthHeader()
    {
        _http.DefaultRequestHeaders.Remove("x-intellifix-token");
        var token = !string.IsNullOrWhiteSpace(_config.DeviceToken) ? _config.DeviceToken : _config.AgentToken;
        if (!string.IsNullOrWhiteSpace(token))
            _http.DefaultRequestHeaders.Add("x-intellifix-token", token);
    }

    /// <summary>Redeems the single-use enrollment token for a long-lived per-device token.</summary>
    public async Task<string?> EnrollDeviceAsync(string enrollToken, string deviceId, CancellationToken ct)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_config.BackendUrl}/api/agent/enroll-device",
                new { enrollToken, deviceId }, Json.Options, ct);
            if (!res.IsSuccessStatusCode) return null;
            var doc = await res.Content.ReadFromJsonAsync<EnrollResponse>(Json.Options, ct);
            return string.IsNullOrWhiteSpace(doc?.DeviceToken) ? null : doc!.DeviceToken;
        }
        catch { return null; }
    }

    private sealed class EnrollResponse { public string? DeviceToken { get; set; } }

    public async Task<bool> PushTelemetryAsync(TelemetrySnapshot snapshot, CancellationToken ct)
    {
        try
        {
            var res = await _http.PostAsJsonAsync($"{_config.BackendUrl}/api/agent/telemetry", snapshot, Json.Options, ct);
            return res.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    public async Task<List<RemediationCommand>> FetchCommandsAsync(CancellationToken ct)
    {
        try
        {
            var url = $"{_config.BackendUrl}/api/agent/{_config.DeviceId}/commands";
            var cmds = await _http.GetFromJsonAsync<List<RemediationCommand>>(url, Json.Options, ct);
            return cmds ?? new();
        }
        catch { return new(); }
    }

    public async Task ReportResultAsync(RemediationResult result, CancellationToken ct)
    {
        try
        {
            await _http.PostAsJsonAsync($"{_config.BackendUrl}/api/agent/result", result, Json.Options, ct);
        }
        catch { /* best effort; will retry next cycle */ }
    }
}
