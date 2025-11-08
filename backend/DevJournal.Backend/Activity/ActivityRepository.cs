using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DevJournal.Backend;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Activity;

public sealed record ActivityEventDto(string Id, string? TaskId, string Type, string Description, string? Actor, DateTimeOffset OccurredAt);

public sealed class ActivityRepository
{
    private readonly DatabaseContext _databaseContext;

    public ActivityRepository(DatabaseContext databaseContext)
    {
        _databaseContext = databaseContext;
    }

    public Task<IReadOnlyList<ActivityEventDto>> GetEventsAsync(int? limit = null)
    {
        var sql = "SELECT id, task_id, type, description, actor, occurred_at FROM activity_events ORDER BY occurred_at DESC";
        if (limit is not null)
        {
            sql += " LIMIT @limit";
        }

        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        if (limit is not null)
        {
            command.Parameters.AddWithValue("@limit", limit.Value);
        }

        using var reader = command.ExecuteReader();
        var events = new List<ActivityEventDto>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var taskId = reader.IsDBNull(1) ? null : reader.GetString(1);
            var type = reader.GetString(2);
            var description = reader.GetString(3);
            var actor = reader.IsDBNull(4) ? null : reader.GetString(4);
            var occurredAt = DateTime.SpecifyKind(reader.GetDateTime(5), DateTimeKind.Utc);
            events.Add(new ActivityEventDto(id, taskId, type, description, actor, occurredAt));
        }

        return Task.FromResult<IReadOnlyList<ActivityEventDto>>(events);
    }
}
