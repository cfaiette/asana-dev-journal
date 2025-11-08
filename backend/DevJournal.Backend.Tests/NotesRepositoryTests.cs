using System;
using System.Collections.Generic;
using DevJournal.Backend;
using DevJournal.Backend.Notes;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DevJournal.Backend.Tests;

public sealed class NotesRepositoryTests : IDisposable
{
    private readonly DatabaseContext _databaseContext;
    private readonly NotesRepository _repository;

    public NotesRepositoryTests()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Path"] = ":memory:"
            })
            .Build();

        _databaseContext = new DatabaseContext(configuration);
        _repository = new NotesRepository(_databaseContext);
    }

    [Fact]
    public async Task AddNoteAsync_PersistsAndReturnsNewNote()
    {
        var note = await _repository.AddNoteAsync("task-123", "remember the milk");

        var notes = await _repository.GetNotesAsync();

        Assert.Single(notes);
        Assert.Equal(note.Id, notes[0].Id);
        Assert.Equal("task-123", notes[0].TaskId);
        Assert.Equal("remember the milk", notes[0].Content);
    }

    [Fact]
    public async Task GetNotesByTaskIdsAsync_FiltersCorrectly()
    {
        await _repository.AddNoteAsync("task-1", "note one");
        await _repository.AddNoteAsync("task-2", "note two");

        var results = await _repository.GetNotesByTaskIdsAsync(new[] { "task-2" });

        Assert.Single(results);
        Assert.Equal("task-2", results[0].TaskId);
    }

    public void Dispose()
    {
        _databaseContext.Dispose();
    }
}
