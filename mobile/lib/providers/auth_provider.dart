import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.login(email, password);

      if (response['success'] == true) {
        _token = response['token'];
        _user = User.fromJson(response['user']);
        CrashReporter.setToken(_token);
        CrashReporter.trackAction('login:${_user?.email ?? "unknown"}');
        CrashReporter.flushPendingReports();
        _isLoading = false;
        notifyListeners();
      } else {
        throw Exception(response['message'] ?? 'Erreur de connexion');
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      );

      if (response['success'] == true) {
        // On ne connecte pas automatiquement, l'utilisateur doit vérifier son email
        _isLoading = false;
        notifyListeners();
      } else {
        throw Exception(response['message'] ?? 'Erreur d\'inscription');
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    CrashReporter.trackAction('logout');
    CrashReporter.setToken(null);
    _user = null;
    _token = null;
    notifyListeners();
  }

  /// Demande d'envoi d'un email de réinitialisation du mot de passe.
  Future<void> forgotPassword(String email) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.forgotPassword(email);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Réinitialise le mot de passe avec le token reçu par email.
  Future<void> resetPassword(String token, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.resetPassword(token, password);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Vérifie l'email avec le token reçu par email (lien de vérification).
  Future<void> verifyEmail(String token) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.verifyEmail(token);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  bool get isAuthenticated => _token != null && _user != null;
}
