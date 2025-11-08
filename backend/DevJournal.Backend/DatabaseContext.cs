using System;
using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;

namespace DevJournal.Backend;

/// <summary>
/// Provides a shared SQLite connection for repositories and ensures the schema
/// required by the API is present. This lightweight migration runner executes
/// idempotent <c>CREATE TABLE</c> statements whenever the application starts so
/// that local development and automated tests have a consistent database.
/// </summary>
public sealed class DatabaseContext : IDisposable
{
    private const string DefaultDatabasePath = "devjournal.db";
    private readonly SqliteConnection _connection;

    public DatabaseContext(IConfiguration configuration)
    {
        var databasePath = configuration.GetValue<string>("Database:Path") ?? DefaultDatabasePath;
        _connection = new SqliteConnection($"Data Source={databasePath}");
        _connection.Open();
        EnsureSchema();
    }

    public SqliteConnection Connection => _connection;

    private void EnsureSchema()
    {
        using var command = _connection.CreateCommand();
        var builder = new StringBuilder();

        builder.AppendLine(@"CREATE TABLE IF NOT EXISTS tasks (");
        builder.AppendLine(@"  id TEXT PRIMARY KEY,");
        builder.AppendLine(@"  name TEXT NOT NULL,");
        builder.AppendLine(@"  project TEXT NOT NULL,");
        builder.AppendLine(@"  section TEXT NOT NULL,");
        builder.AppendLine(@"  assignee TEXT NULL,");
        builder.AppendLine(@"  due_on TEXT NULL,");
        builder.AppendLine(@"  status TEXT NOT NULL,");
        builder.AppendLine(@"  last_updated TEXT NOT NULL");
        builder.AppendLine(@");");

        builder.AppendLine(@"CREATE TABLE IF NOT EXISTS notes (");
        builder.AppendLine(@"  id TEXT PRIMARY KEY,");
        builder.AppendLine(@"  task_id TEXT NOT NULL,");
        builder.AppendLine(@"  content TEXT NOT NULL,");
        builder.AppendLine(@"  updated_at TEXT NOT NULL,");
        builder.AppendLine(@"  FOREIGN KEY(task_id) REFERENCES tasks(id)");
        builder.AppendLine(@");");

        builder.AppendLine(@"CREATE TABLE IF NOT EXISTS tabs (");
        builder.AppendLine(@"  id TEXT PRIMARY KEY,");
        builder.AppendLine(@"  label TEXT NOT NULL,");
        builder.AppendLine(@"  project TEXT NOT NULL,");
        builder.AppendLine(@"  section TEXT NULL,");
        builder.AppendLine(@"  sort_order INTEGER NOT NULL DEFAULT 0");
        builder.AppendLine(@");");

        builder.AppendLine(@"CREATE TABLE IF NOT EXISTS activity_events (");
        builder.AppendLine(@"  id TEXT PRIMARY KEY,");
        builder.AppendLine(@"  task_id TEXT NULL,");
        builder.AppendLine(@"  type TEXT NOT NULL,");
        builder.AppendLine(@"  description TEXT NOT NULL,");
        builder.AppendLine(@"  actor TEXT NULL,");
        builder.AppendLine(@"  occurred_at TEXT NOT NULL");
        builder.AppendLine(@");");

        builder.AppendLine(@"CREATE TABLE IF NOT EXISTS oauth_tokens (");
        builder.AppendLine(@"  id INTEGER PRIMARY KEY CHECK (id = 1),");
        builder.AppendLine(@"  access_token TEXT NOT NULL,");
        builder.AppendLine(@"  refresh_token TEXT NOT NULL,");
        builder.AppendLine(@"  expires_at TEXT NOT NULL");
        builder.AppendLine(@");");

        builder.AppendLine(@"CREATE INDEX IF NOT EXISTS idx_notes_task_id ON notes(task_id);");
        builder.AppendLine(@"CREATE INDEX IF NOT EXISTS idx_activity_task_id ON activity_events(task_id);");

        command.CommandText = builder.ToString();
        command.ExecuteNonQuery();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }
}
