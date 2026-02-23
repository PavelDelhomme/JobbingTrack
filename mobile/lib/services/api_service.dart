import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/models/application.dart';
import 'package:jobbingtrack_mobile/models/company.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator

  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
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
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      if (e is Exception) {
        rethrow;
      }
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  /// Envoie un email de réinitialisation à l'adresse fournie.
  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim()}),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
      throw Exception(body['message'] ?? body['error'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Réinitialise le mot de passe avec le token reçu par email.
  static Future<Map<String, dynamic>> resetPassword(String token, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/auth/reset-password/$token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'password': password}),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
      throw Exception(body['message'] ?? body['error'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  /// Vérifie l'email avec le token reçu par email (lien de vérification).
  static Future<Map<String, dynamic>> verifyEmail(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/auth/verify-email/$token'),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : <String, dynamic>{};
      throw Exception(body['message'] ?? body['error'] ?? 'Erreur ${response.statusCode}');
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur réseau: $e');
    }
  }

  static Future<List<Application>> getApplications() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/applications'),
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['applications'] != null) {
          return (data['applications'] as List)
              .map((json) => Application.fromJson(json))
              .toList();
        }
        return [];
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<Application> createApplication(Application application) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/applications'),
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token
        },
        body: jsonEncode(application.toJson()),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Application.fromJson(data['application']);
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<Application> updateApplication(String id, Application application) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/v1/applications/$id'),
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token
        },
        body: jsonEncode(application.toJson()),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Application.fromJson(data['application']);
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<void> deleteApplication(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/api/v1/applications/$id'),
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token
        },
      );

      if (response.statusCode != 200) {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<List<Company>> getCompanies() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/companies'),
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['companies'] != null) {
          return (data['companies'] as List)
              .map((json) => Company.fromJson(json))
              .toList();
        }
        return [];
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur de connexion réseau: $e');
    }
  }

  static Future<List<User>> getUsers() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/auth/users'),
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['users'] != null) {
          return (data['users'] as List)
              .map((json) => User.fromJson(json))
              .toList();
        }
        return [];
      } else {
        throw Exception('Erreur HTTP ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur de connexion réseau: $e');
    }
  }
}
