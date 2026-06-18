import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';

class CrashReporter {
  static String? _authToken;
  static final List<Map<String, dynamic>> _actionLog = [];
  static String? _currentScreen;
  static bool _initialized = false;
  static final Map<String, int> _screenVisits = {};
  static final Map<String, int> _buttonTaps = {};
  static final Map<String, Duration> _screenDurations = {};
  static DateTime? _screenEnteredAt;
  static String? _previousScreen;
  static final Stopwatch _sessionTimer = Stopwatch();
  static int _totalTaps = 0;
  static int _totalSwipes = 0;
  static int _totalNavs = 0;
  static int _totalApiCalls = 0;
  static int _totalErrors = 0;
  static int _totalFormSubmits = 0;
  static int _totalTextInputs = 0;
  static final Map<String, int> _apiEndpointCalls = {};
  static final Map<String, List<int>> _apiResponseTimes = {};
  static final Map<String, int> _errorCounts = {};
  static Timer? _monitoringTimer;
  static final List<Map<String, dynamic>> _monitoringSnapshots = [];

  static const bool _isDevMode = kDebugMode;
  static const int _prodActionLimit = 500;

  static String? get currentScreenName => _currentScreen;

  static void setToken(String? token) => _authToken = token;

  static void setCurrentScreen(String screen) {
    if (_currentScreen != null && _screenEnteredAt != null) {
      final duration = DateTime.now().difference(_screenEnteredAt!);
      _screenDurations[_currentScreen!] =
          (_screenDurations[_currentScreen!] ?? Duration.zero) + duration;
    }
    _previousScreen = _currentScreen;
    _currentScreen = screen;
    _screenEnteredAt = DateTime.now();
    _screenVisits[screen] = (_screenVisits[screen] ?? 0) + 1;
    _totalNavs++;
    _trackRaw('navigation', {'to': screen, 'from': _previousScreen});
  }

  static void trackAction(String action) {
    _trackRaw('action', {'description': action});
  }

  static void trackButtonTap(String buttonId, {String? screen, Map<String, dynamic>? extra}) {
    _totalTaps++;
    _buttonTaps[buttonId] = (_buttonTaps[buttonId] ?? 0) + 1;
    _trackRaw('button_tap', {
      'buttonId': buttonId,
      'screen': screen ?? _currentScreen,
      ...?extra,
    });
  }

  static void trackSwipe(String direction, {String? screen}) {
    _totalSwipes++;
    _trackRaw('swipe', {
      'direction': direction,
      'screen': screen ?? _currentScreen,
    });
  }

  static void trackApiCall(String endpoint, int statusCode, int durationMs, {String? method, int? bodySize}) {
    _totalApiCalls++;
    _apiEndpointCalls[endpoint] = (_apiEndpointCalls[endpoint] ?? 0) + 1;
    _apiResponseTimes.putIfAbsent(endpoint, () => []);
    _apiResponseTimes[endpoint]!.add(durationMs);
    if (!_isDevMode && _apiResponseTimes[endpoint]!.length > 50) {
      _apiResponseTimes[endpoint]!.removeAt(0);
    }
    _trackRaw('api_call', {
      'endpoint': endpoint,
      'statusCode': statusCode,
      'durationMs': durationMs,
      if (method != null) 'method': method,
      if (bodySize != null) 'bodySize': bodySize,
    });
  }

  static void trackFormSubmit(String formName, {bool success = true, String? error, Map<String, dynamic>? fields}) {
    _totalFormSubmits++;
    _trackRaw('form_submit', {
      'form': formName,
      'success': success,
      if (error != null) 'error': error,
      if (fields != null) 'fields': fields,
    });
  }

  static void trackNetworkError(String url, int? statusCode, String errorMessage) {
    _totalErrors++;
    final errorKey = '${statusCode ?? "?"}:$url';
    _errorCounts[errorKey] = (_errorCounts[errorKey] ?? 0) + 1;
    _trackRaw('network_error', {
      'url': url,
      'statusCode': statusCode,
      'error': errorMessage.length > 500 ? errorMessage.substring(0, 500) : errorMessage,
    });
  }

  static void trackScroll(String screen, String direction, {double? position, String? listId}) {
    _trackRaw('scroll', {
      'screen': screen,
      'direction': direction,
      if (position != null) 'position': position,
      if (listId != null) 'listId': listId,
    });
  }

  static void trackLongPress(String elementId, {String? screen, String? elementType}) {
    _trackRaw('long_press', {
      'elementId': elementId,
      'screen': screen ?? _currentScreen,
      if (elementType != null) 'elementType': elementType,
    });
  }

  static void trackDialogAction(String dialogId, String action, {String? dialogType}) {
    _trackRaw('dialog', {
      'dialogId': dialogId,
      'action': action,
      if (dialogType != null) 'dialogType': dialogType,
    });
  }

  static void trackAppLifecycle(String state) {
    _trackRaw('lifecycle', {'state': state});
  }

  static void trackTextInput(String fieldId, {String? screen, int? charCount, String? fieldType}) {
    _totalTextInputs++;
    _trackRaw('text_input', {
      'fieldId': fieldId,
      'screen': screen ?? _currentScreen,
      if (charCount != null) 'charCount': charCount,
      if (fieldType != null) 'fieldType': fieldType,
    });
  }

  static void trackTabChange(String tabId, {String? screen, int? tabIndex}) {
    _trackRaw('tab_change', {
      'tabId': tabId,
      'screen': screen ?? _currentScreen,
      if (tabIndex != null) 'tabIndex': tabIndex,
    });
  }

  static void trackDropdownSelect(String dropdownId, String value, {String? screen}) {
    _trackRaw('dropdown_select', {
      'dropdownId': dropdownId,
      'value': value,
      'screen': screen ?? _currentScreen,
    });
  }

  static void trackCheckbox(String checkboxId, bool value, {String? screen}) {
    _trackRaw('checkbox', {
      'checkboxId': checkboxId,
      'value': value,
      'screen': screen ?? _currentScreen,
    });
  }

  static void trackModalOpen(String modalId, {String? screen}) {
    _trackRaw('modal_open', {
      'modalId': modalId,
      'screen': screen ?? _currentScreen,
    });
  }

  static void trackModalClose(String modalId, {String? screen, String? result}) {
    _trackRaw('modal_close', {
      'modalId': modalId,
      'screen': screen ?? _currentScreen,
      if (result != null) 'result': result,
    });
  }

  static void trackError(String errorType, String message, {String? screen, String? stackTrace}) {
    _totalErrors++;
    _errorCounts[errorType] = (_errorCounts[errorType] ?? 0) + 1;
    _trackRaw('app_error', {
      'errorType': errorType,
      'message': message.length > 500 ? message.substring(0, 500) : message,
      'screen': screen ?? _currentScreen,
      if (stackTrace != null) 'stackTrace': stackTrace.length > 1000 ? stackTrace.substring(0, 1000) : stackTrace,
    });
  }

  static void trackListItemAction(String listId, String action, {String? itemId, String? screen}) {
    _trackRaw('list_item_action', {
      'listId': listId,
      'action': action,
      if (itemId != null) 'itemId': itemId,
      'screen': screen ?? _currentScreen,
    });
  }

  static void trackSearchQuery(String query, {int? resultCount, String? screen}) {
    _trackRaw('search', {
      'queryLength': query.length,
      if (resultCount != null) 'resultCount': resultCount,
      'screen': screen ?? _currentScreen,
    });
  }

  static void _trackRaw(String type, Map<String, dynamic> data) {
    if (!_isDevMode && _actionLog.length >= _prodActionLimit) {
      _actionLog.removeAt(0);
    }
    _actionLog.add({
      'ts': DateTime.now().toIso8601String(),
      'type': type,
      'screen': _currentScreen,
      ...data,
    });
  }

  static Map<String, dynamic> getAnalyticsSummary() {
    final screenDurationsStr = <String, String>{};
    _screenDurations.forEach((k, v) {
      screenDurationsStr[k] = '${v.inSeconds}s';
    });

    final apiStats = <String, dynamic>{};
    _apiResponseTimes.forEach((endpoint, times) {
      if (times.isNotEmpty) {
        final sorted = List<int>.from(times)..sort();
        apiStats[endpoint] = {
          'calls': times.length,
          'avgMs': (times.reduce((a, b) => a + b) / times.length).round(),
          'minMs': sorted.first,
          'maxMs': sorted.last,
          'p95Ms': sorted[(sorted.length * 0.95).floor().clamp(0, sorted.length - 1)],
        };
      }
    });

    return {
      'sessionDuration': '${_sessionTimer.elapsed.inSeconds}s',
      'sessionDurationMs': _sessionTimer.elapsedMilliseconds,
      'totalActions': _actionLog.length,
      'totalTaps': _totalTaps,
      'totalSwipes': _totalSwipes,
      'totalNavigations': _totalNavs,
      'totalApiCalls': _totalApiCalls,
      'totalErrors': _totalErrors,
      'totalFormSubmits': _totalFormSubmits,
      'totalTextInputs': _totalTextInputs,
      'screenVisits': Map<String, int>.from(_screenVisits),
      'buttonTaps': Map<String, int>.from(_buttonTaps),
      'screenDurations': screenDurationsStr,
      'apiStats': _isDevMode ? apiStats : null,
      'apiEndpointCalls': Map<String, int>.from(_apiEndpointCalls),
      'errorCounts': Map<String, int>.from(_errorCounts),
      'currentScreen': _currentScreen,
      'mode': _isDevMode ? 'dev' : 'prod',
      'monitoringSnapshots': _isDevMode ? _monitoringSnapshots.length : 0,
    };
  }

  static Map<String, dynamic> getDeviceMonitoring() {
    int? rss;
    int? maxRss;
    try {
      rss = ProcessInfo.currentRss;
      maxRss = ProcessInfo.maxRss;
    } catch (_) {}

    return {
      'platform': Platform.operatingSystem,
      'osVersion': Platform.operatingSystemVersion,
      'processors': Platform.numberOfProcessors,
      'locale': Platform.localeName,
      'dartVersion': Platform.version.split(' ').first,
      'hostname': Platform.localHostname,
      'memoryRssBytes': rss,
      'memoryMaxRssBytes': maxRss,
      'memoryRssMb': rss != null ? (rss / 1024 / 1024).toStringAsFixed(1) : null,
      'memoryMaxRssMb': maxRss != null ? (maxRss / 1024 / 1024).toStringAsFixed(1) : null,
      'executablePath': Platform.resolvedExecutable,
      'environment': _isDevMode ? {
        'LANG': Platform.environment['LANG'],
        'HOME': Platform.environment['HOME'],
      } : null,
    };
  }

  static void initialize() {
    if (_initialized) return;
    _initialized = true;
    _sessionTimer.start();

    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      _reportError(
        crashType: 'FlutterError',
        message: details.exceptionAsString(),
        stackTrace: details.stack?.toString(),
        context: details.context?.toStringDeep(),
      );
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      _reportError(
        crashType: 'UncaughtError',
        message: error.toString(),
        stackTrace: stack.toString(),
      );
      return true;
    };

    // Envoyer les rapports en attente (disque ou mémoire) dès que possible
    _sendPendingReportsFromDisk();
    flushPendingReports();

    debugPrint('[CrashReporter] Initialise (mode: ${_isDevMode ? "DEV - tracking illimite" : "PROD"})');
  }

  static Future<void> reportManualError({
    required String message,
    String? stackTrace,
    String? screenName,
    Map<String, dynamic>? metadata,
  }) async {
    await _reportError(
      crashType: 'ManualReport',
      message: message,
      stackTrace: stackTrace,
      screenName: screenName,
      metadata: metadata,
    );
  }

  static Future<void> _reportError({
    required String crashType,
    required String message,
    String? stackTrace,
    String? context,
    String? screenName,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final deviceInfo = getDeviceMonitoring();
      final analytics = getAnalyticsSummary();
      final report = {
        'crashType': crashType,
        'message': message.length > 2000 ? message.substring(0, 2000) : message,
        'stackTrace': stackTrace,
        'deviceInfo': deviceInfo,
        'appVersion': '1.0.0',
        'sessionId': _sessionId,
        'screenName': screenName ?? _currentScreen ?? 'unknown',
        'userActions': _isDevMode
            ? _actionLog
            : _actionLog.length > 100
                ? _actionLog.sublist(_actionLog.length - 100)
                : _actionLog,
        'analytics': analytics,
        'metadata': {
          ...?metadata,
          if (context != null) 'context': context,
        },
      };

      debugPrint('[CrashReporter] Envoi rapport: $crashType - $message');

      final sent = await _sendReport(report);
      if (_authToken != null && _authToken!.isNotEmpty) {
        unawaited(ApiService.postAnalyticsError(
          errorType: 'mobile',
          errorName: crashType,
          errorMessage: message,
          stackTrace: stackTrace,
          page: screenName ?? _currentScreen,
          platform: Platform.isAndroid
              ? 'android'
              : (Platform.isIOS ? 'ios' : 'mobile'),
          severity: crashType == 'FlutterError' || crashType == 'UncaughtError'
              ? 'critical'
              : 'error',
          properties: metadata ?? {},
          token: _authToken,
        ));
      }
      if (!sent) {
        _pendingReports.add(report);
        _persistReport(report);
      }
    } catch (e) {
      debugPrint('[CrashReporter] Erreur lors de l\'envoi: $e');
      try {
        final report = {
          'crashType': crashType,
          'message': message.length > 2000 ? message.substring(0, 2000) : message,
          'stackTrace': stackTrace,
          'deviceInfo': getDeviceMonitoring(),
          'sessionId': _sessionId,
          'screenName': screenName ?? _currentScreen ?? 'unknown',
          'saveError': e.toString(),
        };
        _persistReport(report);
      } catch (_) {}
    }
  }

  static const String _pendingFileName = 'crash_reports_pending.jsonl';

  static void _persistReport(Map<String, dynamic> report) {
    getApplicationDocumentsDirectory().then((dir) {
      try {
        final file = File('${dir.path}/$_pendingFileName');
        file.writeAsStringSync('${jsonEncode(report)}\n', mode: FileMode.append);
        debugPrint('[CrashReporter] Rapport persiste sur disque');
      } catch (e) {
        debugPrint('[CrashReporter] Erreur persistance: $e');
      }
    }).catchError((_) {});
  }

  static Future<void> _sendPendingReportsFromDisk() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_pendingFileName');
      if (!await file.exists()) return;
      final lines = await file.readAsLines();
      if (lines.isEmpty) return;
      final reports = <Map<String, dynamic>>[];
      for (final line in lines) {
        final t = line.trim();
        if (t.isEmpty) continue;
        try {
          reports.add(Map<String, dynamic>.from(jsonDecode(t) as Map));
        } catch (_) {}
      }
      for (final report in reports) {
        final sent = await _sendReport(report);
        if (!sent) break;
      }
      await file.writeAsString('');
      debugPrint('[CrashReporter] Rapports en attente sur disque envoyes');
    } catch (e) {
      debugPrint('[CrashReporter] Lecture rapports disque: $e');
    }
  }

  static Future<bool> _sendReport(Map<String, dynamic> report) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (_authToken != null && _authToken!.isNotEmpty) {
        headers['Authorization'] = 'Bearer $_authToken';
      }
      final response = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/v1/crashes'),
        headers: headers,
        body: jsonEncode(report),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('[CrashReporter] Rapport envoye avec succes');
        return true;
      }
      debugPrint('[CrashReporter] Erreur envoi: ${response.statusCode}');
      return false;
    } catch (e) {
      debugPrint('[CrashReporter] Erreur envoi: $e');
      return false;
    }
  }

  static final List<Map<String, dynamic>> _pendingReports = [];
  static final String _sessionId = DateTime.now().millisecondsSinceEpoch.toRadixString(36);

  static Future<void> flushPendingReports() async {
    if (_pendingReports.isEmpty) return;

    final toSend = List<Map<String, dynamic>>.from(_pendingReports);
    _pendingReports.clear();

    for (final report in toSend) {
      final sent = await _sendReport(report);
      if (!sent) _pendingReports.add(report);
    }

    if (_pendingReports.isEmpty) {
      debugPrint('[CrashReporter] Tous les rapports en attente envoyes');
    }
  }

  static Future<Map<String, dynamic>> collectFullDiagnostic() async {
    final deviceInfo = getDeviceMonitoring();
    final analytics = getAnalyticsSummary();

    final actionsByType = <String, int>{};
    for (final a in _actionLog) {
      final t = a['type'] as String? ?? 'unknown';
      actionsByType[t] = (actionsByType[t] ?? 0) + 1;
    }

    final errorActions = _actionLog.where((a) =>
      a['type'] == 'network_error' || a['type'] == 'form_submit' && a['success'] == false
    ).toList();

    return {
      'device': deviceInfo,
      'analytics': analytics,
      'actionLog': _isDevMode ? _actionLog : _actionLog.sublist(
        _actionLog.length > 200 ? _actionLog.length - 200 : 0,
      ),
      'actionsByType': actionsByType,
      'errorActions': _isDevMode ? errorActions : errorActions.length > 50
          ? errorActions.sublist(errorActions.length - 50) : errorActions,
      'pendingReports': _pendingReports.length,
      'sessionId': _sessionId,
      'timestamp': DateTime.now().toIso8601String(),
      'mode': _isDevMode ? 'dev' : 'prod',
    };
  }
}
