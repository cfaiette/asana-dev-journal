using System.Net.Http.Headers;
using System.Text.Json;
using DevJournal.Backend.Asana;
using DevJournal.Backend.Notes;
using DevJournal.Backend.Tabs;
using DevJournal.Backend.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateSlimBuilder(args);

// Configure services
builder.Services.AddHttpClient("asana", client =>
{
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});

builder.Services.AddSingleton<DatabaseContext>();
builder.Services.AddScoped<AsanaClient>();
builder.Services.AddScoped<OAuthService>();
builder.Services.AddScoped<NotesRepository>();
builder.Services.AddScoped<TabsRepository>();
builder.Services.AddScoped<TaskSyncService>();

var app = builder.Build();

app.MapGet("/health", () => Results.Json(new { status = "ok" }));

app.MapPost("/auth/login", (OAuthService oauthService) => oauthService.BuildLoginRedirect());
app.MapGet("/auth/callback", async (HttpRequest request, OAuthService oauthService) =>
{
    var code = request.Query["code"].ToString();
    if (string.IsNullOrEmpty(code))
    {
        return Results.BadRequest(new { error = "missing_code" });
    }

    await oauthService.ExchangeCodeAsync(code);
    return Results.Redirect("/oauth-success");
});

app.MapGet("/tasks", async (TaskSyncService taskService) =>
{
    var tasks = await taskService.GetTasksAsync();
    return Results.Json(tasks, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
});

app.MapGet("/notes", async (NotesRepository notesRepository) =>
{
    var notes = await notesRepository.GetNotesAsync();
    return Results.Json(notes, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
});

app.MapPost("/notes", async (HttpRequest request, NotesRepository notesRepository) =>
{
    var note = await JsonSerializer.DeserializeAsync<NoteDto>(request.Body);
    if (note is null || string.IsNullOrWhiteSpace(note.TaskId) || string.IsNullOrWhiteSpace(note.Content))
    {
        return Results.BadRequest(new { error = "invalid_note" });
    }

    var saved = await notesRepository.AddNoteAsync(note);
    return Results.Json(saved, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
});

app.MapGet("/tabs", async (TabsRepository tabsRepository) =>
{
    var tabs = await tabsRepository.GetTabsAsync();
    return Results.Json(tabs, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
});

app.MapPost("/sync", async (TaskSyncService taskService) =>
{
    await taskService.SyncAsync();
    return Results.Ok();
});

await app.RunAsync();

namespace DevJournal.Backend.Notes
{
    public record NoteDto(string TaskId, string Content, DateTimeOffset CreatedAt);
}
