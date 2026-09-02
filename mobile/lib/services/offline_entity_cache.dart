import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/services/telemetry_at_rest_cipher.dart';
import 'package:jobbingtrack_mobile/services/telemetry_payload_codec.dart';
import 'package:path_provider/path_provider.dart';

/// Clés de cache métier par utilisateur (lecture hors ligne).
abstract final class OfflineEntityKeys {
  static const applications = 'applications';
  static const companies = 'companies';
  static const contacts = 'contacts';
  static const interviews = 'interviews';
  static const followUps = 'followUps';
  static const calls = 'calls';
  static const events = 'events';
  static const notifications = 'notifications';
}

/// Persistance locale des listes métier pour consultation hors connexion.
class OfflineEntityCache {
  OfflineEntityCache._();
  static final OfflineEntityCache instance = OfflineEntityCache._();

  static const String _fileName = 'offline_entity_cache.json';

  final Map<String, Map<String, List<Map<String, dynamic>>>> _byUser = {};
  bool _loaded = false;

  Future<void> initialize() async {
    if (_loaded) return;
    await _loadFromDisk();
    _loaded = true;
  }

  Future<void> saveList(
    String userId,
    String key,
    List<Map<String, dynamic>> items,
  ) async {
    if (userId.isEmpty) return;
    await initialize();
    final userBucket = _byUser.putIfAbsent(userId, () => {});
    userBucket[key] = items.map((e) => Map<String, dynamic>.from(e)).toList();
    await _persistToDisk();
  }

  Future<List<Map<String, dynamic>>?> loadList(String userId, String key) async {
    if (userId.isEmpty) return null;
    await initialize();
    final items = _byUser[userId]?[key];
    if (items == null || items.isEmpty) return null;
    return items.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<void> clearUser(String userId) async {
    if (userId.isEmpty) return;
    await initialize();
    _byUser.remove(userId);
    await _persistToDisk();
  }

  Future<void> clearAll() async {
    _byUser.clear();
    _loaded = true;
    await _persistToDisk();
  }

  Future<void> _loadFromDisk() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      if (!await file.exists()) return;
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return;
      final decrypted = await TelemetryAtRestCipher.decrypt(raw.trim());
      final json = TelemetryPayloadCodec.decompressJson(decrypted);
      final users = json['users'];
      if (users is! Map) return;
      for (final entry in users.entries) {
        final userId = entry.key.toString();
        final bucket = entry.value;
        if (bucket is! Map) continue;
        final parsed = <String, List<Map<String, dynamic>>>{};
        for (final keyEntry in bucket.entries) {
          final list = keyEntry.value;
          if (list is! List) continue;
          parsed[keyEntry.key.toString()] = list
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
        if (parsed.isNotEmpty) _byUser[userId] = parsed;
      }
      debugPrint('[OfflineCache] ${_byUser.length} utilisateur(s) chargé(s)');
    } catch (e) {
      debugPrint('[OfflineCache] Lecture disque: $e');
    }
  }

  Future<void> _persistToDisk() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      final payload = {'users': _byUser};
      final compressed = TelemetryPayloadCodec.compressJson(payload);
      final encrypted = await TelemetryAtRestCipher.encrypt(compressed);
      await file.writeAsString('$encrypted\n');
    } catch (e) {
      debugPrint('[OfflineCache] Persistance disque: $e');
    }
  }
}
