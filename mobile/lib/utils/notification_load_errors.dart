/// Messages utilisateur pour le centre de notifications in-app.
String friendlyNotificationLoadError(Object error, {required String apiBaseUrl}) {
  final raw = error.toString().replaceAll('Exception: ', '');
  final lower = raw.toLowerCase();

  if (lower.contains('401') || lower.contains('403') || lower.contains('non autoris')) {
    return 'Session expirée — fermez la cloche, reconnectez-vous ou tirez pour actualiser après déverrouillage.';
  }
  if (lower.contains('timeout') || lower.contains('socket') || lower.contains('réseau') || lower.contains('failed host')) {
    return 'Connexion API impossible ($apiBaseUrl). '
        'Sur Samsung en USB : réinstallez depuis le backoffice (adb reverse) '
        'ou Paramètres → vérifiez l’URL API / IP LAN du PC.';
  }
  if (lower.contains('handshake') || lower.contains('certificate')) {
    return 'Certificat HTTPS refusé — utilisez http://IP_LAN:5002 ou adb reverse en dev.';
  }
  return raw;
}
