import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/http_correlation.dart';
import 'package:jobbingtrack_mobile/services/telemetry_at_rest_cipher.dart';
import 'package:jobbingtrack_mobile/services/telemetry_payload_codec.dart';
import 'package:jobbingtrack_mobile/services/telemetry_sanitize.dart';
import 'package:path_provider/path_provider.dart';

/// File d'attente persistante pour analytics / erreurs / retours mobile.
/// Persistance gzip, sans JWT sur disque, flush batch des événements au retour réseau.
class AnalyticsTelemetryQueue {
  AnalyticsTelemetryQueue._();
  static final AnalyticsTelemetryQueue instance = AnalyticsTelemetryQueue._();

  static const String _fileName = 'analytics_telemetry_queue.jsonl';
  static const int _maxItems = 500;
  static const int _batchEventSize = 20;

  final List<_QueuedTelemetry> _pending = [];
  bool _loaded = false;
  bool _flushing = false;
  String? Function()? resolveAuthToken;

  int get pendingCount => _pending.length;

  Future<void> clearAll() async {
    _pending.clear();
    _loaded = true;
    await _persistToDisk();
  }

  Future<void> initialize() async {
    if (_loaded) return;
    await _loadFromDisk();
    _loaded = true;
  }

  Future<void> enqueue({
    required String kind,
    required String path,
    required Map<String, dynamic> body,
    String? token,
  }) async {
    await initialize();
    final item = _QueuedTelemetry(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      kind: kind,
      path: path,
      body: TelemetrySanitize.forPersistence(body),
      token: token,
      createdAt: DateTime.now().toUtc(),
    );
    _pending.add(item);
    _trimQueue();
    await _persistToDisk();
    debugPrint('[TelemetryQueue] En file ($kind) — total: ${_pending.length}');
  }

  Future<void> flush({String? authTokenOverride}) async {
    await initialize();
    if (_flushing || _pending.isEmpty) return;
    _flushing = true;
    try {
      final token = authTokenOverride ?? resolveAuthToken?.call();
      final ordered = List<_QueuedTelemetry>.from(_pending)
        ..sort((a, b) => a.sortKey.compareTo(b.sortKey));

      var index = 0;
      while (index < ordered.length) {
        final item = ordered[index];
        if (item.kind == 'event' && _canBatchEvents(ordered, index)) {
          final batch = _collectEventBatch(ordered, index);
          final sent = await _sendEventBatch(batch, token);
          if (!sent) break;
          index += batch.length;
          continue;
        }

        final sent = await _sendItem(item, token);
        if (!sent) break;
        index += 1;
      }

      if (index > 0) {
        final sentIds = ordered.take(index).map((e) => e.id).toSet();
        _pending.removeWhere((e) => sentIds.contains(e.id));
        await _persistToDisk();
        debugPrint('[TelemetryQueue] Flush OK — reste: ${_pending.length}');
      }
    } finally {
      _flushing = false;
    }
  }

  bool _canBatchEventKind(String kind) => kind == 'event';

  bool _canBatchEvents(List<_QueuedTelemetry> items, int start) {
    if (!_canBatchEventKind(items[start].kind)) return false;
    if (items[start].path != '/api/v1/analytics/events') return false;
    var count = 0;
    for (var i = start; i < items.length && count < _batchEventSize; i++) {
      if (items[i].kind != 'event' || items[i].path != '/api/v1/analytics/events') break;
      count++;
    }
    return count >= 2;
  }

  List<_QueuedTelemetry> _collectEventBatch(List<_QueuedTelemetry> items, int start) {
    final batch = <_QueuedTelemetry>[];
    for (var i = start; i < items.length && batch.length < _batchEventSize; i++) {
      final item = items[i];
      if (item.kind != 'event' || item.path != '/api/v1/analytics/events') break;
      batch.add(item);
    }
    return batch;
  }

  Future<bool> _sendEventBatch(List<_QueuedTelemetry> batch, String? token) async {
    try {
      final headers = HttpCorrelation.jsonHeaders(bearerToken: token);
      final events = batch.map((e) => e.body).toList();
      final response = await http
          .post(
            Uri.parse('${ApiService.baseUrl}/api/v1/analytics/events/batch'),
            headers: headers,
            body: jsonEncode({'events': events}),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode >= 200 && response.statusCode < 300) return true;
      if (response.statusCode == 401 || response.statusCode == 403) {
        debugPrint('[TelemetryQueue] Auth refusée batch (${response.statusCode})');
        return false;
      }
      if (response.statusCode >= 500) return false;
      debugPrint('[TelemetryQueue] Batch rejeté ${response.statusCode}, fallback unitaire');
      for (final item in batch) {
        final ok = await _sendItem(item, token);
        if (!ok) return false;
      }
      return true;
    } catch (e) {
      if (isNetworkError(e)) return false;
      for (final item in batch) {
        final ok = await _sendItem(item, token);
        if (!ok) return false;
      }
      return true;
    }
  }

  Future<bool> _sendItem(_QueuedTelemetry item, String? currentToken) async {
    try {
      final effectiveToken = currentToken ?? item.token;
      final headers = HttpCorrelation.jsonHeaders(bearerToken: effectiveToken);
      final response = await http
          .post(
            Uri.parse('${ApiService.baseUrl}${item.path}'),
            headers: headers,
            body: jsonEncode(item.body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return true;
      }
      if (response.statusCode == 401 || response.statusCode == 403) {
        debugPrint('[TelemetryQueue] Auth refusée (${response.statusCode}), pause flush');
        return false;
      }
      if (response.statusCode >= 500) {
        return false;
      }
      debugPrint('[TelemetryQueue] Rejet serveur ${response.statusCode} sur ${item.path}');
      return true;
    } catch (e) {
      if (isNetworkError(e)) return false;
      debugPrint('[TelemetryQueue] Erreur envoi ${item.path}: $e');
      return false;
    }
  }

  static bool isNetworkError(Object error) {
    return error is SocketException ||
        error is TimeoutException ||
        error is http.ClientException ||
        error is IOException;
  }

  static bool isRetriableHttpStatus(int statusCode) {
    return statusCode == 0 || statusCode >= 500;
  }

  void _trimQueue() {
    while (_pending.length > _maxItems) {
      final idx = _pending.indexWhere((e) => e.kind != 'session' && e.kind != 'device');
      if (idx >= 0) {
        _pending.removeAt(idx);
      } else {
        _pending.removeAt(0);
      }
    }
  }

  Future<void> _loadFromDisk() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_fileName');
      if (!await file.exists()) return;
      final lines = await file.readAsLines();
      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) continue;
        try {
          final decrypted = await TelemetryAtRestCipher.decrypt(trimmed);
          final json = TelemetryPayloadCodec.decompressJson(decrypted);
          _pending.add(_QueuedTelemetry.fromJson(json));
        } catch (_) {}
      }
      debugPrint('[TelemetryQueue] ${_pending.length} élément(s) chargé(s) depuis disque');
    } catch (e) {
      debugPrint('[TelemetryQueue] Lecture disque: $e');
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
      debugPrint('[TelemetryQueue] Persistance disque: $e');
    }
  }
}

class _QueuedTelemetry {
  _QueuedTelemetry({
    required this.id,
    required this.kind,
    required this.path,
    required this.body,
    required this.token,
    required this.createdAt,
  });

  final String id;
  final String kind;
  final String path;
  final Map<String, dynamic> body;
  final String? token;
  final DateTime createdAt;

  int get sortKey {
    const priority = {
      'session': 0,
      'device': 1,
      'error': 2,
      'crash_analytics': 2,
      'security_event': 3,
      'event': 4,
      'performance': 5,
    };
    return (priority[kind] ?? 9) * 1000000000000 + createdAt.microsecondsSinceEpoch;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind,
        'path': path,
        'body': body,
        'createdAt': createdAt.toIso8601String(),
      };

  factory _QueuedTelemetry.fromJson(Map<String, dynamic> json) {
    return _QueuedTelemetry(
      id: json['id'] as String? ?? '',
      kind: json['kind'] as String? ?? 'event',
      path: json['path'] as String? ?? '',
      body: Map<String, dynamic>.from(json['body'] as Map? ?? {}),
      token: null,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '')?.toUtc() ?? DateTime.now().toUtc(),
    );
  }
}

int telemetryKindPriority(String kind) {
  const priority = {
    'session': 0,
    'device': 1,
    'error': 2,
    'crash_analytics': 2,
    'security_event': 3,
    'event': 4,
    'performance': 5,
  };
  return priority[kind] ?? 9;
}
