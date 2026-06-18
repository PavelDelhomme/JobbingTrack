import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Chiffrement AES-256-CBC des payloads file télémétrie / sync offline.
/// Clé 256 bits unique par appareil (Keychain / EncryptedSharedPreferences).
class TelemetryAtRestCipher {
  TelemetryAtRestCipher._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

  static const _keyName = 'jt_telemetry_queue_aes_key_v1';
  static const String encryptedPrefix = 'enc:';

  /// Clé fixe pour tests unitaires (hors Keychain).
  static Uint8List? debugTestKey;

  static Future<String> encrypt(String plaintext) async {
    final key = enc.Key(await _loadOrCreateKeyBytes());
    final iv = enc.IV(_randomBytes(16));
    final aes = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    final encrypted = aes.encrypt(plaintext, iv: iv);
    final payload = base64Encode(Uint8List.fromList([...iv.bytes, ...encrypted.bytes]));
    return '$encryptedPrefix$payload';
  }

  static Future<String> decrypt(String line) async {
    final trimmed = line.trim();
    if (!trimmed.startsWith(encryptedPrefix)) return trimmed;
    final key = enc.Key(await _loadOrCreateKeyBytes());
    final raw = base64Decode(trimmed.substring(encryptedPrefix.length));
    if (raw.length < 17) throw FormatException('payload chiffré invalide');
    final iv = enc.IV(raw.sublist(0, 16));
    final cipher = enc.Encrypted(raw.sublist(16));
    final aes = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    return aes.decrypt(cipher, iv: iv);
  }

  static Future<Uint8List> _loadOrCreateKeyBytes() async {
    if (debugTestKey != null) return debugTestKey!;
    final existing = await _storage.read(key: _keyName);
    if (existing != null && existing.isNotEmpty) {
      return base64Decode(existing);
    }
    final key = _randomBytes(32);
    await _storage.write(key: _keyName, value: base64Encode(key));
    debugPrint('[TelemetryCipher] Clé AES-256 appareil créée');
    return key;
  }

  static Uint8List _randomBytes(int length) {
    final rnd = Random.secure();
    return Uint8List.fromList(List.generate(length, (_) => rnd.nextInt(256)));
  }
}
