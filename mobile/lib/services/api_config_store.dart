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
  static const _keyKeepLoggedIn = 'auth_keep_logged_in';
  static const _keyBiometricUnlock = 'auth_biometric_unlock';
  static const _keyInterimMode = 'interim_mode_enabled';

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

  static Future<bool> loadKeepLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyKeepLoggedIn) ?? true;
  }

  static Future<void> saveKeepLoggedIn(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyKeepLoggedIn, enabled);
  }

  static Future<bool> loadBiometricUnlockEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyBiometricUnlock) ?? false;
  }

  static Future<void> saveBiometricUnlockEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyBiometricUnlock, enabled);
  }

  static Future<bool> loadInterimModeEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyInterimMode) ?? false;
  }

  static Future<void> saveInterimModeEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyInterimMode, enabled);
  }

  // ——— Télémétrie mobile (consentement RGPD) ———
  static const _keyAnalyticsConsent = 'telemetry_analytics_consent';
  static const _keyAnalyticsPerformance = 'telemetry_performance_enabled';
  static const _keyAnalyticsActivity = 'telemetry_activity_trace_enabled';
  static const _keyAnalyticsSessionId = 'telemetry_session_id';

  static Future<bool> loadAnalyticsConsent() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyAnalyticsConsent) ?? false;
  }

  static Future<void> saveAnalyticsConsent(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAnalyticsConsent, enabled);
  }

  static Future<bool> loadPerformanceTelemetryEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyAnalyticsPerformance) ?? true;
  }

  static Future<void> savePerformanceTelemetryEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAnalyticsPerformance, enabled);
  }

  static Future<bool> loadActivityTraceEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyAnalyticsActivity) ?? true;
  }

  static Future<void> saveActivityTraceEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAnalyticsActivity, enabled);
  }

  /// Consentement télémétrie activé à l'inscription (obligatoire pour créer un compte).
  static Future<void> enableTelemetryOnSignup() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAnalyticsConsent, true);
    await prefs.setBool(_keyAnalyticsPerformance, true);
    await prefs.setBool(_keyAnalyticsActivity, true);
  }

  static Future<String> getOrCreateAnalyticsSessionId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_keyAnalyticsSessionId);
    if (existing != null && existing.trim().isNotEmpty) return existing.trim();
    final id = 'sess-${DateTime.now().millisecondsSinceEpoch}';
    await prefs.setString(_keyAnalyticsSessionId, id);
    return id;
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
