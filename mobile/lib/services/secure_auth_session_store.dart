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

  static const _legacyToken = 'auth_token';
  static const _legacyUserJson = 'auth_user_json';

  static Future<void> saveSession({
    required String token,
    required String userJson,
    String? refreshToken,
  }) async {
    await _storage.write(key: _keyToken, value: token);
    await _storage.write(key: _keyUserJson, value: userJson);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
    }
  }

  static Future<({String token, String userJson, String? refreshToken})?> loadSession() async {
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
    return (token: token, userJson: userJson, refreshToken: refreshToken);
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
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_legacyToken);
    await prefs.remove(_legacyUserJson);
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
