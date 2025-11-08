using System;
using System.Collections.Generic;
using System.Linq;
using DevJournal.Backend.Asana;
using DevJournal.Backend.Notes;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Tasks;

public sealed record TaskMetadataDto(string Project, string Section, string? Assignee, DateTimeOffset? DueDate, string Status);

public sealed record TaskNoteDto(string Id, string TaskId, string Content, DateTimeOffset UpdatedAt);

public sealed record TaskItemDto(string Id, string Name, TaskMetadataDto Metadata, IReadOnlyList<TaskNoteDto> Notes, DateTimeOffset LastUpdated);

public sealed class TaskSyncService
{
    private readonly DatabaseContext _databaseContext;
    private readonly AsanaClient _asanaClient;
    private readonly NotesRepository _notesRepository;

    public TaskSyncService(DatabaseContext databaseContext, AsanaClient asanaClient, NotesRepository notesRepository)
    {
        _databaseContext = databaseContext;
        _asanaClient = asanaClient;
        _notesRepository = notesRepository;
    }

    public async Task SyncAsync()
    {
        var tasks = await _asanaClient.GetAssignedTasksAsync();
        foreach (var task in tasks)
        {
            UpsertTask(task);
        }
    }

    public async Task<IReadOnlyList<TaskItemDto>> GetTasksAsync()
    {
        const string sql = @"SELECT id, name, project, section, assignee, due_on, status, last_updated
                              FROM tasks
                              ORDER BY last_updated DESC";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = await command.ExecuteReaderAsync();

        var taskRows = new List<TaskRow>();
        while (await reader.ReadAsync())
        {
            var dueOn = reader.IsDBNull(5) ? (DateTimeOffset?)null : DateTime.SpecifyKind(reader.GetDateTime(5), DateTimeKind.Utc);
            taskRows.Add(new TaskRow(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                dueOn,
                reader.GetString(6),
                DateTime.SpecifyKind(reader.GetDateTime(7), DateTimeKind.Utc)));
        }

        if (taskRows.Count == 0)
        {
            return Array.Empty<TaskItemDto>();
        }

        var notes = await _notesRepository.GetNotesByTaskIdsAsync(taskRows.Select(row => row.Id));
        var notesLookup = notes.GroupBy(n => n.TaskId).ToDictionary(group => group.Key, group => group.Select(ToTaskNoteDto).ToList());

        return taskRows
            .Select(row => new TaskItemDto(
                row.Id,
                row.Name,
                new TaskMetadataDto(row.Project, row.Section, row.Assignee, row.DueOn, row.Status),
                notesLookup.TryGetValue(row.Id, out var taskNotes) ? taskNotes : new List<TaskNoteDto>(),
                row.LastUpdated))
            .ToList();
    }

    private static TaskNoteDto ToTaskNoteDto(NoteDto note)
    {
        return new TaskNoteDto(note.Id, note.TaskId, note.Content, note.UpdatedAt);
    }

    private void UpsertTask(AsanaTask task)
    {
        const string sql = @"INSERT INTO tasks (id, name, project, section, assignee, due_on, status, last_updated)
                             VALUES (@id, @name, @project, @section, @assignee, @due_on, @status, @last_updated)
                             ON CONFLICT(id) DO UPDATE SET
                               name = excluded.name,
                               project = excluded.project,
                               section = excluded.section,
                               assignee = excluded.assignee,
                               due_on = excluded.due_on,
                               status = excluded.status,
                               last_updated = excluded.last_updated";

        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        command.Parameters.AddWithValue("@id", task.Gid);
        command.Parameters.AddWithValue("@name", task.Name);
        command.Parameters.AddWithValue("@project", task.Project);
        command.Parameters.AddWithValue("@section", task.Section);
        command.Parameters.AddWithValue("@assignee", (object?)task.Assignee ?? DBNull.Value);
        command.Parameters.AddWithValue("@due_on", task.DueOn?.UtcDateTime ?? (object?)DBNull.Value);
        command.Parameters.AddWithValue("@status", task.Status);
        command.Parameters.AddWithValue("@last_updated", task.LastModified.UtcDateTime);
        command.ExecuteNonQuery();
    }

    private sealed record TaskRow(string Id, string Name, string Project, string Section, string? Assignee, DateTimeOffset? DueOn, string Status, DateTimeOffset LastUpdated);
}
