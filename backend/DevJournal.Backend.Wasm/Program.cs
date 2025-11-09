using System;
using System.Text;
using System.Text.Json;
using System.Runtime.InteropServices;

namespace DevJournal.Backend.Wasm;

public static class Program
{
    [UnmanagedCallersOnly(EntryPoint = "handle_request")]
    public static int HandleRequest(IntPtr methodPtr, int methodLen, IntPtr pathPtr, int pathLen, IntPtr queryPtr, int queryLen, IntPtr bodyPtr, int bodyLen, IntPtr responsePtr)
    {
        try
        {
            var method = Marshal.PtrToStringUTF8(methodPtr, methodLen) ?? "GET";
            var path = Marshal.PtrToStringUTF8(pathPtr, pathLen) ?? "/";
            var query = Marshal.PtrToStringUTF8(queryPtr, queryLen);
            var body = bodyLen > 0 ? Marshal.PtrToStringUTF8(bodyPtr, bodyLen) : null;

            var response = ProcessRequest(method, path, query, body);
            var responseJson = JsonSerializer.Serialize(response);
            var responseBytes = Encoding.UTF8.GetBytes(responseJson);

            if (responseBytes.Length > 1024 * 1024)
            {
                throw new InvalidOperationException("Response too large");
            }

            Marshal.Copy(responseBytes, 0, responsePtr, responseBytes.Length);
            return responseBytes.Length;
        }
        catch (Exception ex)
        {
            var error = new { error = ex.Message, status = 500 };
            var errorJson = JsonSerializer.Serialize(error);
            var errorBytes = Encoding.UTF8.GetBytes(errorJson);
            
            if (errorBytes.Length > 1024 * 1024)
            {
                errorBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { error = "Internal error", status = 500 }));
            }
            
            Marshal.Copy(errorBytes, 0, responsePtr, errorBytes.Length);
            return errorBytes.Length;
        }
    }

    private static object ProcessRequest(string method, string path, string? query, string? body)
    {
        if (path == "/health" || path == "/api/health")
        {
            return new { status = "ok" };
        }

        return new { error = "not_implemented", path, method };
    }
}

