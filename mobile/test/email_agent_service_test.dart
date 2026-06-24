import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/services/email_agent_service.dart';

void main() {
  test('EmailAgentStatus.fromJson parse minimal', () {
    final status = EmailAgentStatus.fromJson({
      'agentEnabled': true,
      'hasRequiredConsents': true,
      'access': {'allowed': true, 'reason': 'ok'},
      'consents': [
        {'consentType': 'MAILBOX_ACCESS', 'granted': true},
      ],
      'mailboxes': [
        {
          'id': 'mb-1',
          'emailAddress': 'candidatures@delhomme.ovh',
          'provider': 'IMAP_GENERIC',
          'syncEnabled': true,
        },
      ],
      'pendingTriageCount': 3,
    });
    expect(status.agentEnabled, isTrue);
    expect(status.mailboxes.length, 1);
    expect(status.pendingTriageCount, 3);
  });

  test('ImapDiscoverySuggestion.fromJson', () {
    final s = ImapDiscoverySuggestion.fromJson({
      'imapHost': 'imap.mail.ovh.net',
      'imapPort': 993,
      'imapUseTls': true,
      'provider': 'OVH',
    });
    expect(s.imapHost, 'imap.mail.ovh.net');
    expect(s.imapPort, 993);
  });
}
