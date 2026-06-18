/// Nettoyage des payloads avant persistance disque (pas de secrets JWT / mots de passe).
class TelemetrySanitize {
  TelemetrySanitize._();

  static const _sensitiveKeys = {
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'secret',
    'apiKey',
  };

  static Map<String, dynamic> forPersistence(Map<String, dynamic> input) {
    return _scrubMap(Map<String, dynamic>.from(input));
  }

  static Map<String, dynamic>? forPersistenceOptional(Map<String, dynamic>? input) {
    if (input == null) return null;
    return forPersistence(input);
  }

  static Map<String, dynamic> _scrubMap(Map<String, dynamic> map) {
    for (final key in map.keys.toList()) {
      final lower = key.toLowerCase();
      if (_sensitiveKeys.contains(lower)) {
        map[key] = '[redacted]';
        continue;
      }
      final value = map[key];
      if (value is Map) {
        map[key] = _scrubMap(Map<String, dynamic>.from(value));
      } else if (value is List) {
        map[key] = value.map((e) {
          if (e is Map) return _scrubMap(Map<String, dynamic>.from(e));
          return e;
        }).toList();
      }
    }
    return map;
  }
}
