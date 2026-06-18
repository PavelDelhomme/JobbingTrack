import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/services/analytics_telemetry_queue.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/http_correlation.dart';
import 'package:jobbingtrack_mobile/services/telemetry_at_rest_cipher.dart';
import 'package:jobbingtrack_mobile/services/telemetry_payload_codec.dart';
import 'package:jobbingtrack_mobile/services/telemetry_sanitize.dart';
import 'package:path_provider/path_provider.dart';

/// Mutation métier mise en attente (réseau indisponible).
class OfflineMutationQueued implements Exception {
  OfflineMutationQueued([this.message = 'Modification en file — synchronisation au retour réseau']);

  final String message;

  @override
  String toString() => message;
}

/// File persistante des écritures métier (CRUD) à rejouer au retour réseau.
class OfflineBusinessSyncQueue {
  OfflineBusinessSyncQueue._();
  static final OfflineBusinessSyncQueue instance = OfflineBusinessSyncQueue._();

  static const String _fileName = 'offline_business_sync_queue.jsonl';
  static const int _maxItems = 200;

  static const Set<String> _syncablePrefixes = {
    '/api/v1/applications',
    '/api/v1/calls',
    '/api/v1/follow-ups',
    '/api/v1/followups',
    '/api/v1/interviews',
    '/api/v1/contacts',
    '/api/v1/companies',
  };

  final List<_QueuedMutation> _pending = [];
  bool _loaded = false;
  bool _flushing = false;
  String? Function()? resolveAuthToken;

  int get pendingCount => _pending.length;

  static bool isSyncablePath(String path) {
    final normalized = path.split('?').first;
    return _syncablePrefixes.any(
      (prefix) => normalized == prefix || normalized.startsWith('$prefix/'),
    );
  }

  static bool isNetworkError(Object error) => AnalyticsTelemetryQueue.isNetworkError(error);

  static bool isRetriableHttpStatus(int statusCode) =>
      AnalyticsTelemetryQueue.isRetriableHttpStatus(statusCode);

  Future<void> initialize() async {
    if (_loaded) return;
    await _loadFromDisk();
    _loaded = true;
  }

  Future<void> enqueue({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    String? entityType,
    String? token,
  }) async {
    if (!isSyncablePath(path)) return;
    await initialize();
    final item = _QueuedMutation(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      method: method.toUpperCase(),
      path: path.split('?').first,
      body: TelemetrySanitize.forPersistenceOptional(body),
      entityType: entityType,
      token: token,
      createdAt: DateTime.now().toUtc(),
    );
    _pending.add(item);
    while (_pending.length > _maxItems) {
      _pending.removeAt(0);
    }
    await _persistToDisk();
    debugPrint('[OfflineSync] En file ($method $path) — total: ${_pending.length}');
  }

  Future<void> flush({String? authTokenOverride}) async {
    await initialize();
    if (_flushing || _pending.isEmpty) return;
    _flushing = true;
    try {
      final token = authTokenOverride ?? resolveAuthToken?.call();
      final ordered = List<_QueuedMutation>.from(_pending)
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

      var index = 0;
      while (index < ordered.length) {
        final sent = await _sendItem(ordered[index], token);
        if (!sent) break;
        index += 1;
      }

      if (index > 0) {
        final sentIds = ordered.take(index).map((e) => e.id).toSet();
        _pending.removeWhere((e) => sentIds.contains(e.id));
        await _persistToDisk();
        debugPrint('[OfflineSync] Flush OK — reste: ${_pending.length}');
      }
    } finally {
      _flushing = false;
    }
  }

  Future<bool> _sendItem(_QueuedMutation item, String? currentToken) async {
    try {
      final effectiveToken = currentToken ?? item.token;
      final headers = HttpCorrelation.jsonHeaders(bearerToken: effectiveToken);
      final uri = Uri.parse('${ApiService.baseUrl}${item.path}');
      http.Response response;
      switch (item.method) {
        case 'POST':
          response = await http
              .post(uri, headers: headers, body: jsonEncode(item.body ?? {}))
              .timeout(const Duration(seconds: 20));
          break;
        case 'PUT':
        case 'PATCH':
          response = await http
              .put(uri, headers: headers, body: jsonEncode(item.body ?? {}))
              .timeout(const Duration(seconds: 20));
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 20));
          break;
        default:
          debugPrint('[OfflineSync] Méthode ignorée: ${item.method}');
          return true;
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      }
      if (response.statusCode == 401 || response.statusCode == 403) {
        return false;
      }
      if (response.statusCode >= 500) {
        return false;
      }
      debugPrint('[OfflineSync] Rejet ${response.statusCode} sur ${item.path}');
      return true;
    } catch (e) {
      if (isNetworkError(e)) return false;
      debugPrint('[OfflineSync] Erreur envoi ${item.path}: $e');
      return false;
    }
  }

  Future<void> _loadFromDisk() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      if (!await file.exists()) return;
      for (final line in await file.readAsLines()) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) continue;
        try {
          final decrypted = await TelemetryAtRestCipher.decrypt(trimmed);
          final json = TelemetryPayloadCodec.decompressJson(decrypted);
          _pending.add(_QueuedMutation.fromJson(json));
        } catch (_) {}
      }
      debugPrint('[OfflineSync] ${_pending.length} mutation(s) chargée(s)');
    } catch (e) {
      debugPrint('[OfflineSync] Lecture disque: $e');
    }
  }

  Future<void> _persistToDisk() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      final lines = <String>[];
      for (final e in _pending) {
        final compressed = TelemetryPayloadCodec.compressJson(e.toJson());
        lines.add(await TelemetryAtRestCipher.encrypt(compressed));
      }
      await file.writeAsString(lines.isEmpty ? '' : '${lines.join('\n')}\n');
    } catch (e) {
      debugPrint('[OfflineSync] Persistance disque: $e');
    }
  }
}

class _QueuedMutation {
  _QueuedMutation({
    required this.id,
    required this.method,
    required this.path,
    required this.body,
    required this.entityType,
    required this.token,
    required this.createdAt,
  });

  final String id;
  final String method;
  final String path;
  final Map<String, dynamic>? body;
  final String? entityType;
  final String? token;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'method': method,
        'path': path,
        'body': body,
        'entityType': entityType,
        'createdAt': createdAt.toIso8601String(),
      };

  factory _QueuedMutation.fromJson(Map<String, dynamic> json) {
    return _QueuedMutation(
      id: json['id'] as String? ?? '',
      method: json['method'] as String? ?? 'POST',
      path: json['path'] as String? ?? '',
      body: json['body'] == null ? null : Map<String, dynamic>.from(json['body'] as Map),
      entityType: json['entityType'] as String?,
      token: null,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '')?.toUtc() ?? DateTime.now().toUtc(),
    );
  }
}
