using DevJournal.Backend.Asana;
using DevJournal.Backend;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Tasks;

public sealed record TaskDto(string Id, string Name, string? Notes, string? SectionId, DateTimeOffset? DueOn);

public sealed class TaskSyncService
{
    private readonly DatabaseContext _databaseContext;
    private readonly AsanaClient _asanaClient;

    public TaskSyncService(DatabaseContext databaseContext, AsanaClient asanaClient)
    {
        _databaseContext = databaseContext;
        _asanaClient = asanaClient;
    }

    public async Task SyncAsync()
    {
        var tasks = await _asanaClient.GetAssignedTasksAsync();
        foreach (var task in tasks)
        {
            UpsertTask(task);
        }
    }

    public Task<IReadOnlyList<TaskDto>> GetTasksAsync()
    {
        const string sql = "SELECT id, name, notes, section_id, due_on FROM tasks ORDER BY updated_at DESC";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = command.ExecuteReader();

        var tasks = new List<TaskDto>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var name = reader.GetString(1);
            var notes = reader.IsDBNull(2) ? null : reader.GetString(2);
            var sectionId = reader.IsDBNull(3) ? null : reader.GetString(3);
            DateTimeOffset? dueOn = reader.IsDBNull(4) ? null : DateTime.SpecifyKind(reader.GetDateTime(4), DateTimeKind.Utc);
            tasks.Add(new TaskDto(id, name, notes, sectionId, dueOn));
        }

        return Task.FromResult<IReadOnlyList<TaskDto>>(tasks);
    }

    private void UpsertTask(AsanaTask task)
    {
        const string sql = @"INSERT INTO tasks (id, name, notes, section_id, updated_at)
                             VALUES (@id, @name, @notes, @section_id, CURRENT_TIMESTAMP)
                             ON CONFLICT(id) DO UPDATE SET
                               name = excluded.name,
                               notes = excluded.notes,
                               section_id = excluded.section_id,
                               updated_at = excluded.updated_at";

        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        command.Parameters.AddWithValue("@id", task.Gid);
        command.Parameters.AddWithValue("@name", task.Name);
        command.Parameters.AddWithValue("@notes", (object?)task.Notes ?? DBNull.Value);
        command.Parameters.AddWithValue("@section_id", (object?)task.ResourceSubtype ?? DBNull.Value);
        command.ExecuteNonQuery();
    }
}
