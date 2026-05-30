using System.Windows;
using System.Windows.Threading;
using IntelliFix.Core;

namespace IntelliFix.Tray;

public partial class ConsentWindow : Window
{
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(1) };
    private int _remaining = 60;

    public ConsentWindow(ConsentRequest req)
    {
        InitializeComponent();

        LabelText.Text = req.Label;
        DescText.Text = req.Description;
        ConfText.Text = $"{req.Confidence}%";
        TimeText.Text = req.Duration;
        RateText.Text = $"{req.SuccessRate}%";

        _timer.Tick += (_, _) =>
        {
            _remaining--;
            CountdownText.Text = $"Auto-declines in {_remaining}s if no response";
            if (_remaining <= 0) { _timer.Stop(); DialogResult = false; Close(); }
        };
        CountdownText.Text = $"Auto-declines in {_remaining}s if no response";
        _timer.Start();
    }

    private void OnApprove(object sender, RoutedEventArgs e)
    {
        _timer.Stop();
        DialogResult = true;
        Close();
    }

    private void OnDeny(object sender, RoutedEventArgs e)
    {
        _timer.Stop();
        DialogResult = false;
        Close();
    }
}
