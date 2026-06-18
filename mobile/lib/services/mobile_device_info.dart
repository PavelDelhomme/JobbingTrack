import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';

/// Infos appareil pour analytics (modèle, OS) — mis en cache après le 1er appel.
class MobileDeviceInfo {
  MobileDeviceInfo._();

  static Map<String, String>? _cache;

  static Future<Map<String, String>> collect() async {
    if (_cache != null) return Map<String, String>.from(_cache!);

    try {
      final plugin = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final info = await plugin.androidInfo;
        final release = info.version.release.trim();
        final sdk = info.version.sdkInt;
        final osVersion = release.isNotEmpty
            ? 'Android $release (API $sdk)'
            : 'Android (API $sdk)';
        _cache = {
          'deviceModel': '${info.manufacturer} ${info.model}'.trim(),
          'osName': 'Android',
          'osVersion': osVersion,
        };
      } else if (Platform.isIOS) {
        final info = await plugin.iosInfo;
        _cache = {
          'deviceModel': info.utsname.machine,
          'osName': 'iOS',
          'osVersion': info.systemVersion,
        };
      } else {
        _cache = {
          'deviceModel': Platform.localHostname,
          'osName': Platform.operatingSystem,
          'osVersion': Platform.operatingSystemVersion,
        };
      }
    } catch (_) {
      _cache = {
        'deviceModel': Platform.localHostname,
        'osName': Platform.operatingSystem,
        'osVersion': Platform.operatingSystemVersion,
      };
    }
    return Map<String, String>.from(_cache!);
  }
}
