using System.Diagnostics.Eventing.Reader;
using IntelliFix.Core;

namespace IntelliFix.Service.Collectors;

/// <summary>Reads recent Critical/Error/Warning records from the Windows Event Log.</summary>
public sealed class EventLogCollector
{
    private static readonly string[] Logs = { "System", "Application" };

    // Level: 1=Critical, 2=Error, 3=Warning. Look back 6 hours.
    private const string QueryXPath =
        "*[System[(Level=1 or Level=2 or Level=3) and TimeCreated[timediff(@SystemTime) <= 21600000]]]";

    public List<EventLogEntry> Collect(int maxPerLog = 25)
    {
        var entries = new List<EventLogEntry>();

        foreach (var log in Logs)
        {
            try
            {
                var query = new EventLogQuery(log, PathType.LogName, QueryXPath)
                {
                    ReverseDirection = true // newest first
                };
                using var reader = new EventLogReader(query);

                int count = 0;
                for (EventRecord? rec = reader.ReadEvent(); rec is not null && count < maxPerLog; rec = reader.ReadEvent())
                {
                    using (rec)
                    {
                        entries.Add(new EventLogEntry
                        {
                            Log = log,
                            Level = LevelName(rec.Level),
                            Source = rec.ProviderName ?? "",
                            EventId = rec.Id,
                            Message = Truncate(SafeDescription(rec), 400),
                            TimeCreated = (rec.TimeCreated ?? DateTime.Now).ToUniversalTime(),
                        });
                        count++;
                    }
                }
            }
            catch
            {
                // Some logs may be inaccessible without elevation; skip quietly.
            }
        }

        return entries
            .OrderByDescending(e => e.TimeCreated)
            .ToList();
    }

    private static string SafeDescription(EventRecord rec)
    {
        try { return rec.FormatDescription() ?? ""; }
        catch { return $"Event {rec.Id} from {rec.ProviderName}"; }
    }

    private static string LevelName(byte? level) => level switch
    {
        1 => "Critical",
        2 => "Error",
        3 => "Warning",
        _ => "Information",
    };

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s[..max] + "…");
}
