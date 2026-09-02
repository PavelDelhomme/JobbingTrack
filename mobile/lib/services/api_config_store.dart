import 'package:shared_preferences/shared_preferences.dart';
import 'package:jobbingtrack_mobile/services/secure_auth_session_store.dart';
import 'package:jobbingtrack_mobile/utils/device_id.dart';

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
  static const _keyKeepLoggedIn = 'auth_keep_logged_in';
  static const _keyBiometricUnlock = 'auth_biometric_unlock';
  static const _keyInterimMode = 'interim_mode_enabled';
  /// Smokes ADB debug uniquement — contourne l'écran biométrique au cold start.
  static const _keyTestAutomationSkipBiometric = 'test_automation_skip_biometric';

  /// Session auth locale (token JWT + profil — stockage chiffré OS).
  static Future<void> saveAuthSession({
    required String token,
    required String userJson,
    String? refreshToken,
    String? impersonatorToken,
    String? impersonatorUserJson,
    String? impersonatorRefreshToken,
    String? impersonationReturnRoute,
  }) async {
    await SecureAuthSessionStore.saveSession(
      token: token,
      userJson: userJson,
      refreshToken: refreshToken,
      impersonatorToken: impersonatorToken,
      impersonatorUserJson: impersonatorUserJson,
      impersonatorRefreshToken: impersonatorRefreshToken,
      impersonationReturnRoute: impersonationReturnRoute,
    );
  }

  static Future<
      ({
        String token,
        String userJson,
        String? refreshToken,
        String? impersonatorToken,
        String? impersonatorUserJson,
        String? impersonatorRefreshToken,
        String? impersonationReturnRoute,
      })?> loadAuthSession() async {
    return SecureAuthSessionStore.loadSession();
  }

  static Future<String?> loadRefreshToken() => SecureAuthSessionStore.loadRefreshToken();

  static Future<void> saveRefreshToken(String refreshToken) =>
      SecureAuthSessionStore.saveRefreshToken(refreshToken);

  static Future<void> clearAuthSession() async {
    await SecureAuthSessionStore.clearSession();
  }

  static Future<void> clearAnalyticsSessionId() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAnalyticsSessionId);
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

  static Future<bool> loadTestAutomationSkipBiometric() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyTestAutomationSkipBiometric) ?? false;
  }

  static Future<void> saveTestAutomationSkipBiometric(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyTestAutomationSkipBiometric, enabled);
  }

  // ——— Télémétrie mobile (consentement RGPD) ———
  static const _keyAnalyticsConsent = 'telemetry_analytics_consent';
  static const _keyAnalyticsPerformance = 'telemetry_performance_enabled';
  static const _keyAnalyticsActivity = 'telemetry_activity_trace_enabled';
  static const _keyAnalyticsSessionId = 'telemetry_session_id';

  static Future<bool> loadAnalyticsConsent() async {
    final prefs = await SharedPreferences.getInstance();
    // Par défaut ON (porteur 26/06) — l’utilisateur peut désactiver dans Paramètres.
    return prefs.getBool(_keyAnalyticsConsent) ?? true;
  }

  /// Opt-in explicite uniquement : ne réactive pas un consentement refusé par l'utilisateur.
  static Future<void> ensureAnalyticsConsentEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_keyAnalyticsConsent)) {
      await prefs.setBool(_keyAnalyticsConsent, true);
      await prefs.setBool(_keyAnalyticsPerformance, true);
      await prefs.setBool(_keyAnalyticsActivity, true);
    }
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

  /// Identifiant stable par appareil (UUID v4) pour télémétrie et sécurité mobile.
  static Future<String> getOrCreateDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_keyDeviceId)?.trim();
    if (existing != null &&
        existing.isNotEmpty &&
        DeviceId.isUuidV4(existing)) {
      return existing;
    }
    final id = DeviceId.generateUuidV4();
    await prefs.setString(_keyDeviceId, id);
    return id;
  }

  static Future<bool?> prefsGetBool(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(key);
  }

  static Future<void> prefsSetBool(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  // ——— Calendrier mobile ———
  static const _keyCalendarViewMode = 'calendar_view_mode';
  static const _keyCalendarFilterInterviews = 'calendar_filter_interviews';
  static const _keyCalendarFilterFollowups = 'calendar_filter_followups';
  static const _keyCalendarFilterEvents = 'calendar_filter_events';
  static const _keyCalendarFilterInterim = 'calendar_filter_interim';
  static const _keyThemeMode = 'ui_theme_mode';

  static Future<String> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyThemeMode) ?? 'system';
  }

  static Future<void> saveThemeMode(String mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyThemeMode, mode);
  }

  static Future<String> loadCalendarViewMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyCalendarViewMode) ?? 'planner';
  }

  static Future<void> saveCalendarViewMode(String mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyCalendarViewMode, mode);
  }

  static Future<({bool interviews, bool followups, bool events, bool interim})> loadCalendarFilters() async {
    final prefs = await SharedPreferences.getInstance();
    return (
      interviews: prefs.getBool(_keyCalendarFilterInterviews) ?? true,
      followups: prefs.getBool(_keyCalendarFilterFollowups) ?? true,
      events: prefs.getBool(_keyCalendarFilterEvents) ?? true,
      interim: prefs.getBool(_keyCalendarFilterInterim) ?? true,
    );
  }

  static Future<void> saveCalendarFilters({
    required bool showInterviews,
    required bool showFollowups,
    required bool showEvents,
    required bool showInterim,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyCalendarFilterInterviews, showInterviews);
    await prefs.setBool(_keyCalendarFilterFollowups, showFollowups);
    await prefs.setBool(_keyCalendarFilterEvents, showEvents);
    await prefs.setBool(_keyCalendarFilterInterim, showInterim);
  }
}
