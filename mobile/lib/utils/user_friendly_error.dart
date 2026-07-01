/// Messages d'erreur utilisateur — jamais de stack trace / adresse IP / errno brut.
String userFriendlyError(Object? error, {bool adminContext = false}) {
  final raw = (error?.toString() ?? '').replaceAll('Exception: ', '');
  final lower = raw.toLowerCase();

  if (lower.contains('connection refused') ||
      lower.contains('socketexception') ||
      lower.contains('failed host lookup') ||
      lower.contains('network is unreachable')) {
    if (adminContext) {
      return 'Serveur injoignable. Démarrez la stack (Docker) et vérifiez adb reverse tcp:5002.';
    }
    return 'Connexion au serveur impossible. Réessayez plus tard.';
  }
  if (lower.contains('timeout') || lower.contains('timed out')) {
    return 'Délai dépassé. Réessayez.';
  }
  if (lower.contains('401') || lower.contains('403') || lower.contains('non autoris')) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (lower.contains('503') || lower.contains('indisponible')) {
    return adminContext ? 'Service temporairement indisponible.' : 'Service indisponible. Réessayez plus tard.';
  }

  return adminContext ? 'Données indisponibles pour le moment.' : 'Une erreur est survenue. Réessayez.';
}
