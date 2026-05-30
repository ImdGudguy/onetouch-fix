using System.Text.Json;
using IntelliFix.Service;
using IntelliFix.Service.Ipc;
using IntelliFix.Service.Remediation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var config = AgentConfig.LoadOrCreate();

// ---- CLI one-shot modes (handy for testing without installing the service) ----
if (args.Contains("--collect-once"))
{
    var snapshot = new SnapshotBuilder().Build(config);
    var json = JsonSerializer.Serialize(snapshot, Json.Options);
    Console.WriteLine(json);
    try { File.WriteAllText(AgentConfig.SnapshotPath, json); } catch { }
    return;
}

if (args.Length >= 2 && args[0] == "--run-fix")
{
    var actionType = args[1];
    if (!RemediationEngine.IsKnown(actionType))
    {
        Console.Error.WriteLine($"Unknown action '{actionType}'. Known: {string.Join(", ", RemediationEngine.Catalog.Select(d => d.ActionType))}");
        return;
    }
    var result = new RemediationEngine().Execute(actionType);
    Console.WriteLine(JsonSerializer.Serialize(result, Json.Options));
    return;
}

if (args.Contains("--catalog"))
{
    Console.WriteLine(JsonSerializer.Serialize(RemediationEngine.Catalog, Json.Options));
    return;
}

// ---- normal service / console host ----
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(options => options.ServiceName = "IntelliFixAgent");
builder.Services.AddSingleton(config);
builder.Services.AddSingleton<SnapshotBuilder>();
builder.Services.AddSingleton<RemediationEngine>();
builder.Services.AddSingleton<ConsentBroker>();
builder.Services.AddHttpClient<BackendClient>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
