using System;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend;

/// <summary>
/// Provides a shared SQLite connection for repositories. The actual schema migrations will be added later.
/// </summary>
public sealed class DatabaseContext : IDisposable
{
    private readonly SqliteConnection _connection;

    public DatabaseContext()
    {
        _connection = new SqliteConnection("Data Source=devjournal.db");
        _connection.Open();
    }

    public SqliteConnection Connection => _connection;

    public void Dispose()
    {
        _connection.Dispose();
    }
}
