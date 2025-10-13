import 'dart:convert';
import 'package:http/http.dart' as http;
import '../main.dart';

class ApiService {
  static const String baseUrl = 'http://host.docker.internal:3000';

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

  static Future<List<Application>> getApplications() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/applications'),
        headers: {
          'Content-Type': 'application/json',
          // Ajouter le token d'authentification si disponible
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
}
