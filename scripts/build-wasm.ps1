param(
    [string]$OutputDir = "workers/wasm"
)

Write-Host "Building .NET backend to WebAssembly..." -ForegroundColor Green

$BackendPath = "backend/DevJournal.Backend.Wasm"
$WasmOutput = "$OutputDir"

if (-not (Test-Path $BackendPath)) {
    Write-Host "Error: WASM project not found at $BackendPath" -ForegroundColor Red
    exit 1
}

Push-Location $BackendPath

try {
    Write-Host "Restoring dependencies..." -ForegroundColor Yellow
    dotnet restore

    Write-Host "Publishing to WASM..." -ForegroundColor Yellow
    dotnet publish -c Release -r wasi-wasm -p:PublishAot=true -p:InvariantGlobalization=true `
        -p:WasmSingleFile=true -p:WasmBuildNative=true `
        --self-contained -o "../../$WasmOutput"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "WASM build completed successfully!" -ForegroundColor Green
    Write-Host "Output directory: $WasmOutput" -ForegroundColor Cyan
}
finally {
    Pop-Location
}

