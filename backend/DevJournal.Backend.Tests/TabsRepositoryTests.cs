using System;
using System.Collections.Generic;
using DevJournal.Backend;
using DevJournal.Backend.Tabs;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DevJournal.Backend.Tests;

public sealed class TabsRepositoryTests : IDisposable
{
    private readonly DatabaseContext _databaseContext;
    private readonly TabsRepository _repository;

    public TabsRepositoryTests()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Path"] = ":memory:"
            })
            .Build();

        _databaseContext = new DatabaseContext(configuration);
        _repository = new TabsRepository(_databaseContext);
    }

    [Fact]
    public async Task GetTabsAsync_ReturnsSeededTabs()
    {
        using var insert = new SqliteCommand(
            "INSERT INTO tabs (id, label, project, section, sort_order) VALUES (@id, @label, @project, @section, 0)",
            _databaseContext.Connection);
        insert.Parameters.AddWithValue("@id", "proj-section");
        insert.Parameters.AddWithValue("@label", "Project / Section");
        insert.Parameters.AddWithValue("@project", "Project");
        insert.Parameters.AddWithValue("@section", "Section");
        await insert.ExecuteNonQueryAsync();

        var tabs = await _repository.GetTabsAsync();

        Assert.Single(tabs);
        Assert.Equal("proj-section", tabs[0].Id);
        Assert.Equal("Project", tabs[0].Project);
        Assert.Equal("Section", tabs[0].Section);
    }

    public void Dispose()
    {
        _databaseContext.Dispose();
    }
}
