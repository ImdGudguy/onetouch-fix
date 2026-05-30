using System.Text.Json;
using System.Text.Json.Serialization;

namespace IntelliFix.Service;

/// <summary>Shared JSON settings: camelCase + enums as strings (matches the web app).</summary>
public static class Json
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };
}
