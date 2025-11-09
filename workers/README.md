# Cloudflare Workers

This directory contains the Cloudflare Worker implementation for DevJournal.

## WASM Support

The worker can load and execute WebAssembly modules compiled from the .NET backend. To build the WASM module:

```bash
pnpm build:wasm
```

This will compile the .NET backend to WebAssembly and output it to `workers/wasm/`.

## Development

```bash
cd workers
pnpm start
```

## Deployment

```bash
cd workers
pnpm deploy
```

## Configuration

Configure your environment variables in `wrangler.toml` or via Cloudflare dashboard:
- `ASANA_CLIENT_ID`
- `ASANA_CLIENT_SECRET`
- `ASANA_WORKSPACE_ID` (optional)
- `ASANA_REDIRECT_BASE` (optional)

