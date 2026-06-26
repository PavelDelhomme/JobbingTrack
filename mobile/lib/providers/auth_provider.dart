import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:jobbingtrack_mobile/services/api_config_store.dart';
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/biometric_credential_store.dart';
import 'package:jobbingtrack_mobile/services/crash_reporter.dart';
import 'package:jobbingtrack_mobile/services/mobile_analytics_service.dart';
import 'package:jobbingtrack_mobile/services/push_notification_service.dart';
import 'package:jobbingtrack_mobile/services/user_session_cleanup.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/utils/admin_access.dart';

class AuthProvider with ChangeNotifier {
  User? _user;
  String? _token;
  String? _refreshToken;
  bool _isLoading = false;
  bool _handlingSessionRevoke = false;
  bool _sessionRestored = false;
  bool _restoringSession = false;
  bool _tokenStale = false;

  AuthProvider() {
    _wireSecurityCallbacks();
  }

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get sessionRestored => _sessionRestored;
  bool get tokenStale => _tokenStale;

  /// Restaure la session depuis le stockage chiffré (splash / cold start).
  /// Mode offline-first : pas de déconnexion si le réseau est absent.
  Future<bool> restoreSession() async {
    if (_sessionRestored) return isAuthenticated;
    _sessionRestored = true;
    final keepLoggedIn = await ApiConfigStore.loadKeepLoggedIn();
    if (!keepLoggedIn) return false;
    final stored = await ApiConfigStore.loadAuthSession();
    if (stored == null) return false;

    _restoringSession = true;
    try {
      final userMap = jsonDecode(stored.userJson) as Map<String, dynamic>;
      _token = stored.token;
      _refreshToken = stored.refreshToken;
      _user = User.fromJson(userMap);
      _tokenStale = false;
      CrashReporter.setToken(_token);
      await ApiConfigStore.ensureAnalyticsConsentEnabled();
      MobileAnalyticsService.instance.updateAuthToken(_token);
      notifyListeners();

      if (await ApiService.isReachable()) {
        final refreshed = await trySilentTokenRefresh();
        if (refreshed) {
          unawaited(_refreshProfileFromServer());
        } else {
          unawaited(_refreshProfileFromServer());
        }
      }
      return isAuthenticated;
    } catch (e) {
      debugPrint('[AUTH] restoreSession invalid: $e');
      await ApiConfigStore.clearAuthSession();
      _token = null;
      _user = null;
      _refreshToken = null;
      return false;
    } finally {
      _restoringSession = false;
    }
  }

  /// Rafraîchit silencieusement le JWT (refresh token chiffré ou reconnexion biométrique).
  Future<bool> trySilentTokenRefresh() async {
    if (_user == null) return false;

    final storedRefresh = _refreshToken ?? await ApiConfigStore.loadRefreshToken();
    if (storedRefresh != null && storedRefresh.isNotEmpty) {
      final result = await ApiService.refreshAccessToken(storedRefresh);
      if (result != null) {
        _token = result.token;
        _refreshToken = result.refreshToken ?? storedRefresh;
        _tokenStale = false;
        CrashReporter.setToken(_token);
        await _persistSession();
        MobileAnalyticsService.instance.updateAuthToken(_token);
        notifyListeners();
        debugPrint('[AUTH] JWT renouvelé via refresh token');
        return true;
      }
    }

    final creds = await BiometricCredentialStore.load();
    if (creds != null) {
      try {
        final response = await ApiService.login(creds.email, creds.password);
        if (response['success'] == true) {
          _token = response['token'] as String?;
          _refreshToken = response['refreshToken'] as String?;
          _user = User.fromJson(response['user']);
          _tokenStale = false;
          CrashReporter.setToken(_token);
          await _persistSession();
          MobileAnalyticsService.instance.updateAuthToken(_token);
          notifyListeners();
          debugPrint('[AUTH] JWT renouvelé via identifiants sécurisés');
          return true;
        }
      } catch (e) {
        debugPrint('[AUTH] trySilentTokenRefresh login: $e');
      }
    }
    return false;
  }

  /// Au retour réseau : renouvelle le JWT de façon sécurisée (sans déconnexion).
  Future<void> refreshSessionIfOnline() async {
    if (_token == null || _user == null) return;
    if (!await ApiService.isReachable()) return;
    await trySilentTokenRefresh();
  }

  Future<void> _refreshProfileFromServer() async {
    if (_token == null) return;
    try {
      final profile = await ApiService.getProfile(token: _token);
      if (profile != null) {
        _user = profile;
        _tokenStale = false;
        await _persistSession();
        notifyListeners();
      } else if (await ApiService.isReachable()) {
        _tokenStale = true;
      }
    } catch (e) {
      debugPrint('[AUTH] refreshProfile: $e');
    }
  }

  Future<void> clearLocalSession() async {
    _user = null;
    _token = null;
    _refreshToken = null;
    _tokenStale = false;
    CrashReporter.setToken(null);
    MobileAnalyticsService.instance.updateAuthToken(null);
    notifyListeners();
  }

  Future<void> _persistSession() async {
    if (_token == null || _user == null) return;
    await ApiConfigStore.saveAuthSession(
      token: _token!,
      userJson: jsonEncode(_user!.toJson()),
      refreshToken: _refreshToken,
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
      if (kDebugMode && await ApiConfigStore.loadTestAutomationSkipBiometric()) {
        enableBiometric = false;
      }
      final response = await ApiService.login(email, password);

      if (response['success'] == true) {
        _token = response['token'];
        _refreshToken = response['refreshToken'] as String?;
        _user = User.fromJson(response['user']);
        _tokenStale = false;
        CrashReporter.setToken(_token);
        await ApiConfigStore.ensureAnalyticsConsentEnabled();
        await MobileAnalyticsService.instance.initialize(authToken: _token);
        await MobileAnalyticsService.instance.updateAuthToken(_token);
        await ApiConfigStore.saveKeepLoggedIn(keepLoggedIn);
        if (keepLoggedIn && enableBiometric) {
          await _persistSession();
          await BiometricCredentialStore.save(email: email, password: password);
          await ApiConfigStore.saveBiometricUnlockEnabled(true);
        } else if (keepLoggedIn) {
          await _persistSession();
          if (!enableBiometric) {
            await BiometricCredentialStore.clear();
            await ApiConfigStore.saveBiometricUnlockEnabled(false);
          }
        } else {
          await ApiConfigStore.clearAuthSession();
          // Pas de session persistante — identifiants empreinte conservés pour reconnexion rapide.
        }
        CrashReporter.trackAction('login:${_user?.email ?? "unknown"}');
        CrashReporter.flushPendingReports();
        unawaited(PushNotificationService.instance.registerAfterLogin(authToken: _token));
        _isLoading = false;
        notifyListeners();
      } else {
        throw Exception(response['message'] ?? 'Erreur de connexion');
      }
    } catch (e) {
      final deviceId = await ApiConfigStore.getOrCreateDeviceId();
      final errText = e.toString();
      ApiService.postSecurityEvent(
        eventType: 'auth_failure',
        message: errText,
        deviceId: deviceId,
      );
      final isNetwork =
          errText.contains('joindre') ||
          errText.contains('SocketException') ||
          errText.contains('Connection refused') ||
          errText.contains('Failed host lookup') ||
          ApiService.lastRequestWasNetworkFailure;
      if (isNetwork) {
        CrashReporter.reportManualError(
          message: 'Connexion mobile impossible — $errText (API: ${ApiService.baseUrl})',
          screenName: 'login',
          metadata: {
            'category': 'auth_network',
            'deviceId': deviceId,
          },
        );
      }
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

  Future<bool> ensureSessionAfterBiometric() async {
    if (_token != null && _user != null) {
      if (await ApiService.isReachable()) {
        final refreshed = await trySilentTokenRefresh();
        if (refreshed || !_tokenStale) return true;
      } else {
        return true;
      }
    }
    final creds = await BiometricCredentialStore.load();
    if (creds == null) return false;
    try {
      final response = await ApiService.login(creds.email, creds.password);
      if (response['success'] == true) {
        _token = response['token'];
        _refreshToken = response['refreshToken'] as String?;
        _user = User.fromJson(response['user']);
        _tokenStale = false;
        CrashReporter.setToken(_token);
        MobileAnalyticsService.instance.updateAuthToken(_token);
        await _persistSession();
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('[AUTH] ensureSessionAfterBiometric: $e');
    }
    return false;
  }

  Future<void> saveBiometricCredentials(String password) async {
    if (_user == null || password.isEmpty) {
      throw Exception('Mot de passe requis');
    }
    await BiometricCredentialStore.save(email: _user!.email, password: password);
    await ApiConfigStore.saveBiometricUnlockEnabled(true);
    await ApiConfigStore.saveKeepLoggedIn(true);
  }

  /// Vérifie le mot de passe courant puis met à jour la session (tokens frais).
  Future<void> verifyPasswordForBiometric(String password) async {
    if (_user == null) throw Exception('Non connecté');
    final trimmed = password.trim();
    if (trimmed.isEmpty) throw Exception('Mot de passe requis');

    final response = await ApiService.login(_user!.email, trimmed);
    if (response['success'] != true) {
      throw Exception(response['message'] ?? 'Mot de passe incorrect');
    }
    _token = response['token'];
    _refreshToken = response['refreshToken'] as String?;
    _user = User.fromJson(response['user']);
    _tokenStale = false;
    CrashReporter.setToken(_token);
    await MobileAnalyticsService.instance.updateAuthToken(_token);
    await _persistSession();
    await BiometricCredentialStore.save(email: _user!.email, password: trimmed);
    notifyListeners();
  }

  Future<void> disableBiometricUnlock() async {
    await BiometricCredentialStore.clear();
    await ApiConfigStore.saveBiometricUnlockEnabled(false);
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
    await UserSessionCleanup.onLogout(authToken: token);
    _user = null;
    _token = null;
    _refreshToken = null;
    _tokenStale = false;
    _sessionRestored = false;
    CrashReporter.setToken(null);
    MobileAnalyticsService.instance.updateAuthToken(null);
    notifyListeners();
  }

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

  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
    String? email,
  }) async {
    if (_user == null || _token == null) {
      throw Exception('Non connecté');
    }
    _isLoading = true;
    notifyListeners();
    try {
      final updated = await ApiService.updateUserProfile(
        userId: _user!.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        token: _token,
      );
      _user = updated;
      await _persistSession();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Demande un lien de réinitialisation de mot de passe pour le compte connecté.
  Future<void> requestPasswordResetForCurrentUser() async {
    if (_user == null) throw Exception('Non connecté');
    await forgotPassword(_user!.email);
  }

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
      await handleUnauthorized(path, statusCode);
    };
  }

  /// 401/403 : refresh silencieux si online ; sinon conserver la session locale (offline-first).
  Future<void> handleUnauthorized(String path, int statusCode) async {
    if (_handlingSessionRevoke || _restoringSession || _token == null) return;
    if (ApiService.lastRequestWasNetworkFailure) return;

    _handlingSessionRevoke = true;
    try {
      if (!await ApiService.isReachable()) {
        debugPrint('[AUTH] 401 ignoré (hors ligne) — session conservée');
        return;
      }
      final refreshed = await trySilentTokenRefresh();
      if (refreshed) return;

      _tokenStale = true;
      debugPrint('[AUTH] Token expiré (HTTP $statusCode sur $path) — session locale conservée');
    } finally {
      _handlingSessionRevoke = false;
    }
  }

  bool get isAuthenticated => _token != null && _user != null;

  bool get isAdmin => AdminAccess.canAccessAdmin(_user);
}
