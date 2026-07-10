import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Session JWT + profil chiffrés OS (Keychain / EncryptedSharedPreferences).
class SecureAuthSessionStore {
  SecureAuthSessionStore._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

  static const _keyToken = 'jt_auth_access_token';
  static const _keyUserJson = 'jt_auth_user_json';
  static const _keyRefreshToken = 'jt_auth_refresh_token';
  static const _keyImpersonatorToken = 'jt_auth_impersonator_token';
  static const _keyImpersonatorUserJson = 'jt_auth_impersonator_user_json';
  static const _keyImpersonatorRefreshToken = 'jt_auth_impersonator_refresh_token';
  static const _keyImpersonationReturnRoute = 'jt_auth_impersonation_return_route';

  static const _legacyToken = 'auth_token';
  static const _legacyUserJson = 'auth_user_json';

  static Future<void> saveSession({
    required String token,
    required String userJson,
    String? refreshToken,
    String? impersonatorToken,
    String? impersonatorUserJson,
    String? impersonatorRefreshToken,
    String? impersonationReturnRoute,
  }) async {
    await _storage.write(key: _keyToken, value: token);
    await _storage.write(key: _keyUserJson, value: userJson);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
    } else {
      await _storage.delete(key: _keyRefreshToken);
    }
    if (impersonatorToken != null &&
        impersonatorToken.isNotEmpty &&
        impersonatorUserJson != null &&
        impersonatorUserJson.isNotEmpty) {
      await _storage.write(key: _keyImpersonatorToken, value: impersonatorToken);
      await _storage.write(key: _keyImpersonatorUserJson, value: impersonatorUserJson);
      if (impersonatorRefreshToken != null && impersonatorRefreshToken.isNotEmpty) {
        await _storage.write(key: _keyImpersonatorRefreshToken, value: impersonatorRefreshToken);
      } else {
        await _storage.delete(key: _keyImpersonatorRefreshToken);
      }
      if (impersonationReturnRoute != null && impersonationReturnRoute.isNotEmpty) {
        await _storage.write(key: _keyImpersonationReturnRoute, value: impersonationReturnRoute);
      } else {
        await _storage.delete(key: _keyImpersonationReturnRoute);
      }
    } else {
      await _clearImpersonationKeys();
    }
  }

  static Future<
      ({
        String token,
        String userJson,
        String? refreshToken,
        String? impersonatorToken,
        String? impersonatorUserJson,
        String? impersonatorRefreshToken,
        String? impersonationReturnRoute,
      })?> loadSession() async {
    await _migrateLegacyIfNeeded();
    final token = await _storage.read(key: _keyToken);
    final userJson = await _storage.read(key: _keyUserJson);
    if (token == null ||
        token.isEmpty ||
        userJson == null ||
        userJson.isEmpty) {
      return null;
    }
    final refreshToken = await _storage.read(key: _keyRefreshToken);
    final impersonatorToken = await _storage.read(key: _keyImpersonatorToken);
    final impersonatorUserJson = await _storage.read(key: _keyImpersonatorUserJson);
    final impersonatorRefreshToken = await _storage.read(key: _keyImpersonatorRefreshToken);
    final impersonationReturnRoute = await _storage.read(key: _keyImpersonationReturnRoute);
    return (
      token: token,
      userJson: userJson,
      refreshToken: refreshToken,
      impersonatorToken: impersonatorToken,
      impersonatorUserJson: impersonatorUserJson,
      impersonatorRefreshToken: impersonatorRefreshToken,
      impersonationReturnRoute: impersonationReturnRoute,
    );
  }

  static Future<String?> loadRefreshToken() async {
    await _migrateLegacyIfNeeded();
    return _storage.read(key: _keyRefreshToken);
  }

  static Future<void> saveRefreshToken(String refreshToken) async {
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  static Future<void> clearSession() async {
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keyUserJson);
    await _storage.delete(key: _keyRefreshToken);
    await _clearImpersonationKeys();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyToken);
    await prefs.remove(_legacyUserJson);
  }

  static Future<void> _clearImpersonationKeys() async {
    await _storage.delete(key: _keyImpersonatorToken);
    await _storage.delete(key: _keyImpersonatorUserJson);
    await _storage.delete(key: _keyImpersonatorRefreshToken);
    await _storage.delete(key: _keyImpersonationReturnRoute);
  }

  static Future<void> _migrateLegacyIfNeeded() async {
    final prefs = await SharedPreferences.getInstance();
    final legacyToken = prefs.getString(_legacyToken);
    final legacyUser = prefs.getString(_legacyUserJson);
    if (legacyToken == null || legacyUser == null) return;
    try {
      await _storage.write(key: _keyToken, value: legacyToken);
      await _storage.write(key: _keyUserJson, value: legacyUser);
      await prefs.remove(_legacyToken);
      await prefs.remove(_legacyUserJson);
      debugPrint('[SecureAuth] Migration session SharedPreferences → secure storage OK');
    } catch (e) {
      debugPrint('[SecureAuth] Migration session: $e');
    }
  }
}
