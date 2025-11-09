# Build Instructions

## Overview

The project supports building the frontend and compiling the .NET backend to WebAssembly for Cloudflare Workers deployment.

## Prerequisites

- .NET 8 SDK
- Node.js and pnpm
- WASI workload: `dotnet workload install wasi-experimental` (if available)

## Build Commands

### Build Everything

```bash
pnpm build
```

This will:
1. Build the Angular frontend
2. Compile the .NET backend to WebAssembly

### Build Frontend Only

```bash
pnpm build:frontend
```

### Build WASM Only

```bash
pnpm build:wasm
```

## WASM Build Process

The WASM build process:

1. Compiles `backend/DevJournal.Backend.Wasm` to WebAssembly using Native AOT
2. Outputs to `workers/wasm/` directory
3. Creates a WASM module compatible with Cloudflare Workers

## Cloudflare Workers Integration

The compiled WASM module can be loaded in the Cloudflare Worker using the `wasm-loader.ts` module. The worker will:

1. Load the WASM module on first request
2. Route requests through the WASM module
3. Return JSON responses

## Development

For local development, you can run the frontend and backend separately:

```bash
# Frontend
cd frontend
pnpm start

# Backend (separate terminal)
cd backend/DevJournal.Backend
dotnet run --urls "http://devjournal.app:51910"
```

## Deployment

For Cloudflare Workers deployment:

1. Build the WASM module: `pnpm build:wasm`
2. Deploy the worker: `cd workers && pnpm deploy`

The WASM module will be included in the worker bundle.

