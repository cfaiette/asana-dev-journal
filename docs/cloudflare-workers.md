# Cloudflare Workers deployment guide

This document describes how to run the Asana Dev Journal API on Cloudflare Workers so the Angular front-end can be hosted entirely at the edge. The Worker mirrors the existing WebAssembly backend while using Cloudflare D1 for persistence and KV for OAuth state.

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) 3.60+
- A Cloudflare account with access to Workers, KV and D1
- Asana OAuth application credentials (client ID + client secret)

## Project structure

The Worker lives in [`workers/`](../workers/) and is written in TypeScript. Key files include:

- `wrangler.toml` – Worker configuration, route bindings, and variable declarations
- `src/worker.ts` – request handler implementing the REST API
- `migrations/` – SQL migrations that provision the required D1 tables and indexes

## Local development

1. Install dependencies and generate the local D1 database:

   ```bash
   cd workers
   npm install
   wrangler d1 migrations apply devjournal --local
   ```

2. Provide local environment variables. Create a `.dev.vars` file next to `wrangler.toml` with:

   ```bash
   ASANA_CLIENT_ID=<your-asana-client-id>
   ASANA_CLIENT_SECRET=<your-asana-client-secret>
   ASANA_REDIRECT_BASE=http://localhost:4200
   # Optional: override the workspace used for sync
   # ASANA_WORKSPACE_ID=<asana-workspace-gid>
   ```

   For OAuth testing you can point the Asana redirect URL to `http://localhost:4200/auth/asana/callback`.

3. Start the Worker emulator:

   ```bash
   wrangler dev --local
   ```

   The Worker listens on `http://127.0.0.1:8787`. The Angular CLI proxy (`frontend/proxy.conf.json`) forwards `/api` requests to the Worker.

4. Launch the Angular front-end from another terminal:

   ```bash
   cd frontend
   npm start
   ```

## Cloudflare configuration

1. **Create the D1 database**

   ```bash
   wrangler d1 create devjournal
   wrangler d1 migrations apply devjournal
   ```

   Update the `database_id` inside `wrangler.toml` with the ID returned by `wrangler d1 create`.

2. **Provision the KV namespace**

   ```bash
   wrangler kv namespace create devjournal-state
   ```

   Copy the namespace ID and assign it to the `STATE` binding in `wrangler.toml` (set both `id` and `preview_id`).

3. **Configure secrets** – store sensitive values with Wrangler so they are not committed to the repo:

   ```bash
   wrangler secret put ASANA_CLIENT_ID
   wrangler secret put ASANA_CLIENT_SECRET
   wrangler secret put ASANA_REDIRECT_BASE
   # Optional
   # wrangler secret put ASANA_WORKSPACE_ID
   ```

   `ASANA_AUTH_URL` and `ASANA_TOKEN_URL` default to Asana's public endpoints but can be overridden if required.

4. **Deploy the Worker**

   ```bash
   npm run deploy
   ```

   Configure a route in Cloudflare (e.g. `https://journal.example.com/api/*`) to point at the Worker. Host the Angular static bundle with Cloudflare Pages or any static host on the same domain so OAuth redirects share a common origin.

5. **Operations tips**

   - `wrangler tail` streams Worker logs and is helpful for monitoring OAuth exchanges or Asana sync errors.
   - Schedule periodic syncs using [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) by invoking the `/api/journal/sync` route.
   - D1 has storage limits; periodically archive old activity events if the table grows beyond operational limits.

With these steps the Dev Journal runs entirely from Cloudflare's edge network while maintaining the same API contract as the .NET implementation.
