using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace DevJournal.Backend.Asana;

public sealed class AsanaClient
{
    private readonly HttpClient _httpClient;
    private readonly OAuthTokenStore _tokenStore;
    private readonly AsanaOAuthOptions _options;

    public AsanaClient(IHttpClientFactory httpClientFactory, OAuthTokenStore tokenStore, IOptions<AsanaOAuthOptions> options)
    {
        _httpClient = httpClientFactory.CreateClient("asana");
        _tokenStore = tokenStore;
        _options = options.Value;
    }

    public async Task<IReadOnlyList<AsanaTask>> GetAssignedTasksAsync()
    {
        var token = await _tokenStore.GetAsync();
        if (token is null || token.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            throw new InvalidOperationException("Asana access token is missing or expired.");
        }

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);

        var query = new Dictionary<string, string?>
        {
            ["assignee"] = "me",
            ["workspace"] = string.IsNullOrWhiteSpace(_options.WorkspaceId) ? "me" : _options.WorkspaceId,
            ["completed_since"] = "now",
            ["opt_fields"] = string.Join(",",
                "gid",
                "name",
                "completed",
                "due_on",
                "modified_at",
                "assignee.name",
                "memberships.section.name",
                "memberships.project.name")
        };

        var requestUri = QueryHelpers.AddQueryString("https://app.asana.com/api/1.0/tasks", query);
        using var response = await _httpClient.GetAsync(requestUri);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync();
        var envelope = await JsonSerializer.DeserializeAsync<AsanaTaskEnvelope>(stream) ?? throw new InvalidOperationException("Unable to parse tasks payload.");

        return envelope.Data.Select(MapTask).ToList();
    }

    private static AsanaTask MapTask(AsanaTaskPayload payload)
    {
        var membership = payload.Memberships.FirstOrDefault();
        var project = membership?.Project?.Name ?? "Unassigned";
        var section = membership?.Section?.Name ?? "No Section";
        var dueOn = payload.DueOn;
        var lastModified = payload.ModifiedAt ?? DateTimeOffset.UtcNow;
        var status = payload.Completed ? "complete" : "incomplete";

        return new AsanaTask(
            payload.Gid,
            payload.Name,
            project,
            section,
            payload.Assignee?.Name,
            dueOn,
            status,
            lastModified);
    }

    private sealed record AsanaTaskEnvelope(List<AsanaTaskPayload> Data);

    private sealed record AsanaTaskPayload(
        [property: JsonPropertyName("gid")] string Gid,
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("completed")] bool Completed,
        [property: JsonPropertyName("due_on")] DateTimeOffset? DueOn,
        [property: JsonPropertyName("modified_at")] DateTimeOffset? ModifiedAt,
        [property: JsonPropertyName("assignee")] AsanaUserReference? Assignee,
        [property: JsonPropertyName("memberships")] List<AsanaTaskMembership> Memberships);

    private sealed record AsanaUserReference([property: JsonPropertyName("name")] string? Name);

    private sealed record AsanaTaskMembership(
        [property: JsonPropertyName("project")] AsanaProjectReference? Project,
        [property: JsonPropertyName("section")] AsanaSectionReference? Section);

    private sealed record AsanaProjectReference([property: JsonPropertyName("name")] string? Name);

    private sealed record AsanaSectionReference([property: JsonPropertyName("name")] string? Name);
}

public sealed record AsanaTask(
    string Gid,
    string Name,
    string Project,
    string Section,
    string? Assignee,
    DateTimeOffset? DueOn,
    string Status,
    DateTimeOffset LastModified);
