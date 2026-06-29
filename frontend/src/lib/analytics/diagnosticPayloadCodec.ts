const COMPRESSED_PREFIX = "gz:";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream indisponible dans ce navigateur");
  }
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

export async function decompressJsonPayload(
  payload: string,
): Promise<Record<string, unknown> | null> {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  try {
    if (!trimmed.startsWith(COMPRESSED_PREFIX)) {
      return JSON.parse(trimmed) as Record<string, unknown>;
    }
    const raw = await gunzipBytes(
      base64ToBytes(trimmed.slice(COMPRESSED_PREFIX.length)),
    );
    return JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function decompressImageDataUrl(
  payload: string,
): Promise<string | null> {
  const trimmed = payload.trim();
  if (!trimmed.startsWith(COMPRESSED_PREFIX)) return null;
  try {
    const raw = await gunzipBytes(
      base64ToBytes(trimmed.slice(COMPRESSED_PREFIX.length)),
    );
    const b64 = btoa(String.fromCharCode(...raw));
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}
