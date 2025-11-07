using System.Net.Http;
using System.Net.Http.Json;

namespace DevJournal.Backend.Asana;

public sealed class AsanaClient
{
    private readonly HttpClient _httpClient;

    public AsanaClient(IHttpClientFactory httpClientFactory)
    {
        _httpClient = httpClientFactory.CreateClient("asana");
    }

    public async Task<IReadOnlyList<AsanaTask>> GetAssignedTasksAsync()
    {
        // Placeholder call; replace with full Asana API integration
        var response = await _httpClient.GetAsync("https://app.asana.com/api/1.0/tasks?assignee=me&completed_since=now");
        response.EnsureSuccessStatusCode();

        var envelope = await response.Content.ReadFromJsonAsync<AsanaTaskEnvelope>();
        return envelope?.Data ?? Array.Empty<AsanaTask>();
    }

    private sealed record AsanaTaskEnvelope(List<AsanaTask> Data);
}

public sealed record AsanaTask(string Gid, string Name, string? Notes, string? ResourceSubtype);
