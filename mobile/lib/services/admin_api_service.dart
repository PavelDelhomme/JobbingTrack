import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/utils/admin_time_range.dart';

/// API admin mobile — mêmes endpoints que le backoffice web.
class AdminApiService {
  static const _timeout = Duration(seconds: 15);

  static Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  static Future<http.Response> _get(String path, {String? token}) =>
      http.get(Uri.parse('${ApiService.baseUrl}$path'), headers: _headers(token)).timeout(_timeout);

  static Future<http.Response> _post(String path, {String? token, Object? body}) =>
      http
          .post(
            Uri.parse('${ApiService.baseUrl}$path'),
            headers: _headers(token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

  static Future<http.Response> _put(String path, {String? token, Object? body}) =>
      http
          .put(
            Uri.parse('${ApiService.baseUrl}$path'),
            headers: _headers(token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

  static Future<http.Response> _patch(String path, {String? token, Object? body}) =>
      http
          .patch(
            Uri.parse('${ApiService.baseUrl}$path'),
            headers: _headers(token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

  static Future<http.Response> _delete(String path, {String? token}) =>
      http.delete(Uri.parse('${ApiService.baseUrl}$path'), headers: _headers(token)).timeout(_timeout);

  static Map<String, dynamic> _jsonMap(http.Response r) {
    if (r.body.isEmpty) return {};
    return Map<String, dynamic>.from(jsonDecode(r.body) as Map);
  }

  static void _ensureOk(http.Response r, {int? minStatus, int? maxStatus}) {
    final min = minStatus ?? 200;
    final max = maxStatus ?? 299;
    if (r.statusCode < min || r.statusCode > max) {
      final data = _jsonMap(r);
      throw Exception(data['message'] ?? data['error'] ?? 'Erreur HTTP ${r.statusCode}');
    }
  }

  // ——— Utilisateurs ———

  static Future<List<User>> fetchUsers({required String? token, int limit = 200}) async {
    final r = await _get('/api/v1/auth/users?limit=$limit', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    final list = data['users'] as List? ?? [];
    return list.map((e) => User.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  static Future<Map<String, dynamic>> fetchUser(String id, {required String? token}) async {
    final r = await _get('/api/v1/auth/users/${Uri.encodeComponent(id)}', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return Map<String, dynamic>.from((data['user'] ?? data) as Map);
  }

  static Future<void> updateUser(
    String id, {
    required String? token,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
  }) async {
    final body = <String, dynamic>{};
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (email != null) body['email'] = email;
    if (phone != null) body['phone'] = phone;
    final r = await _put('/api/v1/auth/users/${Uri.encodeComponent(id)}', token: token, body: body);
    _ensureOk(r);
  }

  static Future<void> updateUserRole(String id, String role, {required String? token}) async {
    final r = await _put('/api/v1/auth/users/${Uri.encodeComponent(id)}/role', token: token, body: {'role': role});
    _ensureOk(r);
  }

  static Future<void> toggleUserStatus(String id, bool isActive, {required String? token}) async {
    final r = await _put('/api/v1/auth/users/${Uri.encodeComponent(id)}/status', token: token, body: {'isActive': isActive});
    _ensureOk(r);
  }

  static Future<void> deleteUser(String id, {required String? token}) async {
    final r = await _delete('/api/v1/auth/users/${Uri.encodeComponent(id)}', token: token);
    _ensureOk(r, minStatus: 200, maxStatus: 204);
  }

  static Future<void> sendPasswordReset(String id, {required String? token}) async {
    final r = await _post('/api/v1/auth/users/${Uri.encodeComponent(id)}/send-password-reset', token: token);
    _ensureOk(r, minStatus: 200, maxStatus: 202);
  }

  static Future<void> resendVerification(String id, {required String? token}) async {
    final r = await _post('/api/v1/auth/users/${Uri.encodeComponent(id)}/resend-verification', token: token);
    _ensureOk(r, minStatus: 200, maxStatus: 202);
  }

  /// Connexion en tant qu'utilisateur (impersonation admin).
  static Future<({String token, Map<String, dynamic> user})> impersonateUser(
    String id, {
    required String? token,
  }) async {
    final r = await _post('/api/v1/auth/users/${Uri.encodeComponent(id)}/impersonate', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    final user = Map<String, dynamic>.from((data['user'] ?? {}) as Map);
    final impToken = data['token']?.toString();
    if (impToken == null || impToken.isEmpty) {
      throw Exception('Token impersonation absent');
    }
    return (token: impToken, user: user);
  }

  static Future<void> cleanTestUsers({required String? token}) async {
    final r = await _post('/api/v1/auth/users/clean-test-users', token: token);
    _ensureOk(r);
  }

  // ——— Logs / crashes / erreurs ———

  static Future<List<Map<String, dynamic>>> fetchCrashReports({required String? token, int limit = 100}) async {
    final r = await _get('/api/v1/crashes?limit=$limit', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return List<Map<String, dynamic>>.from((data['data'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
  }

  static Future<List<Map<String, dynamic>>> fetchApplicationErrors({
    required String? token,
    required AdminTimeRange range,
    bool excludeFeedback = true,
    int limit = 300,
  }) async {
    final q = '${range.queryString()}&scope=application&platform=mobile&limit=$limit'
        '${excludeFeedback ? '&excludeFeedback=true' : ''}';
    final r = await _get('/api/v1/analytics/errors?$q', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return List<Map<String, dynamic>>.from((data['data'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
  }

  static Future<void> resolveApplicationError(String id, {required String? token, bool resolved = true}) async {
    final r = await _patch(
      '/api/v1/analytics/errors/${Uri.encodeComponent(id)}/resolve',
      token: token,
      body: {'resolved': resolved},
    );
    _ensureOk(r);
  }

  // ——— Analytics application ———

  static Future<List<Map<String, dynamic>>> fetchApplicationEvents({
    required String? token,
    required AdminTimeRange range,
    int limit = 50,
  }) async {
    final q = '${range.queryString()}&scope=application&platform=mobile&limit=$limit';
    final r = await _get('/api/v1/analytics/events?$q', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return List<Map<String, dynamic>>.from((data['data'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
  }

  static Future<List<Map<String, dynamic>>> fetchApplicationPerformance({
    required String? token,
    required AdminTimeRange range,
    int limit = 50,
  }) async {
    final q = '${range.queryString()}&scope=application&platform=mobile&limit=$limit';
    final r = await _get('/api/v1/analytics/performance?$q', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return List<Map<String, dynamic>>.from((data['data'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
  }

  // ——— Statistiques plateforme ———

  static Future<Map<String, dynamic>> fetchStatistics({required String? token}) async {
    final r = await _get('/api/v1/statistics', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return Map<String, dynamic>.from((data['statistics'] ?? data['data'] ?? data) as Map);
  }

  // ——— Infra / performances système ———

  static Future<Map<String, dynamic>> fetchSystemMetrics({required String? token}) async {
    final r = await _get('/api/v1/metrics', token: token);
    _ensureOk(r);
    return _jsonMap(r);
  }

  static Future<Map<String, dynamic>> fetchServicesStatus({required String? token}) async {
    final r = await _get('/api/v1/services', token: token);
    _ensureOk(r);
    return _jsonMap(r);
  }

  static Future<List<Map<String, dynamic>>> fetchStatisticsTimeline({
    required String? token,
    required AdminTimeRange range,
    int limit = 100,
  }) async {
    final tr = range.statisticsTimeRange();
    final r = await _get('/api/v1/statistics/timeline?time_range=$tr&limit=$limit', token: token);
    _ensureOk(r);
    final data = _jsonMap(r);
    return List<Map<String, dynamic>>.from((data['timeline'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
  }

  // ——— Données de test ———

  static Future<Map<String, dynamic>> fetchTestDataSummary({required String? token}) async {
    final r = await _get('/api/v1/admin/test-data/summary', token: token);
    _ensureOk(r);
    return _jsonMap(r);
  }

  static Future<Map<String, dynamic>> generateTestData({
    required String? token,
    required Map<String, dynamic> config,
    bool balanced = true,
  }) async {
    final r = await _post('/api/v1/admin/generate-test-data', token: token, body: {'config': config, 'balanced': balanced});
    _ensureOk(r, minStatus: 200, maxStatus: 201);
    return _jsonMap(r);
  }

  static Future<Map<String, dynamic>> clearTestData({
    required String? token,
    bool onlyTestData = true,
  }) async {
    final r = await _post('/api/v1/admin/clear-test-data', token: token, body: {'onlyTestData': onlyTestData});
    _ensureOk(r);
    return _jsonMap(r);
  }

  static Future<Map<String, dynamic>> tagLikelyTestData({required String? token}) async {
    final r = await _post('/api/v1/admin/test-data/tag-likely', token: token);
    _ensureOk(r);
    return _jsonMap(r);
  }

  static bool isUserFeedbackCrash(Map<String, dynamic> crash) {
    final msg = (crash['message'] ?? '').toString();
    if (RegExp(r'^\[(bug|suggestion|signalement)\]', caseSensitive: false).hasMatch(msg)) return true;
    final meta = crash['metadata'];
    if (meta is Map) {
      final nested = meta['metadata'];
      if (nested is Map && nested['feedback'] == true) return true;
    }
    return crash['crashType'] == 'ManualReport';
  }

  static String feedbackCategory(Map<String, dynamic> crash) {
    final msg = (crash['message'] ?? '').toString();
    final m = RegExp(r'^\[(bug|suggestion|signalement)\]', caseSensitive: false).firstMatch(msg);
    if (m != null) return m.group(1)!.toLowerCase();
    return 'retour';
  }
}
