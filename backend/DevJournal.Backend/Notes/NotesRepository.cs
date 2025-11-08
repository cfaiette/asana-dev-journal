using System;
using System.Collections.Generic;
using System.Linq;
using DevJournal.Backend;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Notes;

public sealed record NoteDto(string Id, string TaskId, string Content, DateTimeOffset UpdatedAt);

public sealed class NotesRepository
{
    private readonly DatabaseContext _databaseContext;

    public NotesRepository(DatabaseContext databaseContext)
    {
        _databaseContext = databaseContext;
    }

    public Task<IReadOnlyList<NoteDto>> GetNotesAsync()
    {
        const string sql = "SELECT id, task_id, content, updated_at FROM notes ORDER BY updated_at DESC";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = command.ExecuteReader();

        var notes = new List<NoteDto>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var taskId = reader.GetString(1);
            var content = reader.GetString(2);
            var updatedAt = DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc);
            notes.Add(new NoteDto(id, taskId, content, updatedAt));
        }

        return Task.FromResult<IReadOnlyList<NoteDto>>(notes);
    }

    public async Task<IReadOnlyList<NoteDto>> GetNotesByTaskIdsAsync(IEnumerable<string> taskIds)
    {
        var ids = taskIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return Array.Empty<NoteDto>();
        }

        var parameterNames = ids.Select((_, index) => $"@task{index}").ToArray();
        var sql = $"SELECT id, task_id, content, updated_at FROM notes WHERE task_id IN ({string.Join(",", parameterNames)}) ORDER BY updated_at DESC";

        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        for (var i = 0; i < ids.Length; i++)
        {
            command.Parameters.AddWithValue(parameterNames[i], ids[i]);
        }

        using var reader = await command.ExecuteReaderAsync();
        var notes = new List<NoteDto>();
        while (await reader.ReadAsync())
        {
            var id = reader.GetString(0);
            var taskId = reader.GetString(1);
            var content = reader.GetString(2);
            var updatedAt = DateTime.SpecifyKind(reader.GetDateTime(3), DateTimeKind.Utc);
            notes.Add(new NoteDto(id, taskId, content, updatedAt));
        }

        return notes;
    }

    public async Task<NoteDto> AddNoteAsync(string taskId, string content, DateTimeOffset? updatedAt = null)
    {
        var note = new NoteDto(Guid.NewGuid().ToString("N"), taskId, content, updatedAt?.ToUniversalTime() ?? DateTimeOffset.UtcNow);
        const string sql = "INSERT INTO notes (id, task_id, content, updated_at) VALUES (@id, @task_id, @content, @updated_at)";

        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        command.Parameters.AddWithValue("@id", note.Id);
        command.Parameters.AddWithValue("@task_id", note.TaskId);
        command.Parameters.AddWithValue("@content", note.Content);
        command.Parameters.AddWithValue("@updated_at", note.UpdatedAt.UtcDateTime);
        await command.ExecuteNonQueryAsync();

        return note;
    }
}
