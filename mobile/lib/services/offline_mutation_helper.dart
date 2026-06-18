import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';

/// Exécute une mutation API avec mise en file offline si réseau/5xx.
class OfflineMutationHelper {
  OfflineMutationHelper._();

  static Future<T> execute<T>({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    required String entityType,
    String? token,
    required int successStatus,
    required Future<http.Response> Function() send,
    required T Function(http.Response response) onSuccess,
    required Exception Function(http.Response response) onHttpError,
  }) async {
    try {
      final response = await send();
      if (response.statusCode == successStatus) {
        return onSuccess(response);
      }
      if (OfflineBusinessSyncQueue.isRetriableHttpStatus(response.statusCode) &&
          OfflineBusinessSyncQueue.isSyncablePath(path)) {
        await OfflineBusinessSyncQueue.instance.enqueue(
          method: method,
          path: path,
          body: body,
          entityType: entityType,
          token: token,
        );
        throw OfflineMutationQueued();
      }
      throw onHttpError(response);
    } catch (e) {
      if (e is OfflineMutationQueued) rethrow;
      if (OfflineBusinessSyncQueue.isNetworkError(e)) {
        await OfflineBusinessSyncQueue.instance.enqueue(
          method: method,
          path: path,
          body: body,
          entityType: entityType,
          token: token,
        );
        throw OfflineMutationQueued();
      }
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<void> executeVoid({
    required String method,
    required String path,
    Map<String, dynamic>? body,
    required String entityType,
    String? token,
    required int successStatus,
    required Future<http.Response> Function() send,
    String? errorMessage,
  }) {
    return execute<void>(
      method: method,
      path: path,
      body: body,
      entityType: entityType,
      token: token,
      successStatus: successStatus,
      send: send,
      onSuccess: (_) {},
      onHttpError: (response) {
        final parsed = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
        if (parsed is Map) {
          return Exception(
            parsed['message'] ?? parsed['error'] ?? errorMessage ?? 'Erreur HTTP ${response.statusCode}',
          );
        }
        return Exception(errorMessage ?? 'Erreur HTTP ${response.statusCode}');
      },
    );
  }
}
