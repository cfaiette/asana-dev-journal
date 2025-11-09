#!/bin/bash

OUTPUT_DIR="${1:-workers/wasm}"
BACKEND_PATH="backend/DevJournal.Backend.Wasm"

echo "Building .NET backend to WebAssembly..."

if [ ! -d "$BACKEND_PATH" ]; then
    echo "Error: WASM project not found at $BACKEND_PATH"
    exit 1
fi

cd "$BACKEND_PATH" || exit 1

echo "Restoring dependencies..."
dotnet restore

echo "Publishing to WASM..."
dotnet publish -c Release -r wasi-wasm -p:PublishAot=true -p:InvariantGlobalization=true \
    -p:WasmSingleFile=true -p:WasmBuildNative=true \
    --self-contained -o "../../$OUTPUT_DIR"

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "WASM build completed successfully!"
echo "Output directory: $OUTPUT_DIR"

