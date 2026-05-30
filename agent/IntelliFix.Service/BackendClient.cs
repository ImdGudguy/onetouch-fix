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
        if (!string.IsNullOrWhiteSpace(config.AgentToken))
            _http.DefaultRequestHeaders.Add("x-intellifix-token", config.AgentToken);
    }

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
