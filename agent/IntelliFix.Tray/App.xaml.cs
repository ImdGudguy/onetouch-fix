using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using System.Windows;
using IntelliFix.Core;
using WinForms = System.Windows.Forms;

namespace IntelliFix.Tray;

public partial class App : System.Windows.Application
{
    private const string PipeName = "IntelliFixConsent";
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private WinForms.NotifyIcon? _tray;
    private CancellationTokenSource? _cts;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        _tray = new WinForms.NotifyIcon
        {
            Icon = SystemIcons.Shield,
            Text = "IntelliFix Agent — consent service",
            Visible = true,
        };
        var menu = new WinForms.ContextMenuStrip();
        menu.Items.Add("IntelliFix Agent", null, (_, _) => { });
        menu.Items.Add(new WinForms.ToolStripSeparator());
        menu.Items.Add("Test consent popup", null, (_, _) => ShowConsent(SampleRequest()));
        menu.Items.Add("Exit", null, (_, _) => ExitApp());
        _tray.ContextMenuStrip = menu;

        _cts = new CancellationTokenSource();
        _ = Task.Run(() => PipeLoopAsync(_cts.Token));
    }

    private static ConsentRequest SampleRequest() => new()
    {
        ActionType = "disk_cleanup", Label = "Disk Cleanup",
        Description = "Clean temp files, browser cache & system junk to free space.",
        Confidence = 92, Duration = "45s", SuccessRate = 95,
    };

    private async Task PipeLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var pipe = new NamedPipeClientStream(".", PipeName, PipeDirection.InOut, PipeOptions.Asynchronous);
                await pipe.ConnectAsync(ct);

                using var reader = new StreamReader(pipe, Encoding.UTF8, false, 1024, leaveOpen: true);
                await using var writer = new StreamWriter(pipe, new UTF8Encoding(false)) { AutoFlush = true };

                string? line;
                while (!ct.IsCancellationRequested && (line = await reader.ReadLineAsync(ct)) is not null)
                {
                    ConsentRequest? req;
                    try { req = JsonSerializer.Deserialize<ConsentRequest>(line, JsonOpts); }
                    catch { continue; }
                    if (req is null) continue;

                    bool approved = await Dispatcher.InvokeAsync(() => ShowConsent(req));
                    var resp = new ConsentResponse { Id = req.Id, Approved = approved };
                    await writer.WriteLineAsync(JsonSerializer.Serialize(resp, JsonOpts));
                }
            }
            catch (OperationCanceledException) { break; }
            catch { /* service not up yet — retry */ }

            try { await Task.Delay(2000, ct); } catch { break; }
        }
    }

    private bool ShowConsent(ConsentRequest req)
    {
        var win = new ConsentWindow(req);
        return win.ShowDialog() == true;
    }

    private void ExitApp()
    {
        try { _cts?.Cancel(); } catch { }
        if (_tray is not null) { _tray.Visible = false; _tray.Dispose(); }
        Shutdown();
    }
}
