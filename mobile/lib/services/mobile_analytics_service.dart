import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:jobbingtrack_mobile/services/analytics_telemetry_queue.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/services/diagnostic_payload_codec.dart';
import 'package:jobbingtrack_mobile/services/mobile_device_info.dart';
import 'package:jobbingtrack_mobile/services/offline_business_sync_queue.dart';

/// Télémétrie mobile anonyme : performances, traces d'activité, retours utilisateur.
/// Respecte le consentement stocké dans [ApiConfigStore].
class MobileAnalyticsService extends ChangeNotifier {
  MobileAnalyticsService._();
  static final MobileAnalyticsService instance = MobileAnalyticsService._();

  static const Duration flushInterval = Duration(minutes: 5);

  bool _consent = false;
  bool _performanceEnabled = true;
  bool _activityTraceEnabled = true;
  String? _sessionId;
  String? _deviceId;
  String? _authToken;
  Future<void> Function()? sessionRefreshBeforeFlush;
  Timer? _syncTimer;
  bool _sessionStarted = false;
  DateTime? _lastFlushAt;
  DateTime? _nextFlushAt;
  String _lastFlushMessage = 'En attente';
  bool _flushInProgress = false;

  void bindAuthTokenResolver() {
    AnalyticsTelemetryQueue.instance.resolveAuthToken = () => _authToken;
    OfflineBusinessSyncQueue.instance.resolveAuthToken = () => _authToken;
  }

  Future<void> updateAuthToken(String? authToken) async {
    _authToken = authToken;
    if (authToken != null) {
      CrashReporter.setToken(authToken);
      if (_consent) {
        await _registerDevice();
        await AnalyticsTelemetryQueue.instance.flush(authTokenOverride: authToken);
      }
    } else {
      CrashReporter.setToken(null);
    }
    bindAuthTokenResolver();
  }

  String get _platform =>
      Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');

  bool get isEnabled => _consent;
  bool get performanceEnabled => _consent && _performanceEnabled;
  bool get activityTraceEnabled => _consent && _activityTraceEnabled;
  int get telemetryPendingCount => AnalyticsTelemetryQueue.instance.pendingCount;
  int get offlineSyncPendingCount => OfflineBusinessSyncQueue.instance.pendingCount;
  DateTime? get lastFlushAt => _lastFlushAt;
  DateTime? get nextFlushAt => _nextFlushAt;
  String get lastFlushMessage => _lastFlushMessage;
  bool get flushInProgress => _flushInProgress;

  Duration? get timeUntilNextFlush {
    if (_nextFlushAt == null) return null;
    final diff = _nextFlushAt!.difference(DateTime.now());
    if (diff.isNegative) return Duration.zero;
    return diff;
  }

  String get devTelemetryStatusLine {
    if (!_consent) {
      return 'Analytics OFF — consentement désactivé (Paramètres)';
    }
    final pending = telemetryPendingCount;
    final offline = offlineSyncPendingCount;
    final next = timeUntilNextFlush;
    final nextLabel = next == null
        ? '—'
        : next.inSeconds <= 0
            ? 'maintenant'
            : '${next.inMinutes}m ${next.inSeconds % 60}s';
    final last = _lastFlushAt == null
        ? 'jamais'
        : '${_lastFlushAt!.hour.toString().padLeft(2, '0')}:${_lastFlushAt!.minute.toString().padLeft(2, '0')}:${_lastFlushAt!.second.toString().padLeft(2, '0')}';
    final state = _flushInProgress ? 'envoi…' : _lastFlushMessage;
    return 'Télémétrie ON · file $pending · offline $offline · prochain flush $nextLabel · dernier $last · $state';
  }

  void _schedulePeriodicFlush() {
    _syncTimer?.cancel();
    _nextFlushAt = DateTime.now().add(flushInterval);
    _syncTimer = Timer.periodic(flushInterval, (_) {
      _nextFlushAt = DateTime.now().add(flushInterval);
      unawaited(flushTelemetry());
    });
    notifyListeners();
  }

  void _notifyDevStatus([String? message]) {
    if (message != null) _lastFlushMessage = message;
    notifyListeners();
  }

  Future<void> initialize({String? authToken}) async {
    await ApiConfigStore.ensureAnalyticsConsentEnabled();
    await AnalyticsTelemetryQueue.instance.initialize();
    bindAuthTokenResolver();
    OfflineBusinessSyncQueue.instance.initialize();

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
      _schedulePeriodicFlush();
      await AnalyticsTelemetryQueue.instance.flush(authTokenOverride: _authToken);
      await OfflineBusinessSyncQueue.instance.flush(authTokenOverride: _authToken);
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
      _schedulePeriodicFlush();
      await flushTelemetry();
    } else {
      _syncTimer?.cancel();
      _syncTimer = null;
      _nextFlushAt = null;
      _sessionStarted = false;
      _notifyDevStatus('Consentement désactivé');
    }
    notifyListeners();
  }

  /// Recharge les préférences locales et réactive la télémétrie si consentement ON.
  Future<void> reloadFromStore({String? authToken}) async {
    _consent = await ApiConfigStore.loadAnalyticsConsent();
    _performanceEnabled = await ApiConfigStore.loadPerformanceTelemetryEnabled();
    _activityTraceEnabled = await ApiConfigStore.loadActivityTraceEnabled();
    if (authToken != null) {
      _authToken = authToken;
      CrashReporter.setToken(authToken);
    }
    if (_consent) {
      if (!_sessionStarted) await _startSession();
      if (_syncTimer == null) _schedulePeriodicFlush();
    } else {
      _syncTimer?.cancel();
      _syncTimer = null;
      _nextFlushAt = null;
      _sessionStarted = false;
    }
    notifyListeners();
  }

  Future<void> setPerformanceEnabled(bool enabled) async {
    _performanceEnabled = enabled;
    await ApiConfigStore.savePerformanceTelemetryEnabled(enabled);
  }

  Future<void> setActivityTraceEnabled(bool enabled) async {
    _activityTraceEnabled = enabled;
    await ApiConfigStore.saveActivityTraceEnabled(enabled);
  }

  Future<void> _startSession() async {
    if (_sessionStarted || _sessionId == null) return;
    final deviceInfo = await MobileDeviceInfo.collect();
    final platform = Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');
    await ApiService.postAnalyticsSession(
      sessionId: _sessionId!,
      deviceId: _deviceId,
      platform: platform,
      deviceModel: deviceInfo['deviceModel'],
      osName: deviceInfo['osName'] ?? Platform.operatingSystem,
      osVersion: deviceInfo['osVersion'] ?? Platform.operatingSystemVersion,
      token: _authToken,
    );
    await _registerDevice(deviceInfo);
    _sessionStarted = true;
  }

  Future<void> _registerDevice([Map<String, String>? deviceInfo]) async {
    if (_deviceId == null) return;
    deviceInfo ??= await MobileDeviceInfo.collect();
    final platform = Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'mobile');
    await ApiService.postAnalyticsDevice(
      deviceId: _deviceId!,
      platform: platform,
      deviceModel: deviceInfo['deviceModel'],
      osName: deviceInfo['osName'] ?? Platform.operatingSystem,
      osVersion: deviceInfo['osVersion'] ?? Platform.operatingSystemVersion,
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

    if (statusCode >= 400 || statusCode == 0) {
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
    final message = statusCode == 0
        ? 'Connexion refusée ou réseau indisponible sur $endpoint (${durationMs}ms)'
        : 'HTTP $statusCode sur $endpoint (${durationMs}ms)';
    await ApiService.postAnalyticsError(
      sessionId: _sessionId,
      deviceId: _deviceId,
      errorType: statusCode == 0 ? 'network' : 'api',
      errorName: statusCode == 0 ? 'connection_refused' : 'api_error',
      errorMessage: message,
      page: CrashReporter.currentScreenName,
      platform: _platform,
      severity: statusCode == 0 || statusCode >= 500 ? 'critical' : 'warning',
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
    _flushInProgress = true;
    _notifyDevStatus('Envoi analytics…');
    try {
      if (sessionRefreshBeforeFlush != null) {
        await sessionRefreshBeforeFlush!();
      }
      await AnalyticsTelemetryQueue.instance.flush(authTokenOverride: _authToken);
      await OfflineBusinessSyncQueue.instance.flush(authTokenOverride: _authToken);
      if (performanceEnabled) await _flushPerformanceSnapshot();
      if (activityTraceEnabled) await _flushActivityTrace();
      _lastFlushAt = DateTime.now();
      _notifyDevStatus(
        'OK · reste file ${AnalyticsTelemetryQueue.instance.pendingCount}',
      );
    } catch (e) {
      _notifyDevStatus('Erreur flush: $e');
    } finally {
      _flushInProgress = false;
      notifyListeners();
    }
  }

  Future<void> _flushPerformanceSnapshot() async {
    final summary = CrashReporter.getAnalyticsSummary();
    final device = CrashReporter.getDeviceMonitoring();
    final page = CrashReporter.currentScreenName;
    final token = _authToken;
    final sessionId = _sessionId;
    final deviceId = _deviceId;
    final platform = _platform;

    final rss = device['memoryRssBytes'] as int?;
    final sessionMs = summary['sessionDurationMs'] as int?;
    final totalApiCalls = summary['totalApiCalls'] as int? ?? 0;
    final totalErrors = summary['totalErrors'] as int? ?? 0;
    // Une seule ligne par flush — memoryUsage en Mo entiers (schéma BDD).
    final rssMb = rss != null ? (rss / (1024 * 1024)).round() : null;

    await ApiService.postAnalyticsPerformance(
      sessionId: sessionId,
      deviceId: deviceId,
      metricType: 'mobile_snapshot',
      metricName: 'session_health',
      duration: sessionMs,
      memoryUsage: rssMb,
      value: totalApiCalls,
      networkLatency: totalErrors,
      page: page,
      platform: platform,
      token: token,
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
    String? screenshotCompressed,
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
      'screenName': CrashReporter.currentScreenName ?? 'help_feedback',
      if (userId != null) 'userId': userId,
    };

    if (includeDiagnostics) {
      metadata['diagnosticCompressed'] = DiagnosticPayloadCodec.compressJson(
        await CrashReporter.collectCompactDiagnostic(),
      );
    }
    if (screenshotCompressed != null && screenshotCompressed.isNotEmpty) {
      metadata['screenshotCompressed'] = screenshotCompressed;
    }

    final sent = await CrashReporter.reportManualError(
      message: '[$category] $trimmed',
      screenName: CrashReporter.currentScreenName,
      metadata: metadata,
    );
    if (!sent) {
      throw Exception(
        'Envoi impossible (réseau ou serveur). Vérifiez la connexion à l\'API dans Paramètres.',
      );
    }

    if (category == 'signalement') {
      await ApiService.postSecurityEvent(
        eventType: 'security_signal',
        message:
            'Retour mobile ($category): ${trimmed.length > 200 ? trimmed.substring(0, 200) : trimmed}',
        deviceId: _deviceId,
        userId: userId,
        metadata: metadata,
        token: authToken,
      );
    }
  }

  /// Fin de session utilisateur : purge files et état mémoire (déconnexion volontaire).
  Future<void> onUserLogout() async {
    _syncTimer?.cancel();
    _syncTimer = null;
    _sessionStarted = false;
    _authToken = null;
    _nextFlushAt = null;
    _lastFlushAt = null;
    _lastFlushMessage = 'Déconnecté';
    _flushInProgress = false;
    CrashReporter.setToken(null);
    bindAuthTokenResolver();
    _sessionId = await ApiConfigStore.getOrCreateAnalyticsSessionId();
    notifyListeners();
  }

  Map<String, dynamic> localDiagnosticsPreview() {
    return {
      'consent': _consent,
      'performance': _performanceEnabled,
      'activityTrace': _activityTraceEnabled,
      'sessionId': _sessionId,
      'deviceId': _deviceId,
      'telemetryQueuePending': AnalyticsTelemetryQueue.instance.pendingCount,
      'offlineSyncPending': OfflineBusinessSyncQueue.instance.pendingCount,
      ...CrashReporter.getAnalyticsSummary(),
    };
  }

  void dispose() {
    _syncTimer?.cancel();
    super.dispose();
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
