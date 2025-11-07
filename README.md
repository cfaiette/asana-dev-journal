# Asana Dev Journal

This project implements an online developer journal tightly integrated with Asana. The application is composed of:

- A lightweight Angular front-end located in [`frontend/`](frontend/) for all client interactions.
- A new .NET WebAssembly backend hosted inside [`backend/`](backend/) that provides REST APIs, handles OAuth with Asana, and stores data in SQLite.

## High-level features

* OAuth 2.0 authentication with Asana.
* Display of assigned tasks, grouped tabs, and historical activity feeds.
* Advanced filtering of task metadata.
* Timestamps notes and QA/PR review feedback attached to tasks.
* Automatic status updates when a user signs in or clicks the update button.

## Technology overview

| Layer      | Stack                                                                              |
|------------|------------------------------------------------------------------------------------|
| Front-end  | Angular 17 + RxJS                                                                  |
| Backend    | ASP.NET Core minimal APIs compiled to WebAssembly (`Microsoft.NET.Sdk.WebAssembly`) |
| Database   | SQLite (via `Microsoft.Data.Sqlite`)                                               |

The backend runs inside the .NET WebAssembly runtime to align with the requested architecture while still exposing familiar ASP.NET Core minimal APIs.

## Repository layout

```
.
├── backend/                # .NET WebAssembly backend host
├── docs/                   # Architecture and integration notes
└── frontend/               # Angular workspace generated via Angular CLI
```

## Getting started

1. Install prerequisites:
   - Node.js 18+
   - .NET 8 SDK (required for building the WebAssembly backend)

2. Restore dependencies

   ```bash
   cd frontend
   npm install

   cd ../backend
   dotnet restore
   ```

3. Launch the development experience

   ```bash
   # Terminal 1 - backend (served through the .NET WebAssembly host)
   cd backend
   dotnet run --project DevJournal.Backend

   # Terminal 2 - Angular front-end
   cd frontend
   npm start
   ```

4. Browse to `http://localhost:4200` to use the journal UI.

Refer to [`docs/backend-architecture.md`](docs/backend-architecture.md) for additional information about the WebAssembly-based backend design and Asana integration strategy.
