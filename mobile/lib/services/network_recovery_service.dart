import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';
import 'package:jobbingtrack_mobile/services/shell_data_refresh_service.dart';

/// Détecte le retour réseau et relance sync + rafraîchissement des listes.
class NetworkRecoveryService {
  NetworkRecoveryService._();

  static Timer? _pollTimer;
  static bool _wasReachable = true;
  static bool _recovering = false;

  static void startMonitoring({Duration interval = const Duration(seconds: 8)}) {
    _pollTimer ??= Timer.periodic(interval, (_) => unawaited(_poll()));
    unawaited(_poll());
  }

  static void stopMonitoring() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  static Future<void> _poll() async {
    if (_recovering) return;
    final reachable = await ApiService.isReachable();
    if (reachable && !_wasReachable) {
      _wasReachable = true;
      await _onBackOnline();
    } else if (!reachable) {
      _wasReachable = false;
    }
  }

  static Future<void> _onBackOnline() async {
    if (_recovering) return;
    _recovering = true;
    try {
      debugPrint('[NetworkRecovery] Connexion rétablie — sync + refresh');
      await OfflineBusinessSyncQueue.instance.flush();
      await ShellDataRefreshService.refreshIfStale(force: true);
    } catch (e, st) {
      debugPrint('[NetworkRecovery] Erreur sync: $e\n$st');
    } finally {
      _recovering = false;
    }
  }

  /// Bouton « Réessayer » : re-détecte l'API, vérifie la santé, flush la file offline.
  static Future<bool> recoverConnection() async {
    try {
      await ApiService.autoDetectApi();
      if (!await ApiService.isReachable()) {
        _wasReachable = false;
        return false;
      }
      _wasReachable = true;
      await OfflineBusinessSyncQueue.instance.flush();
      return true;
    } catch (e) {
      debugPrint('[NetworkRecovery] recoverConnection: $e');
      _wasReachable = false;
      return false;
    }
  }
}
