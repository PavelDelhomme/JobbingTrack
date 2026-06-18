const zlib = require('zlib');

const COMPRESSED_PREFIX = 'gz:';

function decompressJson(payload) {
  if (payload == null || typeof payload !== 'string') {
    throw new Error('Payload diagnostic invalide');
  }
  const trimmed = payload.trim();
  if (!trimmed.startsWith(COMPRESSED_PREFIX)) {
    return JSON.parse(trimmed);
  }
  const raw = zlib.gunzipSync(
    Buffer.from(trimmed.slice(COMPRESSED_PREFIX.length), 'base64'),
  );
  return JSON.parse(raw.toString('utf8'));
}

function tryDecompressJson(payload) {
  try {
    return decompressJson(payload);
  } catch {
    return null;
  }
}

function decompressBytes(payload) {
  if (payload == null || typeof payload !== 'string') {
    throw new Error('Payload binaire invalide');
  }
  const trimmed = payload.trim();
  if (!trimmed.startsWith(COMPRESSED_PREFIX)) {
    return Buffer.from(trimmed, 'base64');
  }
  return zlib.gunzipSync(
    Buffer.from(trimmed.slice(COMPRESSED_PREFIX.length), 'base64'),
  );
}

function tryDecompressBytes(payload) {
  try {
    return decompressBytes(payload);
  } catch {
    return null;
  }
}

module.exports = {
  decompressJson,
  tryDecompressJson,
  decompressBytes,
  tryDecompressBytes,
};
