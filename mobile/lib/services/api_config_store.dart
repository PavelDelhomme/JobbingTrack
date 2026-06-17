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

  static const _keyDeviceId = 'security_device_id';
  static const _keyAuthToken = 'auth_token';
  static const _keyAuthUserJson = 'auth_user_json';

  /// Session auth locale (token JWT + profil utilisateur sérialisé).
  static Future<void> saveAuthSession({
    required String token,
    required String userJson,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAuthToken, token);
    await prefs.setString(_keyAuthUserJson, userJson);
  }

  static Future<({String token, String userJson})?> loadAuthSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_keyAuthToken);
    final userJson = prefs.getString(_keyAuthUserJson);
    if (token == null ||
        token.trim().isEmpty ||
        userJson == null ||
        userJson.trim().isEmpty) {
      return null;
    }
    return (token: token.trim(), userJson: userJson);
  }

  static Future<void> clearAuthSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAuthToken);
    await prefs.remove(_keyAuthUserJson);
  }

  /// Identifiant stable par appareil pour corrélation sécurité mobile (B9).
  static Future<String> getOrCreateDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_keyDeviceId);
    if (existing != null && existing.trim().isNotEmpty) {
      return existing.trim();
    }
    final id =
        'mob-${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond}';
    await prefs.setString(_keyDeviceId, id);
    return id;
  }
}
