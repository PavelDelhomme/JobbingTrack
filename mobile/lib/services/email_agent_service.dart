import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:jobbingtrack_mobile/services/api_service.dart';
import 'package:jobbingtrack_mobile/services/http_correlation.dart';

class EmailAgentConsent {
  final String consentType;
  final bool granted;

  const EmailAgentConsent({required this.consentType, required this.granted});

  factory EmailAgentConsent.fromJson(Map<String, dynamic> json) {
    return EmailAgentConsent(
      consentType: json['consentType']?.toString() ?? '',
      granted: json['granted'] == true,
    );
  }
}

class EmailAgentMailbox {
  final String id;
  final String emailAddress;
  final String? displayName;
  final String provider;
  final bool syncEnabled;
  final String? lastSyncStatus;
  final DateTime? lastSyncAt;

  const EmailAgentMailbox({
    required this.id,
    required this.emailAddress,
    this.displayName,
    required this.provider,
    required this.syncEnabled,
    this.lastSyncStatus,
    this.lastSyncAt,
  });

  factory EmailAgentMailbox.fromJson(Map<String, dynamic> json) {
    return EmailAgentMailbox(
      id: json['id']?.toString() ?? '',
      emailAddress: json['emailAddress']?.toString() ?? '',
      displayName: json['displayName']?.toString(),
      provider: json['provider']?.toString() ?? '',
      syncEnabled: json['syncEnabled'] == true,
      lastSyncStatus: json['lastSyncStatus']?.toString(),
      lastSyncAt: DateTime.tryParse(json['lastSyncAt']?.toString() ?? ''),
    );
  }
}

class EmailAgentTriageMessage {
  final String id;
  final String fromAddress;
  final String subject;
  final String? snippet;
  final DateTime receivedAt;
  final String? classification;
  final String reviewStatus;
  final String? applicationId;

  const EmailAgentTriageMessage({
    required this.id,
    required this.fromAddress,
    required this.subject,
    this.snippet,
    required this.receivedAt,
    this.classification,
    required this.reviewStatus,
    this.applicationId,
  });

  factory EmailAgentTriageMessage.fromJson(Map<String, dynamic> json) {
    return EmailAgentTriageMessage(
      id: json['id']?.toString() ?? '',
      fromAddress: json['fromAddress']?.toString() ?? '',
      subject: json['subject']?.toString() ?? '(sans objet)',
      snippet: json['snippet']?.toString(),
      receivedAt: DateTime.tryParse(json['receivedAt']?.toString() ?? '') ?? DateTime.now(),
      classification: json['classification']?.toString(),
      reviewStatus: json['reviewStatus']?.toString() ?? 'PENDING',
      applicationId: json['applicationId']?.toString(),
    );
  }
}

class EmailAgentLinkSuggestion {
  final String applicationId;
  final String? companyName;
  final String position;
  final double score;

  const EmailAgentLinkSuggestion({
    required this.applicationId,
    this.companyName,
    required this.position,
    required this.score,
  });

  factory EmailAgentLinkSuggestion.fromJson(Map<String, dynamic> json) {
    return EmailAgentLinkSuggestion(
      applicationId: json['applicationId']?.toString() ?? '',
      companyName: json['companyName']?.toString(),
      position: json['position']?.toString() ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
    );
  }
}

class EmailAgentStatus {
  final bool agentEnabled;
  final bool hasRequiredConsents;
  final bool accessAllowed;
  final String accessReason;
  final List<EmailAgentConsent> consents;
  final List<EmailAgentMailbox> mailboxes;
  final int pendingTriageCount;

  const EmailAgentStatus({
    required this.agentEnabled,
    required this.hasRequiredConsents,
    required this.accessAllowed,
    required this.accessReason,
    required this.consents,
    required this.mailboxes,
    required this.pendingTriageCount,
  });

  factory EmailAgentStatus.fromJson(Map<String, dynamic> json) {
    final access = json['access'] as Map<String, dynamic>? ?? {};
    final consentsRaw = json['consents'] as List<dynamic>? ?? [];
    final mailboxesRaw = json['mailboxes'] as List<dynamic>? ?? [];
    return EmailAgentStatus(
      agentEnabled: json['agentEnabled'] == true,
      hasRequiredConsents: json['hasRequiredConsents'] == true,
      accessAllowed: access['allowed'] == true,
      accessReason: access['reason']?.toString() ?? '',
      consents: consentsRaw
          .map((e) => EmailAgentConsent.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      mailboxes: mailboxesRaw
          .map((e) => EmailAgentMailbox.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      pendingTriageCount: (json['pendingTriageCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class ImapDiscoverySuggestion {
  final String imapHost;
  final int imapPort;
  final bool imapUseTls;
  final String? provider;
  final String? source;
  final String? note;

  const ImapDiscoverySuggestion({
    required this.imapHost,
    required this.imapPort,
    required this.imapUseTls,
    this.provider,
    this.source,
    this.note,
  });

  factory ImapDiscoverySuggestion.fromJson(Map<String, dynamic> json) {
    return ImapDiscoverySuggestion(
      imapHost: json['imapHost']?.toString() ?? '',
      imapPort: (json['imapPort'] as num?)?.toInt() ?? 993,
      imapUseTls: json['imapUseTls'] != false,
      provider: json['provider']?.toString(),
      source: json['source']?.toString(),
      note: json['note']?.toString(),
    );
  }
}

class EmailAgentService {
  static const Duration _imapTimeout = Duration(seconds: 90);
  static const Duration _defaultTimeout = Duration(seconds: 30);

  static Map<String, String> _headers(String? token) =>
      HttpCorrelation.jsonHeaders(bearerToken: token);

  static Future<Map<String, dynamic>> _decode(http.Response response, String action) async {
    Map<String, dynamic> data = {};
    try {
      final parsed = jsonDecode(response.body);
      if (parsed is Map<String, dynamic>) data = parsed;
    } catch (_) {}
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }
    final msg = data['message']?.toString() ??
        data['error']?.toString() ??
        'Erreur $action (HTTP ${response.statusCode})';
    throw Exception(msg);
  }

  static Future<EmailAgentStatus> fetchStatus({required String? token}) async {
    final res = await http
        .get(
          Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/status'),
          headers: _headers(token),
        )
        .timeout(_defaultTimeout);
    final data = await _decode(res, 'statut agent');
    return EmailAgentStatus.fromJson(data);
  }

  static Future<void> updateConsents({
    required String? token,
    required List<Map<String, dynamic>> consents,
  }) async {
    final res = await http
        .put(
          Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/consents'),
          headers: _headers(token),
          body: jsonEncode({'consents': consents}),
        )
        .timeout(_defaultTimeout);
    await _decode(res, 'consentements');
  }

  static Future<ImapDiscoverySuggestion?> discoverImap({
    required String? token,
    required String emailAddress,
  }) async {
    final uri = Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/mailboxes/imap/discover')
        .replace(queryParameters: {'email': emailAddress});
    final res = await http.get(uri, headers: _headers(token)).timeout(_defaultTimeout);
    final data = await _decode(res, 'découverte IMAP');
    if (data['found'] != true) return null;
    final suggested = data['suggested'];
    if (suggested is! Map) return null;
    return ImapDiscoverySuggestion.fromJson(Map<String, dynamic>.from(suggested));
  }

  static Future<EmailAgentMailbox> connectImap({
    required String? token,
    required String emailAddress,
    required String password,
    required String imapHost,
    int imapPort = 993,
    bool imapUseTls = true,
    String? displayName,
  }) async {
    final res = await http
        .post(
          Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/mailboxes/imap'),
          headers: _headers(token),
          body: jsonEncode({
            'emailAddress': emailAddress,
            'password': password,
            'imapHost': imapHost,
            'imapPort': imapPort,
            'imapUseTls': imapUseTls,
            if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
          }),
        )
        .timeout(_imapTimeout);
    final data = await _decode(res, 'connexion IMAP');
    final mailbox = data['mailbox'];
    if (mailbox is! Map) throw Exception('Réponse boîte mail invalide');
    return EmailAgentMailbox.fromJson(Map<String, dynamic>.from(mailbox));
  }

  static Future<void> revokeMailbox({required String? token, required String mailboxId}) async {
    final res = await http
        .delete(
          Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/mailboxes/$mailboxId'),
          headers: _headers(token),
        )
        .timeout(_defaultTimeout);
    await _decode(res, 'révocation boîte');
  }

  static Future<List<Map<String, dynamic>>> syncNow({required String? token}) async {
    final res = await http
        .post(
          Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/sync'),
          headers: _headers(token),
        )
        .timeout(_imapTimeout);
    final data = await _decode(res, 'synchronisation');
    final results = data['results'];
    if (results is List) {
      return results.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  static Future<List<EmailAgentTriageMessage>> fetchTriage({
    required String? token,
    String status = 'PENDING',
  }) async {
    final uri = Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/triage')
        .replace(queryParameters: {'status': status});
    final res = await http.get(uri, headers: _headers(token)).timeout(_defaultTimeout);
    final data = await _decode(res, 'triage');
    final messages = data['messages'] as List<dynamic>? ?? [];
    return messages
        .map((e) => EmailAgentTriageMessage.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  static Future<void> reviewTriage({
    required String? token,
    required String messageId,
    required String reviewStatus,
  }) async {
    final res = await http
        .patch(
          Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/triage/$messageId'),
          headers: _headers(token),
          body: jsonEncode({'reviewStatus': reviewStatus}),
        )
        .timeout(_defaultTimeout);
    await _decode(res, 'revue triage');
  }

  static Future<List<EmailAgentLinkSuggestion>> fetchLinkSuggestions({
    required String? token,
    required String messageId,
  }) async {
    final res = await http.get(
      Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/triage/$messageId/link-suggestions'),
      headers: _headers(token),
    ).timeout(_defaultTimeout);
    final data = await _decode(res, 'suggestions liaison');
    final raw = data['suggestions'] as List<dynamic>? ?? [];
    return raw
        .map((e) => EmailAgentLinkSuggestion.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  static Future<void> linkToApplication({
    required String? token,
    required String messageId,
    required String applicationId,
  }) async {
    final res = await http.post(
      Uri.parse('${ApiService.baseUrl}/api/v1/email-agent/triage/$messageId/link'),
      headers: _headers(token),
      body: jsonEncode({'applicationId': applicationId}),
    ).timeout(_defaultTimeout);
    await _decode(res, 'liaison candidature');
  }
}

const Map<String, String> emailAgentConsentLabels = {
  'MAILBOX_ACCESS': 'Accès aux boîtes mail',
  'CONTENT_CLASSIFICATION': 'Classification automatique',
  'DIGEST_NOTIFICATIONS': 'Digest et notifications',
  'GOOGLE_CALENDAR': 'Google Calendar',
  'GOOGLE_TASKS': 'Google Tasks',
  'AI_PROCESSING': 'Traitement IA (optionnel)',
};

const List<String> emailAgentConsentOrder = [
  'MAILBOX_ACCESS',
  'CONTENT_CLASSIFICATION',
  'DIGEST_NOTIFICATIONS',
  'GOOGLE_CALENDAR',
  'GOOGLE_TASKS',
  'AI_PROCESSING',
];
