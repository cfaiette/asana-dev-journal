using System.Collections.Generic;
using DevJournal.Backend;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Tabs;

public sealed record TabDto(string Id, string Label, string Project, string? Section);

public sealed class TabsRepository
{
    private readonly DatabaseContext _databaseContext;

    public TabsRepository(DatabaseContext databaseContext)
    {
        _databaseContext = databaseContext;
    }

    public Task<IReadOnlyList<TabDto>> GetTabsAsync()
    {
        const string sql = "SELECT id, label, project, section FROM tabs ORDER BY sort_order, label";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = command.ExecuteReader();

        var tabs = new List<TabDto>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var label = reader.GetString(1);
            var project = reader.GetString(2);
            var section = reader.IsDBNull(3) ? null : reader.GetString(3);
            tabs.Add(new TabDto(id, label, project, section));
        }

        return Task.FromResult<IReadOnlyList<TabDto>>(tabs);
    }
}
