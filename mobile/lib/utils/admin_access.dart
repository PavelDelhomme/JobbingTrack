import 'package:jobbingtrack_mobile/models/user.dart';

/// Contrôle d'accès administration mobile (UI + routes).
/// La sécurité réelle repose sur le rôle JWT côté API ; ce filtre client
/// masque l'interface et bloque la navigation pour les comptes non autorisés.
class AdminAccess {
  /// Liste optionnelle d'emails admin (dart-define MOBILE_ADMIN_EMAILS, séparés par virgule).
  /// Vide = tout compte ADMIN / SUPER_ADMIN du backend.
  static const String _allowedEmailsEnv = String.fromEnvironment(
    'MOBILE_ADMIN_EMAILS',
    defaultValue: '',
  );

  static List<String> get _allowedEmails {
    if (_allowedEmailsEnv.trim().isEmpty) return const [];
    return _allowedEmailsEnv
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .where((e) => e.isNotEmpty)
        .toList();
  }

  static bool isAdminRole(String? role) =>
      role == 'ADMIN' || role == 'SUPER_ADMIN';

  static bool canAccessAdmin(User? user) {
    if (user == null) return false;
    if (!isAdminRole(user.role)) return false;
    final allowlist = _allowedEmails;
    if (allowlist.isEmpty) return true;
    return allowlist.contains(user.email.trim().toLowerCase());
  }
}
