# Backend Architecture (.NET WebAssembly)

The backend fulfills two primary roles:

1. Acts as the OAuth 2.0 bridge between the Angular client and Asana.
2. Persists user notes, task metadata, tab mappings, and activity history in SQLite while exposing them through REST APIs.

## Technology Stack

- **Runtime**: .NET 8 WebAssembly runtime hosted with `Microsoft.NET.Sdk.WebAssembly`.
- **Server Model**: ASP.NET Core minimal APIs compiled to WebAssembly using the `wasm-tools` workload. The generated output is served through a lightweight static host (e.g., ASP.NET Core, Nginx, or a CDN) that delivers the WebAssembly bundle.
- **Data Access**: `Microsoft.Data.Sqlite` for lightweight relational storage.
- **Asana Integration**: Official Asana REST API over `HttpClient`.

## Project Structure

```
backend/
└── DevJournal.Backend/
    ├── DevJournal.Backend.csproj
    ├── Program.cs
    ├── Asana/
    │   ├── AsanaClient.cs
    │   └── OAuthService.cs
    ├── Notes/
    │   ├── NotesController.cs
    │   └── NotesRepository.cs
    ├── Tabs/
    │   ├── TabsController.cs
    │   └── TabsRepository.cs
    └── Tasks/
        ├── TasksController.cs
        └── TaskSyncService.cs
```

> **Note:** Only the project scaffolding is currently committed; the feature work above will be implemented incrementally.

## Development workflow

1. Install the WebAssembly build workload:

   ```bash
   dotnet workload install wasm-tools
   ```

2. Restore packages and build the project:

   ```bash
   cd backend/DevJournal.Backend
   dotnet build
   ```

3. Run the server locally:

   ```bash
   dotnet run --no-build --project DevJournal.Backend.csproj
   ```

   The application listens on the configured port (default `http://localhost:5191`) using the embedded WebAssembly host.

4. Update the Angular environment configuration to point to the backend origin.

## Integration outline

- **OAuth**: The backend exposes `/auth/login` and `/auth/callback` endpoints. The login endpoint redirects to Asana's OAuth consent screen; the callback exchanges the authorization code for tokens and persists them in SQLite.
- **Task Synchronization**: A background task (triggered on login and by a periodic timer) calls the Asana API, updates task rows in SQLite, and maps project/section metadata to the configured tabs.
- **Notes**: The `/notes` endpoints provide CRUD operations with timestamps, enabling the front-end to present sortable note feeds.
- **Activity Feed**: The backend normalizes events retrieved from Asana (task updates, comments, completions) and records them in the `activity_entries` table, which can be filtered by date, task, or event type.

This design keeps the backend consistent with the request to use a .NET Core WebAssembly runtime while enabling interoperability with the Angular client and SQLite storage.
