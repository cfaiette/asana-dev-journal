using System.Net.Http;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace DevJournal.Backend.Asana;

public sealed class OAuthService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public OAuthService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public IResult BuildLoginRedirect()
    {
        // TODO: replace with configuration-driven values
        var clientId = "YOUR_ASANA_CLIENT_ID";
        var redirectUri = "https://your-app.example.com/auth/callback";
        var state = Guid.NewGuid().ToString("N");
        var url = $"https://app.asana.com/-/oauth_authorize?response_type=code&client_id={clientId}&redirect_uri={Uri.EscapeDataString(redirectUri)}&state={state}";
        return Results.Redirect(url);
    }

    public async Task ExchangeCodeAsync(string code)
    {
        var client = _httpClientFactory.CreateClient("asana");
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = "YOUR_ASANA_CLIENT_ID",
            ["client_secret"] = "YOUR_ASANA_CLIENT_SECRET",
            ["redirect_uri"] = "https://your-app.example.com/auth/callback",
            ["code"] = code
        });

        using var response = await client.PostAsync("https://app.asana.com/-/oauth_token", content);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        var payload = await JsonDocument.ParseAsync(stream);
        // TODO: persist tokens in SQLite
        _ = payload;
    }
}
