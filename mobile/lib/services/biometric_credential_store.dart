import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage chiffré email/mot de passe pour reconnexion après biométrie (D6).
class BiometricCredentialStore {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );

  static const _keyEmail = 'jt_bio_login_email';
  static const _keyPassword = 'jt_bio_login_password';

  static Future<void> save({
    required String email,
    required String password,
  }) async {
    await _storage.write(key: _keyEmail, value: email.trim());
    await _storage.write(key: _keyPassword, value: password);
  }

  static Future<({String email, String password})?> load() async {
    final email = await _storage.read(key: _keyEmail);
    final password = await _storage.read(key: _keyPassword);
    if (email == null || password == null || email.isEmpty || password.isEmpty) {
      return null;
    }
    return (email: email, password: password);
  }

  static Future<bool> hasCredentials() async {
    final creds = await load();
    return creds != null;
  }

  static Future<void> clear() async {
    await _storage.delete(key: _keyEmail);
    await _storage.delete(key: _keyPassword);
  }
}
