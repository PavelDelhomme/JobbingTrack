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

  // NOUVELLES MÉTHODES - Contacts
  static Future<List<Contact>> getContacts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/contacts'),
        headers: {
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['contacts'] != null) {
          return (data['contacts'] as List)
              .map((json) => Contact.fromJson(json))
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

  // NOUVELLES MÉTHODES - Événements
  static Future<List<Event>> getEvents() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/events'),
        headers: {
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['events'] != null) {
          return (data['events'] as List)
              .map((json) => Event.fromJson(json))
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

  // NOUVELLES MÉTHODES - Historique des statuts d'une candidature
  static Future<List<ApplicationStatusHistory>> getApplicationStatusHistory(String applicationId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/applications/$applicationId/status-history'),
        headers: {
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['statusHistory'] != null) {
          return (data['statusHistory'] as List)
              .map((json) => ApplicationStatusHistory.fromJson(json))
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

  // NOUVELLES MÉTHODES - Mettre à jour le statut d'une candidature
  static Future<Map<String, dynamic>> updateApplicationStatus(
      String applicationId, String status, String comment) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/v1/applications/$applicationId/status'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'status': status,
          'comment': comment,
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
}
