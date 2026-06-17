import 'package:flutter/foundation.dart';
import 'package:local_auth/local_auth.dart';

/// Déverrouillage biométrique (empreinte / Face ID).
///
/// **MVP actuel** : barrière UI avant d'ouvrir une session JWT déjà en SharedPreferences.
/// **Backlog D6** : stockage chiffré email/mot de passe (Keystore/Keychain) après login réussi —
/// voir `docs/mobile/BIOMETRIC_SECURE_CREDENTIALS.md`.
class BiometricAuthService {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> isDeviceSupported() async {
    try {
      return await _auth.isDeviceSupported();
    } catch (e) {
      debugPrint('[BIO] isDeviceSupported: $e');
      return false;
    }
  }

  static Future<bool> canCheckBiometrics() async {
    try {
      return await _auth.canCheckBiometrics;
    } catch (e) {
      debugPrint('[BIO] canCheckBiometrics: $e');
      return false;
    }
  }

  static Future<bool> isAvailable() async {
    if (!await isDeviceSupported()) return false;
    return canCheckBiometrics();
  }

  static Future<bool> authenticate({String reason = 'Déverrouillez JobbingTrack'}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        biometricOnly: false,
        persistAcrossBackgrounding: true,
      );
    } catch (e) {
      debugPrint('[BIO] authenticate failed: $e');
      return false;
    }
  }
}
