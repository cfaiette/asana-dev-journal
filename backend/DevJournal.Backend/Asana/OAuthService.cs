using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace DevJournal.Backend.Asana;

public sealed class OAuthService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _memoryCache;
    private readonly OAuthTokenStore _tokenStore;
    private readonly AsanaOAuthOptions _options;

    private const string StateCachePrefix = "asana-oauth-state";

    public OAuthService(
        IHttpClientFactory httpClientFactory,
        IMemoryCache memoryCache,
        OAuthTokenStore tokenStore,
        IOptions<AsanaOAuthOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _memoryCache = memoryCache;
        _tokenStore = tokenStore;
        _options = options.Value;
    }

    public IResult BuildLoginRedirect(string redirectUri)
    {
        if (string.IsNullOrWhiteSpace(redirectUri))
        {
            return Results.BadRequest(new { error = "missing_redirect_uri" });
        }

        var nonce = Guid.NewGuid().ToString("N");
        var statePayload = new OAuthState(nonce, redirectUri);
        _memoryCache.Set(StateCacheKey(nonce), statePayload, TimeSpan.FromMinutes(10));

        var url = new UriBuilder(_options.AuthorizationUri)
        {
            Query = $"response_type=code&client_id={Uri.EscapeDataString(_options.ClientId)}&redirect_uri={Uri.EscapeDataString(redirectUri)}&state={Uri.EscapeDataString(EncodeState(statePayload))}"
        };

        return Results.Redirect(url.Uri.ToString());
    }

    public async Task<OAuthExchangeResult> ExchangeCodeAsync(string code, string state)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Code is required", nameof(code));
        }

        if (string.IsNullOrWhiteSpace(state))
        {
            throw new ArgumentException("State is required", nameof(state));
        }

        var decodedState = DecodeState(state);
        if (!_memoryCache.TryGetValue(StateCacheKey(decodedState.Nonce), out OAuthState? cachedState))
        {
            throw new InvalidOperationException("OAuth state not found or expired.");
        }

        var client = _httpClientFactory.CreateClient("asana");
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["redirect_uri"] = cachedState.RedirectUri,
            ["code"] = code
        });

        using var response = await client.PostAsync(_options.TokenUri, content);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        var payload = await JsonSerializer.DeserializeAsync<AsanaTokenEnvelope>(stream) ?? throw new InvalidOperationException("Unable to parse token response.");

        var expiresAt = DateTimeOffset.UtcNow.AddSeconds(payload.Data.ExpiresIn);
        var token = new OAuthToken(payload.Data.AccessToken, payload.Data.RefreshToken, expiresAt);
        await _tokenStore.SaveAsync(token);

        var user = await FetchCurrentUserAsync(token.AccessToken);
        return new OAuthExchangeResult(user, token.AccessToken);
    }

    private async Task<AsanaUserDto> FetchCurrentUserAsync(string accessToken)
    {
        var client = _httpClientFactory.CreateClient("asana");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.GetAsync("https://app.asana.com/api/1.0/users/me");
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        var payload = await JsonSerializer.DeserializeAsync<AsanaUserEnvelope>(stream) ?? throw new InvalidOperationException("Unable to parse user payload.");

        return new AsanaUserDto(payload.Data.Gid, payload.Data.Name, payload.Data.Email, payload.Data.Photo?.Image_1024x1024 ?? payload.Data.Photo?.Image_128x128);
    }

    private static string EncodeState(OAuthState state)
    {
        var json = JsonSerializer.Serialize(state);
        var bytes = Encoding.UTF8.GetBytes(json);
        return Convert.ToBase64String(bytes);
    }

    private static OAuthState DecodeState(string state)
    {
        Span<byte> buffer = stackalloc byte[state.Length];
        if (!Convert.TryFromBase64String(state, buffer, out var bytesWritten))
        {
            throw new InvalidOperationException("Invalid OAuth state format.");
        }

        var bytes = buffer[..bytesWritten].ToArray();
        var json = Encoding.UTF8.GetString(bytes);
        return JsonSerializer.Deserialize<OAuthState>(json) ?? throw new InvalidOperationException("Invalid OAuth state payload.");
    }

    private static string StateCacheKey(string nonce) => $"{StateCachePrefix}:{nonce}";

    private sealed record OAuthState(string Nonce, string RedirectUri);

    private sealed record AsanaTokenEnvelope(AsanaToken Data);

    private sealed record AsanaToken(string AccessToken, string RefreshToken, int ExpiresIn);

    private sealed record AsanaUserEnvelope(AsanaUser Data);

    private sealed record AsanaUser(string Gid, string Name, string Email, AsanaUserPhoto? Photo);

    private sealed record AsanaUserPhoto(string? Image_1024x1024, string? Image_128x128);
}

public sealed record OAuthExchangeResult(AsanaUserDto User, string AccessToken);

public sealed record AsanaUserDto(string Id, string Name, string Email, string? AvatarUrl);

public sealed class AsanaOAuthOptions
{
    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    public string AuthorizationUri { get; set; } = "https://app.asana.com/-/oauth_authorize";

    public string TokenUri { get; set; } = "https://app.asana.com/-/oauth_token";

    public string WorkspaceId { get; set; } = string.Empty;
}
