import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';

/// Droits nécessaires au fonctionnement (notifications push système).
class AppPermissionsService {
  AppPermissionsService._();
  static final AppPermissionsService instance = AppPermissionsService._();

  static const _keyNotificationsGranted = 'app_permissions_notifications_ok';

  /// Notifications système requises pour relances / entretiens sur le téléphone.
  Future<bool> areRequiredPermissionsGranted() async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;
    if (Platform.isAndroid) {
      final status = await Permission.notification.status;
      if (status.isGranted) return true;
      final cached = await ApiConfigStore.prefsGetBool(_keyNotificationsGranted);
      return cached == true && status.isGranted;
    }
    // iOS : permission_handler.notification
    final status = await Permission.notification.status;
    return status.isGranted;
  }

  Future<bool> requestRequiredPermissions() async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;

    final status = await Permission.notification.request();
    final granted = status.isGranted;
    if (granted) {
      await ApiConfigStore.prefsSetBool(_keyNotificationsGranted, true);
    }
    debugPrint('[PERMS] notification → $status (granted=$granted)');
    return granted;
  }

  Future<bool> openSystemSettings() => openAppSettings();

  Future<void> clearCachedGrant() async {
    await ApiConfigStore.prefsSetBool(_keyNotificationsGranted, false);
  }
}
