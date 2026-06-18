import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

/// Enregistrement token push (FCM/APNs) côté backend.
/// Sans `google-services.json` / certificats APNs, un token dev est envoyé pour valider la chaîne API.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  String? _lastRegisteredToken;

  bool get hasRegistered => _lastRegisteredToken != null;

  /// Token dev déterministe (tests unitaires).
  static String buildDevPushToken(String deviceId) => 'dev-push-$deviceId';

  Future<void> registerAfterLogin({String? authToken}) async {
    if (authToken == null || authToken.isEmpty) return;
    try {
      final deviceId = await ApiConfigStore.getOrCreateDeviceId();
      final platform = _resolvePlatform();
      final provider = _resolveProvider();
      final pushToken = await _resolvePushToken(deviceId);
      await ApiService.registerPushDevice(
        token: pushToken,
        platform: platform,
        provider: provider,
        deviceId: deviceId,
        authToken: authToken,
      );
      _lastRegisteredToken = pushToken;
      debugPrint('[PUSH] Token enregistré ($provider/$platform)');
    } catch (e, st) {
      debugPrint('[PUSH] Enregistrement ignoré: $e\n$st');
    }
  }

  Future<void> unregister({String? authToken}) async {
    if (_lastRegisteredToken == null) return;
    try {
      final deviceId = await ApiConfigStore.getOrCreateDeviceId();
      await ApiService.unregisterPushDevice(
        token: _lastRegisteredToken,
        deviceId: deviceId,
        authToken: authToken,
      );
    } catch (e) {
      debugPrint('[PUSH] Désenregistrement ignoré: $e');
    } finally {
      _lastRegisteredToken = null;
    }
  }

  String _resolvePlatform() {
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'unknown';
  }

  String _resolveProvider() {
    // firebase_messaging sera branché ici quand google-services.json / APNs seront configurés.
    return 'dev';
  }

  Future<String> _resolvePushToken(String deviceId) async {
    // Placeholder jusqu'à intégration firebase_messaging / APNs natif.
    return buildDevPushToken(deviceId);
  }

  Future<Map<String, String>> deviceMetadata() async {
    final plugin = DeviceInfoPlugin();
    if (Platform.isAndroid) {
      final info = await plugin.androidInfo;
      return {
        'platform': 'android',
        'model': info.model,
        'osVersion': info.version.release,
      };
    }
    if (Platform.isIOS) {
      final info = await plugin.iosInfo;
      return {
        'platform': 'ios',
        'model': info.utsname.machine,
        'osVersion': info.systemVersion,
      };
    }
    return {'platform': 'unknown'};
  }
}
