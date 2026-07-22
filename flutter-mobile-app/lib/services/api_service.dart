import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:jobbingtrack_flutter/datas/models/models.dart';

/// Client HTTP central — une seule base URL + token partagé.
class ApiService {
  /// Gateway locale. Surcharge : `--dart-define=API_BASE_URL=...`
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:5002',
  );

  static String? _authToken;

  static void setAuthToken(String? token) => _authToken = token;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_authToken != null && _authToken!.isNotEmpty)
          'Authorization': 'Bearer $_authToken',
      };

  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return Map<String, dynamic>.from(data as Map);
    }
    throw Exception(
      (data is Map ? data['error'] : null) ??
          'Erreur HTTP ${response.statusCode}',
    );
  }

  static Future<List<Application>> getApplications() async {
    return _getList(
      path: '/api/v1/applications?limit=100',
      listKey: 'applications',
      map: Application.fromJson,
    );
  }

  static Future<List<Company>> getCompanies() async {
    return _getList(
      path: '/api/v1/companies?limit=100',
      listKey: 'companies',
      map: Company.fromJson,
    );
  }

  static Future<List<Contact>> getContacts() async {
    return _getList(
      path: '/api/v1/contacts?limit=100',
      listKey: 'contacts',
      map: Contact.fromJson,
    );
  }

  static Future<List<Event>> getEvents() async {
    return _getList(
      path: '/api/v1/events?limit=100',
      listKey: 'events',
      map: Event.fromJson,
    );
  }

  static Future<List<ApplicationStatusHistory>> getApplicationStatusHistory(
    String applicationId,
  ) async {
    return _getList(
      path: '/api/v1/applications/$applicationId/status-history',
      listKey: 'statusHistory',
      map: ApplicationStatusHistory.fromJson,
    );
  }

  static Future<Map<String, dynamic>> updateApplicationStatus(
    String applicationId,
    String status,
    String comment,
  ) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/v1/applications/$applicationId/status'),
      headers: _headers,
      body: jsonEncode({'status': status, 'comment': comment}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return Map<String, dynamic>.from(data as Map);
    }
    throw Exception('Erreur HTTP ${response.statusCode}');
  }

  static Future<List<T>> _getList<T>({
    required String path,
    required String listKey,
    required T Function(Map<String, dynamic>) map,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$path'),
        headers: _headers,
      );
      if (response.statusCode != 200) {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
      final data = jsonDecode(response.body);
      if (data is Map && data[listKey] is List) {
        return (data[listKey] as List)
            .map((e) => map(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      return [];
    } catch (e) {
      throw Exception('Erreur réseau: $e');
    }
  }
}
