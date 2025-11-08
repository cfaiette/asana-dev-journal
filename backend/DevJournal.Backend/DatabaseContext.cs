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
        MigrateLegacyNotesSchema();

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
        builder.AppendLine(@"  updated_at TEXT NOT NULL");
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

    private void MigrateLegacyNotesSchema()
    {
        using var pragma = _connection.CreateCommand();
        pragma.CommandText = "PRAGMA foreign_key_list(notes);";
        using var reader = pragma.ExecuteReader();
        if (!reader.Read())
        {
            return;
        }

        reader.Close();

        using var transaction = _connection.BeginTransaction();

        using (var dropTemp = _connection.CreateCommand())
        {
            dropTemp.Transaction = transaction;
            dropTemp.CommandText = "DROP TABLE IF EXISTS notes_migration;";
            dropTemp.ExecuteNonQuery();
        }

        using (var create = _connection.CreateCommand())
        {
            create.Transaction = transaction;
            create.CommandText = @"CREATE TABLE notes_migration (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL
);";
            create.ExecuteNonQuery();
        }

        using (var copy = _connection.CreateCommand())
        {
            copy.Transaction = transaction;
            copy.CommandText = @"INSERT INTO notes_migration (id, task_id, content, updated_at)
SELECT id, task_id, content, updated_at FROM notes;";
            copy.ExecuteNonQuery();
        }

        using (var drop = _connection.CreateCommand())
        {
            drop.Transaction = transaction;
            drop.CommandText = "DROP TABLE notes;";
            drop.ExecuteNonQuery();
        }

        using (var rename = _connection.CreateCommand())
        {
            rename.Transaction = transaction;
            rename.CommandText = "ALTER TABLE notes_migration RENAME TO notes;";
            rename.ExecuteNonQuery();
        }

        transaction.Commit();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }
}
