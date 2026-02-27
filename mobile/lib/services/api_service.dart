import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';

class ApiService {
  static const int _apiPort = 5002;
  static const Duration _timeout = Duration(seconds: 10);

  static String? _resolvedBaseUrl;

  static String get baseUrl {
    if (_resolvedBaseUrl != null) return _resolvedBaseUrl!;
    return 'http://localhost:$_apiPort';
  }

  static set baseUrl(String url) => _resolvedBaseUrl = url;

  /// Tente de trouver un baseUrl fonctionnel (localhost via adb reverse, 10.0.2.2 pour émulateur, IP LAN).
  static Future<bool> autoDetectApi() async {
    final candidates = [
      'http://localhost:$_apiPort',
      'http://10.0.2.2:$_apiPort',
      'http://127.0.0.1:$_apiPort',
    ];
    for (final url in candidates) {
      try {
        debugPrint('[API] Test connexion: $url/health');
        final res = await http
            .get(Uri.parse('$url/health'))
            .timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          _resolvedBaseUrl = url;
          debugPrint('[API] Connexion OK: $url');
          return true;
        }
      } catch (_) {
        debugPrint('[API] Echec: $url');
      }
    }
    debugPrint('[API] Aucune URL fonctionnelle trouvée, fallback localhost');
    _resolvedBaseUrl = candidates.first;
    return false;
  }

  static Future<http.Response> _get(String path, {Map<String, String>? headers}) {
    debugPrint('[API] GET $baseUrl$path');
    return http.get(Uri.parse('$baseUrl$path'), headers: headers).timeout(_timeout);
  }

  static Future<http.Response> _post(String path, {Map<String, String>? headers, Object? body}) {
    debugPrint('[API] POST $baseUrl$path');
    return http.post(Uri.parse('$baseUrl$path'), headers: headers, body: body).timeout(_timeout);
  }

  static Future<http.Response> _put(String path, {Map<String, String>? headers, Object? body}) {
    debugPrint('[API] PUT $baseUrl$path');
    return http.put(Uri.parse('$baseUrl$path'), headers: headers, body: body).timeout(_timeout);
  }

  static Future<http.Response> _delete(String path, {Map<String, String>? headers}) {
    debugPrint('[API] DELETE $baseUrl$path');
    return http.delete(Uri.parse('$baseUrl$path'), headers: headers).timeout(_timeout);
  }

  static Map<String, String> _jsonHeaders([String? token]) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

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
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
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
}
