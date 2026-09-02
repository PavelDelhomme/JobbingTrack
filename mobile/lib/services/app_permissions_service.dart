import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';

/// Droits nécessaires au fonctionnement (notifications push système).
class AppPermissionsService {
  AppPermissionsService._();
  static final AppPermissionsService instance = AppPermissionsService._();

  static const _keyNotificationsGranted = 'app_permissions_notifications_ok';

  bool? _grantedThisProcess;

  /// Notifications système requises pour relances / entretiens sur le téléphone.
  Future<bool> areRequiredPermissionsGranted() async {
    if (_grantedThisProcess == true) return true;
    if (!Platform.isAndroid && !Platform.isIOS) return true;
    if (Platform.isAndroid) {
      final status = await Permission.notification.status;
      if (status.isGranted) {
        _grantedThisProcess = true;
        return true;
      }
      final cached = await ApiConfigStore.prefsGetBool(_keyNotificationsGranted);
      final ok = cached == true && status.isGranted;
      if (ok) _grantedThisProcess = true;
      return ok;
    }
    // iOS : permission_handler.notification
    final status = await Permission.notification.status;
    final ok = status.isGranted;
    if (ok) _grantedThisProcess = true;
    return ok;
  }

  Future<bool> requestRequiredPermissions() async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;

    final status = await Permission.notification.request();
    final granted = status.isGranted;
    if (granted) {
      _grantedThisProcess = true;
      await ApiConfigStore.prefsSetBool(_keyNotificationsGranted, true);
    }
    debugPrint('[PERMS] notification → $status (granted=$granted)');
    return granted;
  }

  Future<bool> openSystemSettings() => openAppSettings();

  Future<void> clearCachedGrant() async {
    _grantedThisProcess = null;
    await ApiConfigStore.prefsSetBool(_keyNotificationsGranted, false);
  }
}
