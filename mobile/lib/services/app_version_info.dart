import 'package:package_info_plus/package_info_plus.dart';

/// Version applicative (pubspec / build natif).
class AppVersionInfo {
  AppVersionInfo._();

  static String? _cached;

  static Future<String> get() async {
    if (_cached != null) return _cached!;
    try {
      final info = await PackageInfo.fromPlatform();
      _cached = '${info.version}+${info.buildNumber}';
    } catch (_) {
      _cached = '1.0.0+1';
    }
    return _cached!;
  }
}
