import 'package:shared_preferences/shared_preferences.dart';

/// Persistance locale de l'URL API choisie sur l'appareil (hors dart-define).
class ApiConfigStore {
  static const _keyBaseUrl = 'api_base_url';

  static Future<String?> loadBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getString(_keyBaseUrl);
    if (value == null || value.trim().isEmpty) return null;
    return value.trim();
  }

  static Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, url.trim());
  }
}
