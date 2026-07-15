import 'package:jobbingtrack_mobile/services/analytics_telemetry_queue.dart';
import 'package:jobbingtrack_mobile/services/offline_entity_cache.dart';

class OfflineLoadResult<T> {
  const OfflineLoadResult({
    required this.items,
    required this.fromCache,
    this.error,
  });

  final List<T> items;
  final bool fromCache;
  final Object? error;
}

/// Charge une liste API avec repli cache local si le réseau est indisponible.
class OfflineListLoader {
  OfflineListLoader._();

  static Future<OfflineLoadResult<T>> load<T>({
    required String? userId,
    required String cacheKey,
    required Future<List<T>> Function() fetch,
    required T Function(Map<String, dynamic>) fromJson,
    required Map<String, dynamic> Function(T) toJson,
  }) async {
    final uid = userId?.trim() ?? '';
    try {
      final items = await fetch();
      if (uid.isNotEmpty) {
        await OfflineEntityCache.instance.saveList(
          uid,
          cacheKey,
          items.map(toJson).toList(),
        );
      }
      return OfflineLoadResult(items: items, fromCache: false);
    } catch (e) {
      if (uid.isNotEmpty) {
        final cached = await OfflineEntityCache.instance.loadList(uid, cacheKey);
        if (cached != null && cached.isNotEmpty) {
          return OfflineLoadResult(
            items: cached.map(fromJson).toList(),
            fromCache: true,
            error: e,
          );
        }
      }
      rethrow;
    }
  }

  static Future<OfflineLoadResult<Map<String, dynamic>>> loadMaps({
    required String? userId,
    required String cacheKey,
    required Future<List<Map<String, dynamic>>> Function() fetch,
  }) {
    return load<Map<String, dynamic>>(
      userId: userId,
      cacheKey: cacheKey,
      fetch: fetch,
      fromJson: (json) => Map<String, dynamic>.from(json),
      toJson: (item) => Map<String, dynamic>.from(item),
    );
  }

  static bool isNetworkFailure(Object error) =>
      AnalyticsTelemetryQueue.isNetworkError(error);
}
