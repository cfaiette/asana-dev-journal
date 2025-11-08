# DevJournal Backend (WebAssembly + .NET 8)

This directory hosts the WebAssembly-based ASP.NET Core backend for the Asana Dev Journal. It exposes REST endpoints consumed by the Angular client while persisting data in SQLite.

## Prerequisites

- .NET 8 SDK
- WebAssembly workload: `dotnet workload install wasm-tools`

## Restore & build

```bash
cd DevJournal.Backend
dotnet restore
dotnet build
```

## Run locally

```bash
dotnet run --project DevJournal.Backend.csproj
```

By default the WebAssembly host listens on `http://localhost:5191`.

## Configuration

The backend reads configuration from `appsettings.json` and environment variables. Key settings include:

| Setting | Description |
| --- | --- |
| `AsanaOAuth:ClientId` / `ClientSecret` | Credentials for the Asana OAuth application. |
| `AsanaOAuth:WorkspaceId` | Workspace identifier passed when syncing assigned tasks. |
| `Database:Path` | SQLite database file path. Use `:memory:` for ephemeral stores in tests. |

## Capabilities

The backend now provides:

- A configuration-driven Asana OAuth flow that persists tokens in SQLite and returns the authenticated user profile.
- REST endpoints under `/api/journal/*` that match the Angular client's envelope contract for tasks, activity, and tabs.
- Automatic schema bootstrapping for tasks, notes, tabs, activity, and OAuth token tables.
- Repository unit tests (`dotnet test backend/DevJournal.Backend.Tests`) covering notes and tab persistence.
