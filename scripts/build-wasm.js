const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const scriptName = isWindows ? 'build-wasm.ps1' : 'build-wasm.sh';
const scriptPath = path.join(__dirname, scriptName);

console.log('Building .NET backend to WebAssembly...');

try {
  if (isWindows) {
    execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } else {
    if (!fs.existsSync(scriptPath)) {
      console.error(`Error: Build script not found at ${scriptPath}`);
      process.exit(1);
    }
    fs.chmodSync(scriptPath, '755');
    execSync(`bash "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  }
  console.log('✓ WASM build completed successfully');
} catch (error) {
  console.error('✗ WASM build failed:', error.message);
  process.exit(1);
}

