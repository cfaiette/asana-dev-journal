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
| Edge API   | Cloudflare Workers (TypeScript) backed by Cloudflare D1 + KV                        |
| Database   | SQLite (via `Microsoft.Data.Sqlite`) or D1 (for Workers)                             |

The backend runs inside the .NET WebAssembly runtime to align with the requested architecture while still exposing familiar ASP.NET Core minimal APIs.

## Repository layout

```
.
├── backend/                # .NET WebAssembly backend host
├── docs/                   # Architecture and integration notes
├── frontend/               # Angular workspace generated via Angular CLI
└── workers/                # Cloudflare Worker that replaces the backend when deployed to the edge
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

3. Launch the development experience (WebAssembly backend)

   ```bash
   # Terminal 1 - backend (served through the .NET WebAssembly host)
   cd backend
   dotnet run --project DevJournal.Backend

   # Terminal 2 - Angular front-end
   cd frontend
   npm start
   ```

4. Browse to `http://localhost:4200` to use the journal UI.

### Running against the Cloudflare Worker locally

The `workers/` directory contains a TypeScript Cloudflare Worker that mirrors the REST API exposed by the WebAssembly backend. To exercise the Worker locally:

1. Install the Worker dependencies:

   ```bash
   cd workers
   npm install
   ```

2. Apply the D1 schema locally and start the Worker emulator:

   ```bash
   wrangler d1 migrations apply devjournal --local
   wrangler dev --local
   ```

   Wrangler binds the local D1 database and KV namespace declared in `wrangler.toml` and serves the API on `http://127.0.0.1:8787`.

3. In a second terminal start the Angular client with the included proxy config so that `/api` requests are forwarded to the Worker:

   ```bash
   cd frontend
   npm start
   ```

4. Open `http://localhost:4200` and exercise the application. OAuth redirects will flow through the Worker, and API requests will be stored in the local D1 database.

Refer to [`docs/cloudflare-workers.md`](docs/cloudflare-workers.md) for production deployment steps and configuration guidance.

Refer to [`docs/backend-architecture.md`](docs/backend-architecture.md) for additional information about the WebAssembly-based backend design and Asana integration strategy.
