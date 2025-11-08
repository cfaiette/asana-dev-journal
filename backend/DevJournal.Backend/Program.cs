using System;
using System.Net.Http.Headers;
using System.Text.Json;
using DevJournal.Backend.Activity;
using DevJournal.Backend.Asana;
using DevJournal.Backend.Notes;
using DevJournal.Backend.Tabs;
using DevJournal.Backend.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateSlimBuilder(args);
builder.Configuration.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();

// Configure services
builder.Services.AddMemoryCache();
builder.Services.Configure<AsanaOAuthOptions>(builder.Configuration.GetSection("AsanaOAuth"));
builder.Services.AddHttpClient("asana", client =>
{
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});

builder.Services.AddSingleton<DatabaseContext>();
builder.Services.AddScoped<OAuthTokenStore>();
builder.Services.AddScoped<AsanaClient>();
builder.Services.AddScoped<OAuthService>();
builder.Services.AddScoped<NotesRepository>();
builder.Services.AddScoped<TabsRepository>();
builder.Services.AddScoped<ActivityRepository>();
builder.Services.AddScoped<TaskSyncService>();

var app = builder.Build();
var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

app.MapGet("/health", () => Results.Json(new { status = "ok" }));

app.MapGet("/auth/asana/start", (HttpRequest request, OAuthService oauthService) =>
{
    var redirectUri = request.Query["redirect_uri"].ToString();
    return oauthService.BuildLoginRedirect(redirectUri);
});

app.MapGet("/auth/asana/callback", async (HttpRequest request, OAuthService oauthService) =>
{
    var code = request.Query["code"].ToString();
    var state = request.Query["state"].ToString();

    try
    {
        var result = await oauthService.ExchangeCodeAsync(code, state);
        return Results.Json(result, jsonOptions);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/journal/tasks", async (TaskSyncService taskService) =>
{
    var tasks = await taskService.GetTasksAsync();
    return Results.Json(new { tasks }, jsonOptions);
});

app.MapGet("/api/journal/activity", async (ActivityRepository activityRepository) =>
{
    var events = await activityRepository.GetEventsAsync(100);
    return Results.Json(new { events }, jsonOptions);
});

app.MapGet("/api/journal/tabs", async (TabsRepository tabsRepository) =>
{
    var tabs = await tabsRepository.GetTabsAsync();
    return Results.Json(new { tabs }, jsonOptions);
});

app.MapPost("/api/journal/notes", async (HttpRequest request, NotesRepository notesRepository) =>
{
    var noteRequest = await JsonSerializer.DeserializeAsync<NoteRequest>(request.Body);
    if (noteRequest is null || string.IsNullOrWhiteSpace(noteRequest.TaskId) || string.IsNullOrWhiteSpace(noteRequest.Content))
    {
        return Results.BadRequest(new { error = "invalid_note" });
    }

    var saved = await notesRepository.AddNoteAsync(noteRequest.TaskId, noteRequest.Content);
    return Results.Json(saved, jsonOptions);
});

app.MapPost("/api/journal/sync", async (TaskSyncService taskService) =>
{
    await taskService.SyncAsync();
    return Results.Ok();
});

await app.RunAsync();

internal sealed record NoteRequest(string TaskId, string Content);
