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

## Next steps

The current implementation provides scaffolding for:

- Asana OAuth and API client integration
- SQLite-backed repositories for tasks, notes, and tabs
- Minimal API endpoints for the Angular application

Future work will flesh out the OAuth persistence layer, add migrations, and secure the API surface.
