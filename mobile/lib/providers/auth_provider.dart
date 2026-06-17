import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/utils/admin_access.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;
  bool _handlingSessionRevoke = false;
  bool _sessionRestored = false;

  AuthProvider() {
    _wireSecurityCallbacks();
  }

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get sessionRestored => _sessionRestored;

  /// Restaure la session depuis le stockage local (splash / cold start).
  Future<bool> restoreSession() async {
    if (_sessionRestored) return isAuthenticated;
    _sessionRestored = true;
    final keepLoggedIn = await ApiConfigStore.loadKeepLoggedIn();
    if (!keepLoggedIn) return false;
    final stored = await ApiConfigStore.loadAuthSession();
    if (stored == null) return false;
    try {
      final userMap = jsonDecode(stored.userJson) as Map<String, dynamic>;
      _token = stored.token;
      _user = User.fromJson(userMap);
      CrashReporter.setToken(_token);
      await _refreshProfileFromServer();
      notifyListeners();
      return isAuthenticated;
    } catch (e) {
      debugPrint('[AUTH] restoreSession invalid: $e');
      await ApiConfigStore.clearAuthSession();
      _token = null;
      _user = null;
      return false;
    }
  }

  /// Rafraîchit le profil (rôle, email) depuis l'API pour éviter un JWT obsolète côté UI admin.
  Future<void> _refreshProfileFromServer() async {
    if (_token == null) return;
    try {
      final profile = await ApiService.getProfile(token: _token);
      if (profile != null) {
        _user = profile;
        await _persistSession();
      }
    } catch (e) {
      debugPrint('[AUTH] refreshProfile: $e');
    }
  }

  /// Vide la session en mémoire sans effacer les préférences utilisateur (ex. après échec biométrie).
  Future<void> clearLocalSession() async {
    _user = null;
    _token = null;
    CrashReporter.setToken(null);
    notifyListeners();
  }

  Future<void> _persistSession() async {
    if (_token == null || _user == null) return;
    await ApiConfigStore.saveAuthSession(
      token: _token!,
      userJson: jsonEncode(_user!.toJson()),
    );
  }

  Future<void> login(
    String email,
    String password, {
    bool keepLoggedIn = true,
    bool enableBiometric = false,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.login(email, password);

      if (response['success'] == true) {
        _token = response['token'];
        _user = User.fromJson(response['user']);
        CrashReporter.setToken(_token);
        await ApiConfigStore.saveKeepLoggedIn(keepLoggedIn);
        if (keepLoggedIn) {
          await _persistSession();
          await ApiConfigStore.saveBiometricUnlockEnabled(enableBiometric);
        } else {
          await ApiConfigStore.clearAuthSession();
          await ApiConfigStore.saveBiometricUnlockEnabled(false);
        }
        CrashReporter.trackAction('login:${_user?.email ?? "unknown"}');
        CrashReporter.flushPendingReports();
        _isLoading = false;
        notifyListeners();
      } else {
        throw Exception(response['message'] ?? 'Erreur de connexion');
      }
    } catch (e) {
      final deviceId = await ApiConfigStore.getOrCreateDeviceId();
      ApiService.postSecurityEvent(
        eventType: 'auth_failure',
        message: e.toString(),
        deviceId: deviceId,
      );
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
    final deviceId = await ApiConfigStore.getOrCreateDeviceId();
    final userId = _user?.id;
    final token = _token;
    ApiService.postSecurityEvent(
      eventType: 'mobile_logout',
      message: 'Déconnexion utilisateur mobile',
      deviceId: deviceId,
      userId: userId,
      token: token,
    );
    CrashReporter.trackAction('logout');
    CrashReporter.setToken(null);
    await ApiConfigStore.clearAuthSession();
    await ApiConfigStore.saveBiometricUnlockEnabled(false);
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
      final deviceId = await ApiConfigStore.getOrCreateDeviceId();
      ApiService.postSecurityEvent(
        eventType: 'otp_failed',
        message: 'Échec vérification email/token: ${e.toString()}',
        deviceId: deviceId,
      );
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  void _wireSecurityCallbacks() {
    ApiService.onSessionRevoked = (path, statusCode) async {
      if (_handlingSessionRevoke || _token == null) return;
      _handlingSessionRevoke = true;
      try {
        final deviceId = await ApiConfigStore.getOrCreateDeviceId();
        await ApiService.postSecurityEvent(
          eventType: 'session_revoked',
          message: 'Session invalidée (HTTP $statusCode) sur $path',
          deviceId: deviceId,
          userId: _user?.id,
          token: _token,
        );
        CrashReporter.setToken(null);
        await ApiConfigStore.clearAuthSession();
        _user = null;
        _token = null;
        notifyListeners();
      } finally {
        _handlingSessionRevoke = false;
      }
    };
  }

  bool get isAuthenticated => _token != null && _user != null;

  bool get isAdmin => AdminAccess.canAccessAdmin(_user);
}
