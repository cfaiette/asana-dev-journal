using DevJournal.Backend;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Notes;

public sealed class NotesRepository
{
    private readonly DatabaseContext _databaseContext;

    public NotesRepository(DatabaseContext databaseContext)
    {
        _databaseContext = databaseContext;
    }

    public Task<IReadOnlyList<NoteDto>> GetNotesAsync()
    {
        const string sql = "SELECT task_id, content, created_at FROM notes ORDER BY created_at DESC";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = command.ExecuteReader();

        var notes = new List<NoteDto>();
        while (reader.Read())
        {
            var taskId = reader.GetString(0);
            var content = reader.GetString(1);
            var createdAt = reader.GetDateTime(2);
            notes.Add(new NoteDto(taskId, content, createdAt));
        }

        return Task.FromResult<IReadOnlyList<NoteDto>>(notes);
    }

    public Task<NoteDto> AddNoteAsync(NoteDto note)
    {
        const string sql = "INSERT INTO notes (task_id, content, created_at) VALUES (@task_id, @content, @created_at)";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        command.Parameters.AddWithValue("@task_id", note.TaskId);
        command.Parameters.AddWithValue("@content", note.Content);
        command.Parameters.AddWithValue("@created_at", note.CreatedAt.UtcDateTime);
        command.ExecuteNonQuery();

        return Task.FromResult(note);
    }
}
