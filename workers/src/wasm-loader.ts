interface WasmModule {
  handle_request(
    methodPtr: number,
    methodLen: number,
    pathPtr: number,
    pathLen: number,
    queryPtr: number,
    queryLen: number,
    bodyPtr: number,
    bodyLen: number,
    responsePtr: number
  ): number;
  memory?: WebAssembly.Memory;
}

let wasmModule: WasmModule | null = null;

export async function loadWasmModule(wasmBytes?: ArrayBuffer): Promise<WasmModule> {
  if (wasmModule) {
    return wasmModule;
  }

  try {
    let bytes: ArrayBuffer;
    
    if (wasmBytes) {
      bytes = wasmBytes;
    } else {
      const response = await fetch('/wasm/DevJournal.Backend.Wasm.wasm');
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.statusText}`);
      }
      bytes = await response.arrayBuffer();
    }

    const wasmModule_ = await WebAssembly.instantiate(bytes, {
      wasi_snapshot_preview1: {
        proc_exit: () => {},
        fd_write: () => {},
        fd_seek: () => {},
        fd_close: () => {},
        environ_sizes_get: () => {},
        environ_get: () => {}
      }
    });

    wasmModule = {
      ...(wasmModule_.instance.exports as unknown as WasmModule),
      memory: (wasmModule_.instance.exports as any).memory as WebAssembly.Memory
    };
    
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
}

export async function handleRequestWithWasm(
  request: Request,
  wasmModule: WasmModule
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  const query = url.search.substring(1);
  const body = await request.text();

  const memory = wasmModule.memory;
  if (!memory) {
    throw new Error('WASM module memory not available');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const methodBytes = encoder.encode(method);
  const pathBytes = encoder.encode(path);
  const queryBytes = encoder.encode(query);
  const bodyBytes = encoder.encode(body);

  const methodPtr = 0;
  const pathPtr = methodPtr + methodBytes.length + 1;
  const queryPtr = pathPtr + pathBytes.length + 1;
  const bodyPtr = queryPtr + queryBytes.length + 1;
  const responsePtr = bodyPtr + bodyBytes.length + 1;

  const totalSize = responsePtr + 1024 * 1024;
  const currentPages = memory.buffer.byteLength / 65536;
  const neededPages = Math.ceil(totalSize / 65536);
  
  if (neededPages > currentPages) {
    memory.grow(neededPages - currentPages);
  }

  const view = new Uint8Array(memory.buffer);
  view.set(methodBytes, methodPtr);
  view[methodPtr + methodBytes.length] = 0;
  view.set(pathBytes, pathPtr);
  view[pathPtr + pathBytes.length] = 0;
  view.set(queryBytes, queryPtr);
  view[queryPtr + queryBytes.length] = 0;
  view.set(bodyBytes, bodyPtr);
  view[bodyPtr + bodyBytes.length] = 0;

  const responseLen = wasmModule.handle_request(
    methodPtr,
    methodBytes.length,
    pathPtr,
    pathBytes.length,
    queryPtr,
    queryBytes.length,
    bodyPtr,
    bodyBytes.length,
    responsePtr
  );

  const responseBytes = view.slice(responsePtr, responsePtr + responseLen);
  const responseText = decoder.decode(responseBytes);
  const responseJson = JSON.parse(responseText);

  return new Response(JSON.stringify(responseJson), {
    headers: { 'content-type': 'application/json' }
  });
}

