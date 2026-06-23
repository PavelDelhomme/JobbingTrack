const { classifyForDigest } = require('../src/services/emailAgentDigestService');
const { renderDigestHtml, renderDigestText, countDigestItems } = require('../src/lib/digestRenderer');
const { resolveDigestFrom } = require('../src/lib/digestIdentity');

describe('emailAgentDigestService', () => {
  it('classe une relance dans recommendedFollowups', () => {
    expect(
      classifyForDigest({
        classification: 'follow_up_needed',
        reviewStatus: 'PENDING',
        proposedActions: ['create_follow_up_task'],
      }),
    ).toBe('recommendedFollowups');
  });

  it('classe un entretien dans interviewsToPrepare', () => {
    expect(
      classifyForDigest({
        classification: 'interview_request',
        reviewStatus: 'PENDING',
        proposedActions: ['propose_calendar_event'],
      }),
    ).toBe('interviewsToPrepare');
  });

  it('classe un message pending non classé dans needsConfirmation', () => {
    expect(
      classifyForDigest({
        classification: 'manual_review',
        reviewStatus: 'PENDING',
        proposedActions: ['manual_review'],
      }),
    ).toBe('needsConfirmation');
  });

  it('génère un digest HTML avec sections et lien /agent', () => {
    const html = renderDigestHtml({
      subject: 'Digest recherche emploi JobbingTrack — 23/06/2026',
      importantEmails: [{ label: 'Offre — recruteur@test.fr', href: 'https://jobbingtrack.localhost:5443/agent' }],
    });
    expect(html).toContain('<h1>');
    expect(html).toContain('/agent');
    expect(html).toContain('Offre');
  });

  it('compte les éléments du digest', () => {
    expect(
      countDigestItems({
        importantEmails: [{ label: 'a' }],
        recommendedFollowups: [{ label: 'b' }, { label: 'c' }],
      }),
    ).toBe(3);
  });

  it('refuse un expéditeur digest hors domaine JobbingTrack', () => {
    const identity = resolveDigestFrom({
      SMTP_FROM: 'personal@gmail.com',
      EMAIL_TRIAGE_DIGEST_FROM: '',
    });
    expect(identity.valid).toBe(false);
  });
});
