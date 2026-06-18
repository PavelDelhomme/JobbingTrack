import 'dart:convert';
import 'dart:io';

/// Compression gzip + base64 pour diagnostics et captures (stockage compact).
class DiagnosticPayloadCodec {
  DiagnosticPayloadCodec._();

  static const String compressedPrefix = 'gz:';

  static String compressJson(Map<String, dynamic> json) {
    final raw = utf8.encode(jsonEncode(json));
    final compressed = gzip.encode(raw);
    return '$compressedPrefix${base64Encode(compressed)}';
  }

  static String compressBytes(List<int> bytes) {
    final compressed = gzip.encode(bytes);
    return '$compressedPrefix${base64Encode(compressed)}';
  }

  static Map<String, dynamic> decompressJson(String payload) {
    final trimmed = payload.trim();
    if (!trimmed.startsWith(compressedPrefix)) {
      return jsonDecode(trimmed) as Map<String, dynamic>;
    }
    final raw = gzip.decode(base64Decode(trimmed.substring(compressedPrefix.length)));
    return jsonDecode(utf8.decode(raw)) as Map<String, dynamic>;
  }
}
