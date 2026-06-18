import 'dart:async';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';

/// Télémétrie mobile anonyme : performances, traces d'activité, retours utilisateur.
/// Respecte le consentement stocké dans [ApiConfigStore].
class MobileAnalyticsService {
  MobileAnalyticsService._();
  static final MobileAnalyticsService instance = MobileAnalyticsService._();

  bool _consent = false;
  bool _performanceEnabled = true;
  bool _activityTraceEnabled = true;
  String? _sessionId;
  String? _deviceId;
  String? _authToken;
  Timer? _syncTimer;
  bool _sessionStarted = false;

  String get _platform =>
      Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');

  bool get isEnabled => _consent;
  bool get performanceEnabled => _consent && _performanceEnabled;
  bool get activityTraceEnabled => _consent && _activityTraceEnabled;

  Future<void> initialize({String? authToken}) async {
    _consent = await ApiConfigStore.loadAnalyticsConsent();
    _performanceEnabled = await ApiConfigStore.loadPerformanceTelemetryEnabled();
    _activityTraceEnabled = await ApiConfigStore.loadActivityTraceEnabled();
    _sessionId = await ApiConfigStore.getOrCreateAnalyticsSessionId();
    _deviceId = await ApiConfigStore.getOrCreateDeviceId();
    if (authToken != null) {
      _authToken = authToken;
      CrashReporter.setToken(authToken);
    }

    ApiService.onRequestComplete = _onApiRequestComplete;

    if (_consent) {
      await _startSession();
      _syncTimer?.cancel();
      _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) => flushTelemetry());
    }
  }

  Future<void> setConsent(bool enabled, {String? authToken}) async {
    _consent = enabled;
    await ApiConfigStore.saveAnalyticsConsent(enabled);
    if (enabled) {
      if (authToken != null) {
        _authToken = authToken;
        CrashReporter.setToken(authToken);
      }
      await _startSession();
      _syncTimer?.cancel();
      _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) => flushTelemetry());
      await flushTelemetry();
    } else {
      _syncTimer?.cancel();
      _syncTimer = null;
      _sessionStarted = false;
    }
  }

  Future<void> setPerformanceEnabled(bool enabled) async {
    _performanceEnabled = enabled;
    await ApiConfigStore.savePerformanceTelemetryEnabled(enabled);
  }

  Future<void> setActivityTraceEnabled(bool enabled) async {
    _activityTraceEnabled = enabled;
    await ApiConfigStore.saveActivityTraceEnabled(enabled);
  }

  Future<void> updateAuthToken(String? authToken) async {
    _authToken = authToken;
    if (authToken != null) {
      CrashReporter.setToken(authToken);
      if (_consent) await _registerDevice();
    }
  }

  Future<void> _startSession() async {
    if (_sessionStarted || _sessionId == null) return;
    final platform = Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');
    await ApiService.postAnalyticsSession(
      sessionId: _sessionId!,
      deviceId: _deviceId,
      platform: platform,
      osName: Platform.operatingSystem,
      osVersion: Platform.operatingSystemVersion,
      token: _authToken,
    );
    await _registerDevice();
    _sessionStarted = true;
  }

  Future<void> _registerDevice() async {
    if (_deviceId == null) return;
    final platform = Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');
    await ApiService.postAnalyticsDevice(
      deviceId: _deviceId!,
      platform: platform,
      osName: Platform.operatingSystem,
      osVersion: Platform.operatingSystemVersion,
      token: _authToken,
    );
  }

  static String sanitizeEndpoint(String path) {
    var p = path.split('?').first;
    p = p.replaceAll(RegExp(r'/[a-zA-Z0-9]{20,}'), '/:id');
    return p;
  }

  void _onApiRequestComplete(String path, int statusCode, int durationMs) {
    if (!performanceEnabled && !activityTraceEnabled) return;
    final sanitized = sanitizeEndpoint(path);
    CrashReporter.trackApiCall(sanitized, statusCode, durationMs);

    if (statusCode >= 400) {
      unawaited(_reportApiError(sanitized, statusCode, durationMs));
    }

    if (!performanceEnabled) return;
    if (durationMs > 3000) {
      unawaited(ApiService.postAnalyticsPerformance(
        sessionId: _sessionId,
        deviceId: _deviceId,
        metricType: 'api_latency',
        metricName: sanitized,
        duration: durationMs,
        networkLatency: durationMs,
        page: CrashReporter.currentScreenName,
        platform: _platform,
        token: _authToken,
      ));
    }
  }

  Future<void> _reportApiError(String endpoint, int statusCode, int durationMs) async {
    if (!_consent) return;
    final message = 'HTTP $statusCode sur $endpoint (${durationMs}ms)';
    await ApiService.postAnalyticsError(
      sessionId: _sessionId,
      deviceId: _deviceId,
      errorType: 'api',
      errorName: 'api_error',
      errorMessage: message,
      page: CrashReporter.currentScreenName,
      platform: _platform,
      severity: statusCode >= 500 ? 'critical' : 'warning',
      properties: {
        'endpoint': endpoint,
        'statusCode': statusCode,
        'durationMs': durationMs,
      },
      token: _authToken,
    );
    await ApiService.postAnalyticsEvent(
      sessionId: _sessionId,
      deviceId: _deviceId,
      eventType: 'api',
      eventName: 'api_error',
      category: 'api',
      page: CrashReporter.currentScreenName,
      platform: _platform,
      properties: {
        'endpoint': endpoint,
        'statusCode': statusCode,
        'durationMs': durationMs,
      },
      token: _authToken,
    );
  }

  Future<void> trackScreen(String screenName) async {
    final normalized = _normalizeScreenName(screenName);
    if (normalized == null) return;
    CrashReporter.setCurrentScreen(normalized);
    if (!activityTraceEnabled) return;
    await ApiService.postAnalyticsEvent(
      sessionId: _sessionId,
      deviceId: _deviceId,
      eventType: 'navigation',
      eventName: 'screen_view',
      category: 'mobile',
      page: normalized,
      platform: _platform,
      properties: {'anonymized': true},
      token: _authToken,
    );
  }

  static String? _normalizeScreenName(String raw) {
    if (raw.isEmpty) return null;
    if (raw.startsWith('/')) {
      const allowed = {
        '/home', '/login', '/register', '/settings', '/search',
        '/applications', '/companies', '/contacts', '/interviews',
        '/followups', '/calls', '/events', '/profile', '/admin',
        '/analytics', '/statistics', '/interim',
      };
      return allowed.contains(raw) ? raw : null;
    }
    if (raw.contains('MaterialPageRoute') ||
        raw.contains('DialogRoute') ||
        raw.contains('PopupRoute') ||
        raw.startsWith('_')) {
      return null;
    }
    const suffixes = ['Screen', 'Tab', 'Page'];
    for (final s in suffixes) {
      if (raw.endsWith(s) && raw.length > s.length) {
        return raw.substring(0, raw.length - s.length);
      }
    }
    return raw;
  }

  Future<void> flushTelemetry() async {
    if (!_consent) return;
    if (performanceEnabled) await _flushPerformanceSnapshot();
    if (activityTraceEnabled) await _flushActivityTrace();
  }

  Future<void> _flushPerformanceSnapshot() async {
    final summary = CrashReporter.getAnalyticsSummary();
    final device = CrashReporter.getDeviceMonitoring();
    await ApiService.postAnalyticsPerformance(
      sessionId: _sessionId,
      deviceId: _deviceId,
      metricType: 'mobile_snapshot',
      metricName: 'session_health',
      duration: summary['sessionDurationMs'] as int?,
      memoryUsage: device['memoryRssBytes'] as int?,
      page: CrashReporter.currentScreenName,
      platform: _platform,
      value: summary['totalApiCalls'] as int?,
      token: _authToken,
    );
  }

  Future<void> _flushActivityTrace() async {
    final diagnostic = await CrashReporter.collectFullDiagnostic();
    final actionsByType = diagnostic['actionsByType'] as Map<String, dynamic>? ?? {};
    await ApiService.postAnalyticsEvent(
      sessionId: _sessionId,
      deviceId: _deviceId,
      eventType: 'trace',
      eventName: 'activity_batch',
      category: 'mobile',
      page: CrashReporter.currentScreenName,
      platform: _platform,
      properties: {
        'anonymized': true,
        'actionsByType': actionsByType,
        'screenVisits': diagnostic['analytics']?['screenVisits'],
        'totalNavigations': diagnostic['analytics']?['totalNavigations'],
        'totalErrors': diagnostic['analytics']?['totalErrors'],
      },
      token: _authToken,
    );
  }

  /// Retour utilisateur, signalement ou bug — avec diagnostic optionnel.
  Future<void> submitFeedback({
    required String category,
    required String message,
    bool includeDiagnostics = true,
    String? authToken,
    String? userId,
  }) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty) throw Exception('Message requis');

    final metadata = <String, dynamic>{
      'category': category,
      'feedback': true,
      'anonymized': true,
      'deviceId': _deviceId,
      'sessionId': _sessionId,
    };

    if (includeDiagnostics) {
      metadata['diagnostic'] = await CrashReporter.collectFullDiagnostic();
    }

    await CrashReporter.reportManualError(
      message: '[$category] $trimmed',
      screenName: CrashReporter.currentScreenName,
      metadata: metadata,
    );

    await ApiService.postSecurityEvent(
      eventType: 'security_signal',
      message: 'Retour mobile ($category): ${trimmed.length > 200 ? trimmed.substring(0, 200) : trimmed}',
      deviceId: _deviceId,
      userId: userId,
      metadata: metadata,
      token: authToken,
    );

    if (_consent) {
      await ApiService.postAnalyticsEvent(
        sessionId: _sessionId,
        deviceId: _deviceId,
        eventType: 'feedback',
        eventName: category,
        category: 'mobile',
        page: CrashReporter.currentScreenName,
        platform: _platform,
        properties: {'messageLength': trimmed.length, 'includeDiagnostics': includeDiagnostics},
        token: authToken ?? _authToken,
      );
    }
  }

  Map<String, dynamic> localDiagnosticsPreview() {
    return {
      'consent': _consent,
      'performance': _performanceEnabled,
      'activityTrace': _activityTraceEnabled,
      'sessionId': _sessionId,
      'deviceId': _deviceId,
      ...CrashReporter.getAnalyticsSummary(),
    };
  }

  void dispose() {
    _syncTimer?.cancel();
  }
}

/// Observateur de navigation pour traces d'écran.
class MobileAnalyticsRouteObserver extends RouteObserver<PageRoute<dynamic>> {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _track(route);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) _track(newRoute);
  }

  void _track(Route<dynamic> route) {
    final name = route.settings.name;
    if (name == null || name.isEmpty) return;
    unawaited(MobileAnalyticsService.instance.trackScreen(name));
  }
}
