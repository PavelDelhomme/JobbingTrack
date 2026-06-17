import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';
import 'package:jobbingtrack_mobile/models/followup.dart';
import 'package:jobbingtrack_mobile/models/interview.dart';
import 'package:jobbingtrack_mobile/models/call.dart';

class ApiService {
  static const int _apiPort = 5002;
  static const Duration _timeout = Duration(seconds: 10);

  static String? _resolvedBaseUrl;

  /// Appelé quand une requête authentifiée reçoit 401/403 (session révoquée côté serveur).
  static Future<void> Function(String path, int statusCode)? onSessionRevoked;

  /// URL de l'API. Par défaut en local : 127.0.0.1 (adb reverse) ou 10.0.2.2 (émulateur).
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (_resolvedBaseUrl != null) return _resolvedBaseUrl!;
    return 'http://127.0.0.1:$_apiPort';
  }

  static set baseUrl(String url) {
    _resolvedBaseUrl = url;
    ApiConfigStore.saveBaseUrl(url);
  }

  static Future<bool> _probeHealth(String url) async {
    try {
      debugPrint('[API] Test: $url/health');
      final res = await http
          .get(Uri.parse('$url/health'))
          .timeout(const Duration(seconds: 2));
      if (res.statusCode == 200) {
        _resolvedBaseUrl = url;
        debugPrint('[API] OK: $url');
        return true;
      }
    } catch (_) {
      debugPrint('[API] Echec: $url');
    }
    return false;
  }

  static List<String> _localCandidates() {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    const lanHost = String.fromEnvironment('MOBILE_DEV_LAN_HOST', defaultValue: '');
    final candidates = <String>[];
    if (fromEnv.isNotEmpty) candidates.add(fromEnv);
    if (lanHost.isNotEmpty) candidates.add('http://$lanHost:$_apiPort');
    candidates.addAll([
      'http://127.0.0.1:$_apiPort', // Appareil physique avec adb reverse
      'http://10.0.2.2:$_apiPort', // Émulateur Android
      'http://localhost:$_apiPort',
    ]);
    return candidates;
  }

  /// Tente de trouver un baseUrl fonctionnel.
  /// Ordre : dart-define, URL sauvegardée, 127.0.0.1, IP LAN build, 10.0.2.2, localhost.
  /// Si aucune ne répond, on passe quand même à l'écran de connexion (pas de blocage).
  static Future<bool> autoDetectApi() async {
    const fromEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) {
      _resolvedBaseUrl = fromEnv;
      debugPrint('[API] URL prod (dart-define): $fromEnv');
      return true;
    }

    final saved = await ApiConfigStore.loadBaseUrl();
    if (saved != null && await _probeHealth(saved)) {
      return true;
    }

    for (final url in _localCandidates()) {
      if (await _probeHealth(url)) return true;
    }

    _resolvedBaseUrl = 'http://127.0.0.1:$_apiPort';
    debugPrint('[API] Aucune URL OK, passage à l\'écran connexion avec: $_resolvedBaseUrl');
    return true;
  }

  static Future<http.Response> _get(String path, {Map<String, String>? headers}) async {
    debugPrint('[API] GET $baseUrl$path');
    final response =
        await http.get(Uri.parse('$baseUrl$path'), headers: headers).timeout(_timeout);
    _maybeNotifySessionRevoked(response, headers, path);
    return response;
  }

  static Future<http.Response> _post(String path, {Map<String, String>? headers, Object? body}) async {
    debugPrint('[API] POST $baseUrl$path');
    final response =
        await http.post(Uri.parse('$baseUrl$path'), headers: headers, body: body).timeout(_timeout);
    _maybeNotifySessionRevoked(response, headers, path);
    return response;
  }

  static Future<http.Response> _put(String path, {Map<String, String>? headers, Object? body}) async {
    debugPrint('[API] PUT $baseUrl$path');
    final response =
        await http.put(Uri.parse('$baseUrl$path'), headers: headers, body: body).timeout(_timeout);
    _maybeNotifySessionRevoked(response, headers, path);
    return response;
  }

  static Future<http.Response> _delete(String path, {Map<String, String>? headers}) async {
    debugPrint('[API] DELETE $baseUrl$path');
    final response =
        await http.delete(Uri.parse('$baseUrl$path'), headers: headers).timeout(_timeout);
    _maybeNotifySessionRevoked(response, headers, path);
    return response;
  }

  static void _maybeNotifySessionRevoked(
    http.Response response,
    Map<String, String>? headers,
    String path,
  ) {
    final auth = headers?['Authorization'];
    if (auth == null || !auth.startsWith('Bearer ')) return;
    if (response.statusCode != 401 && response.statusCode != 403) return;
    if (path.contains('/mobile/security-events')) return;
    final handler = onSessionRevoked;
    if (handler != null) {
      handler(path, response.statusCode);
    }
  }

  static Map<String, String> _jsonHeaders([String? token]) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
    ..._correlationHeaders(),
  };

  static String _newRequestId() =>
      'mob-${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond}';

  static Map<String, String> _correlationHeaders() {
    final requestId = _newRequestId();
    return {
      'X-Request-Id': requestId,
      'X-Correlation-Id': requestId,
    };
  }

  /// Signaux sécurité mobile (session révoquée, échec auth, etc.) — B9
  static Future<void> postSecurityEvent({
    required String eventType,
    String? message,
    String? deviceId,
    String? userId,
    Map<String, dynamic>? metadata,
    String? token,
  }) async {
    try {
      await _post(
        '/api/v1/mobile/security-events',
        headers: _jsonHeaders(token),
        body: jsonEncode({
          'eventType': eventType,
          'message': message,
          'deviceId': deviceId,
          'userId': userId,
          'metadata': metadata ?? {},
          'timestamp': DateTime.now().toUtc().toIso8601String(),
          'source': 'mobile',
        }),
      );
    } catch (e) {
      debugPrint('[API] security-event non envoyé: $e');
    }
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _post(
        '/api/v1/auth/login',
        headers: _jsonHeaders(),
        body: jsonEncode({'email': email, 'password': password}),
      );
      debugPrint('[API] Login response: ${response.statusCode}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final body = response.body.isNotEmpty ? jsonDecode(response.body) : {};
        throw Exception(body['message'] ?? 'Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[API] Login error: $e');
      if (e is Exception) rethrow;
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    try {
      final response = await _post(
        '/api/v1/auth/register',
        headers: _jsonHeaders(),
        body: jsonEncode({
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
        }),
      );
      debugPrint('[API] Register response: ${response.statusCode}');
      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[API] Register error: $e');
      if (e is Exception) rethrow;
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await _post(
        '/api/v1/auth/forgot-password',
        headers: _jsonHeaders(),
        body: jsonEncode({'email': email.trim()}),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
      throw Exception(body['message'] ?? body['error'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<Map<String, dynamic>> resetPassword(String token, String password) async {
    try {
      final response = await _post(
        '/api/v1/auth/reset-password/$token',
        headers: _jsonHeaders(),
        body: jsonEncode({'password': password}),
      );
      if (response.statusCode == 200) return jsonDecode(response.body);
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
      throw Exception(body['message'] ?? body['error'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<Map<String, dynamic>> verifyEmail(String token) async {
    try {
      final response = await _get('/api/v1/auth/verify-email/$token');
      if (response.statusCode == 200) return jsonDecode(response.body);
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
      throw Exception(body['message'] ?? body['error'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<List<Application>> getApplications({String? token}) async {
    try {
      final response = await _get('/api/v1/applications', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['applications'] != null) {
          return (data['applications'] as List).map((json) => Application.fromJson(json)).toList();
        }
        return [];
      }
      if (response.statusCode == 401 || response.statusCode == 403) {
        final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
        throw Exception(body['message'] ?? 'Session expirée — reconnectez-vous');
      }
      throw Exception('Erreur HTTP ${response.statusCode}');
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<Application> createApplication(Application application, {String? token}) async {
    try {
      final response = await _post(
        '/api/v1/applications',
        headers: _jsonHeaders(token),
        body: jsonEncode(application.toJson()),
      );
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Application.fromJson(data['application']);
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Création candidature avec payload complet (tous les champs backend).
  static Future<Application> createApplicationFromPayload(Map<String, dynamic> payload, {String? token}) async {
    try {
      final response = await _post(
        '/api/v1/applications',
        headers: _jsonHeaders(token),
        body: jsonEncode(payload),
      );
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Application.fromJson(data['application'] ?? data);
      } else {
        final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
        throw Exception(body['message'] ?? body['error'] ?? 'Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Mise à jour candidature avec payload complet (champs autorisés backend).
  static Future<Application> updateApplicationFromPayload(String id, Map<String, dynamic> payload, {String? token}) async {
    try {
      final response = await _put(
        '/api/v1/applications/$id',
        headers: _jsonHeaders(token),
        body: jsonEncode(payload),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Application.fromJson(data['application'] ?? data);
      } else {
        final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
        throw Exception(body['message'] ?? body['error'] ?? 'Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }
  static Future<Application> updateApplication(String id, Application application, {String? token}) async {
    try {
      final response = await _put(
        '/api/v1/applications/$id',
        headers: _jsonHeaders(token),
        body: jsonEncode(application.toJson()),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Application.fromJson(data['application']);
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<void> deleteApplication(String id, {String? token}) async {
    try {
      final response = await _delete('/api/v1/applications/$id', headers: _jsonHeaders(token));
      if (response.statusCode != 200) {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<List<Company>> getCompanies({String? token}) async {
    try {
      final response = await _get('/api/v1/companies', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['companies'] != null) {
          return (data['companies'] as List).map((json) => Company.fromJson(json)).toList();
        }
        return [];
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<List<User>> getUsers({String? token}) async {
    try {
      final response = await _get('/api/v1/auth/users', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['users'] != null) {
          return (data['users'] as List).map((json) => User.fromJson(json)).toList();
        }
        return [];
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Contacts : liste
  static Future<List<Map<String, dynamic>>> getContacts({String? token}) async {
    try {
      final response = await _get('/api/v1/contacts?limit=100', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['contacts'] != null) {
          return List<Map<String, dynamic>>.from(
            (data['contacts'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        }
        return [];
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Relances : liste (optionnel applicationId) et création
  static Future<List<FollowUp>> getFollowUps({String? applicationId, String? token}) async {
    try {
      String path = '/api/v1/followups?limit=100';
      if (applicationId != null && applicationId.isNotEmpty) {
        path += '&applicationId=${Uri.encodeComponent(applicationId)}';
      }
      final response = await _get(path, headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['followups'] != null) {
          return (data['followups'] as List).map((j) => FollowUp.fromJson(Map<String, dynamic>.from(j))).toList();
        }
        return [];
      }
      throw Exception('Erreur HTTP ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<FollowUp> createFollowUp({
    required String applicationId,
    required DateTime followUpDate,
    String? notes,
    String status = 'PENDING',
    String? token,
  }) async {
    try {
      final body = {
        'applicationId': applicationId,
        'followUpDate': followUpDate.toUtc().toIso8601String(),
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        'status': status,
      };
      final response = await _post('/api/v1/followups', headers: _jsonHeaders(token), body: jsonEncode(body));
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final raw = data['followup'];
        if (raw != null) return FollowUp.fromJson(Map<String, dynamic>.from(raw));
      }
      final err = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      throw Exception(err['message'] ?? err['error'] ?? 'Erreur HTTP ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<FollowUp> completeFollowUp(String id, String response, {String? token}) async {
    final res = await _put(
      '/api/v1/followups/$id/complete',
      headers: _jsonHeaders(token),
      body: jsonEncode({'response': response}),
    );
    if (res.statusCode != 200) throw Exception('Erreur HTTP ${res.statusCode}');
    final data = jsonDecode(res.body);
    final raw = data['followup'];
    if (raw != null) return FollowUp.fromJson(Map<String, dynamic>.from(raw));
    throw Exception('Réponse invalide');
  }

  static Future<void> deleteFollowUp(String id, {String? token}) async {
    final res = await _delete('/api/v1/followups/$id', headers: _jsonHeaders(token));
    if (res.statusCode != 200) throw Exception('Erreur HTTP ${res.statusCode}');
  }

  /// Entretiens : liste et création
  static Future<List<Interview>> getInterviews({String? applicationId, String? token}) async {
    try {
      final response = await _get('/api/v1/interviews?limit=100', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['interviews'] != null) {
          var list = (data['interviews'] as List).map((j) => Interview.fromJson(Map<String, dynamic>.from(j))).toList();
          if (applicationId != null && applicationId.isNotEmpty) {
            list = list.where((i) => i.applicationId == applicationId).toList();
          }
          return list;
        }
        return [];
      }
      throw Exception('Erreur HTTP ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<Interview> createInterview({
    required String applicationId,
    required DateTime interviewDate,
    String? location,
    String? notes,
    int? estimatedDuration,
    String? token,
  }) async {
    try {
      final body = {
        'applicationId': applicationId,
        'interviewDate': interviewDate.toUtc().toIso8601String(),
        if (location != null && location.isNotEmpty) 'location': location,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (estimatedDuration != null) 'estimatedDuration': estimatedDuration,
      };
      final response = await _post('/api/v1/interviews', headers: _jsonHeaders(token), body: jsonEncode(body));
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final raw = data['interview'];
        if (raw != null) return Interview.fromJson(Map<String, dynamic>.from(raw));
      }
      final err = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      throw Exception(err['message'] ?? err['error'] ?? 'Erreur HTTP ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Appels : liste globale et par candidature
  static Future<List<Call>> getCalls({String? token}) async {
    try {
      final response = await _get('/api/v1/calls?limit=100', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['calls'] != null) {
          return (data['calls'] as List).map((j) => Call.fromJson(Map<String, dynamic>.from(j))).toList();
        }
        return [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<Call>> getCallsByApplication(String applicationId, {String? token}) async {
    try {
      final response = await _get('/api/v1/calls/application/$applicationId', headers: _jsonHeaders(token));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['calls'] != null) {
          return (data['calls'] as List).map((j) => Call.fromJson(Map<String, dynamic>.from(j))).toList();
        }
        return [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<Call> createCall({
    required String applicationId,
    required DateTime callDate,
    required String subject,
    String? notes,
    String? token,
  }) async {
    try {
      final body = {
        'applicationId': applicationId,
        'callDate': callDate.toUtc().toIso8601String(),
        'subject': subject,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      };
      final response = await _post('/api/v1/calls', headers: _jsonHeaders(token), body: jsonEncode(body));
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final raw = data['call'];
        if (raw != null) return Call.fromJson(Map<String, dynamic>.from(raw));
      }
      final err = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      throw Exception(err['message'] ?? err['error'] ?? 'Erreur HTTP ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }
}
