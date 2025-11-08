using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace DevJournal.Backend.Asana;

public sealed record OAuthToken(string AccessToken, string RefreshToken, DateTimeOffset ExpiresAt);

public sealed class OAuthTokenStore
{
    private readonly DatabaseContext _databaseContext;

    public OAuthTokenStore(DatabaseContext databaseContext)
    {
        _databaseContext = databaseContext;
    }

    public async Task SaveAsync(OAuthToken token)
    {
        const string sql = @"INSERT INTO oauth_tokens (id, access_token, refresh_token, expires_at)
                             VALUES (1, @access_token, @refresh_token, @expires_at)
                             ON CONFLICT(id) DO UPDATE SET
                               access_token = excluded.access_token,
                               refresh_token = excluded.refresh_token,
                               expires_at = excluded.expires_at";

        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        command.Parameters.AddWithValue("@access_token", token.AccessToken);
        command.Parameters.AddWithValue("@refresh_token", token.RefreshToken);
        command.Parameters.AddWithValue("@expires_at", token.ExpiresAt.UtcDateTime);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<OAuthToken?> GetAsync()
    {
        const string sql = "SELECT access_token, refresh_token, expires_at FROM oauth_tokens WHERE id = 1";
        using var command = new SqliteCommand(sql, _databaseContext.Connection);
        using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        var accessToken = reader.GetString(0);
        var refreshToken = reader.GetString(1);
        var expiresAt = DateTime.SpecifyKind(reader.GetDateTime(2), DateTimeKind.Utc);
        return new OAuthToken(accessToken, refreshToken, expiresAt);
    }
}
