using System.Collections.Concurrent;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using IntelliFix.Core;
using Microsoft.Extensions.Logging;

namespace IntelliFix.Service.Ipc;

/// <summary>
/// Hosts a named pipe the user-session tray app connects to. The service asks
/// the tray to show the futuristic Yes/No popup and awaits the user's answer.
/// If no tray is connected, consent falls back to the web approval already given.
/// </summary>
public sealed class ConsentBroker : IDisposable
{
    public const string PipeName = "IntelliFixConsent";

    private readonly ILogger<ConsentBroker> _log;
    private readonly ConcurrentDictionary<string, TaskCompletionSource<bool>> _pending = new();
    private readonly CancellationTokenSource _cts = new();
    private StreamWriter? _writer;
    private volatile bool _clientConnected;

    public ConsentBroker(ILogger<ConsentBroker> log) => _log = log;

    public bool TrayConnected => _clientConnected;

    public void Start() => _ = Task.Run(() => AcceptLoopAsync(_cts.Token));

    private async Task AcceptLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var server = CreateServer();
                await server.WaitForConnectionAsync(ct);
                _clientConnected = true;
                _log.LogInformation("Consent tray connected.");

                using var reader = new StreamReader(server, Encoding.UTF8, false, 1024, leaveOpen: true);
                _writer = new StreamWriter(server, new UTF8Encoding(false)) { AutoFlush = true };

                string? line;
                while (!ct.IsCancellationRequested && (line = await reader.ReadLineAsync(ct)) is not null)
                {
                    try
                    {
                        var resp = JsonSerializer.Deserialize<ConsentResponse>(line, Json.Options);
                        if (resp is not null && _pending.TryRemove(resp.Id, out var tcs))
                            tcs.TrySetResult(resp.Approved);
                    }
                    catch { /* ignore malformed */ }
                }
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _log.LogDebug(ex, "Consent pipe reset"); }
            finally
            {
                _clientConnected = false;
                _writer = null;
                if (!ct.IsCancellationRequested) await Task.Delay(1000, ct).ContinueWith(_ => { });
            }
        }
    }

    private static NamedPipeServerStream CreateServer()
    {
        var security = new PipeSecurity();
        security.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.AuthenticatedUserSid, null),
            PipeAccessRights.ReadWrite, AccessControlType.Allow));
        security.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
            PipeAccessRights.FullControl, AccessControlType.Allow));

        return NamedPipeServerStreamAcl.Create(
            PipeName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte,
            PipeOptions.Asynchronous, 0, 0, security);
    }

    /// <summary>Ask the tray for consent. Returns true if approved (or no tray present).</summary>
    public async Task<bool> RequestConsentAsync(RemediationDescriptor d, TimeSpan timeout, CancellationToken ct)
    {
        var writer = _writer;
        if (!_clientConnected || writer is null)
        {
            _log.LogInformation("No consent tray connected; relying on prior web approval for {Action}.", d.ActionType);
            return true;
        }

        var req = new ConsentRequest
        {
            ActionType = d.ActionType, Label = d.Label, Description = d.Description,
            Confidence = d.Confidence, Duration = d.Duration, SuccessRate = d.SuccessRate,
        };
        var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[req.Id] = tcs;

        try
        {
            await writer.WriteLineAsync(JsonSerializer.Serialize(req, Json.Options));
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(timeout);
            await using (timeoutCts.Token.Register(() => tcs.TrySetResult(false)))
                return await tcs.Task;
        }
        catch
        {
            return false;
        }
        finally
        {
            _pending.TryRemove(req.Id, out _);
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        _cts.Dispose();
    }
}
