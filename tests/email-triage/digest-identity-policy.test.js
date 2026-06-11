const { describe, it, expect } = require('@jest/globals');
const {
  DEFAULT_DIGEST_FROM,
  extractEmailAddress,
  isJobbingTrackSender,
  resolveDigestIdentity,
} = require('./lib/digest-identity-policy');

describe('email-triage digest-identity-policy', () => {
  it('extrait une adresse depuis un From formaté', () => {
    expect(extractEmailAddress('JobbingTrack <noreply@jobbingtrack.com>')).toBe(
      'noreply@jobbingtrack.com',
    );
  });

  it('impose un expéditeur visible du domaine jobbingtrack.com', () => {
    expect(isJobbingTrackSender('noreply@jobbingtrack.com')).toBe(true);
    expect(isJobbingTrackSender('pauldelhomme.pro@gmail.com')).toBe(false);
    expect(isJobbingTrackSender('JobbingTrack <noreply@maily.ovh>')).toBe(false);
  });

  it('utilise noreply@jobbingtrack.com comme identité par défaut du digest', () => {
    const identity = resolveDigestIdentity({
      EMAIL_TRIAGE_DIGEST_RECIPIENT: 'recipient@example.com',
    });

    expect(identity).toMatchObject({
      valid: true,
      from: DEFAULT_DIGEST_FROM,
      fromAddress: 'noreply@jobbingtrack.com',
      recipientAddress: 'recipient@example.com',
    });
  });

  it('refuse les destinataires placeholders suivis dans Git', () => {
    const identity = resolveDigestIdentity({
      EMAIL_TRIAGE_DIGEST_RECIPIENT: 'redacted@example.invalid',
    });

    expect(identity.valid).toBe(false);
    expect(identity.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'EMAIL_TRIAGE_DIGEST_RECIPIENT',
          reason: 'recipient_must_be_configured_outside_git',
        }),
      ]),
    );
  });

  it('refuse un expéditeur Gmail personnel pour le digest JobbingTrack', () => {
    const identity = resolveDigestIdentity({
      EMAIL_TRIAGE_DIGEST_FROM: 'pauldelhomme.pro@gmail.com',
      EMAIL_TRIAGE_DIGEST_RECIPIENT: 'recipient@example.com',
    });

    expect(identity.valid).toBe(false);
    expect(identity.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'EMAIL_TRIAGE_DIGEST_FROM',
          reason: 'sender_must_use_jobbingtrack_domain',
        }),
      ]),
    );
  });
});
