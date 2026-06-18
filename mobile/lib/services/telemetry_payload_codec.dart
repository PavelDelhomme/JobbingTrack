import 'dart:convert';
import 'dart:io';

/// Compression gzip + base64 pour persistance compacte des files télémétrie/offline.
class TelemetryPayloadCodec {
  TelemetryPayloadCodec._();

  static const String compressedPrefix = 'gz:';

  static String compressJson(Map<String, dynamic> json) {
    final raw = utf8.encode(jsonEncode(json));
    final compressed = gzip.encode(raw);
    return '$compressedPrefix${base64Encode(compressed)}';
  }

  static Map<String, dynamic> decompressJson(String line) {
    final trimmed = line.trim();
    if (trimmed.startsWith(compressedPrefix)) {
      final payload = base64Decode(trimmed.substring(compressedPrefix.length));
      final raw = gzip.decode(payload);
      return Map<String, dynamic>.from(jsonDecode(utf8.decode(raw)) as Map);
    }
    return Map<String, dynamic>.from(jsonDecode(trimmed) as Map);
  }
}
