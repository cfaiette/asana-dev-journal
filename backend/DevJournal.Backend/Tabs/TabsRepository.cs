using DevJournal.Backend;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Tabs;

public sealed record TabDto(string Id, string Label, string? AsanaSectionId);

public sealed class TabsRepository
{
    private readonly DatabaseContext _databaseContext;

    public TabsRepository(DatabaseContext databaseContext)
    {
        _databaseContext = databaseContext;
    }

    public Task<IReadOnlyList<TabDto>> GetTabsAsync()
    {
        const string sql = "SELECT id, label, asana_section_id FROM tabs ORDER BY sort_order";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = command.ExecuteReader();

        var tabs = new List<TabDto>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var label = reader.GetString(1);
            var sectionId = reader.IsDBNull(2) ? null : reader.GetString(2);
            tabs.Add(new TabDto(id, label, sectionId));
        }

        return Task.FromResult<IReadOnlyList<TabDto>>(tabs);
    }
}
