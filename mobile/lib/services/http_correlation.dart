/// En-têtes HTTP partagés (corrélation gateway / logs).
class HttpCorrelation {
  HttpCorrelation._();

  static String newRequestId() =>
      'mob-${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond}';

  static Map<String, String> jsonHeaders({String? bearerToken}) {
    final requestId = newRequestId();
    return {
      'Content-Type': 'application/json',
      if (bearerToken != null && bearerToken.isNotEmpty) 'Authorization': 'Bearer $bearerToken',
      'X-Request-Id': requestId,
      'X-Correlation-Id': requestId,
    };
  }
}
