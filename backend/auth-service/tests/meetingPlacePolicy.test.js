const {
  detectMeetingModality,
  extractMeetingArtifacts,
  detectBilanDeCompetences,
  inferProposer,
  buildInterviewEventPayload,
} = require('../src/lib/meetingPlacePolicy');

describe('meetingPlacePolicy', () => {
  it('détecte une adresse comme présentiel', () => {
    expect(
      detectMeetingModality({ location: '12 rue de la Paix, 75002 Paris' }),
    ).toBe('presentiel');
  });

  it('détecte un numéro comme téléphone (pas présentiel)', () => {
    expect(detectMeetingModality({ location: '01 23 45 67 89' })).toBe('telephone');
  });

  it('détecte un lien Meet comme visio', () => {
    expect(
      detectMeetingModality({ videoLink: 'https://meet.google.com/abc-defg-hij' }),
    ).toBe('visio');
  });

  it('extrait invite calendar + visio depuis un corps mail', () => {
    const text = `
Bonjour, confirmez via https://calendar.google.com/calendar/event?eid=XYZ
Visio : https://teams.microsoft.com/l/meetup-join/19%3ameeting
`;
    const arts = extractMeetingArtifacts(text);
    expect(arts.primaryInviteLink).toMatch(/calendar\.google\.com/);
    expect(arts.primaryVideoLink).toMatch(/teams\.microsoft\.com/);
  });

  it('identifie un bilan de compétences et le proposant', () => {
    expect(detectBilanDeCompetences('Convocation bilan de compétences CEP')).toBe(true);
    const proposer = inferProposer({
      from: 'Marie Conseil <marie@organisme-bilan.fr>',
      subject: 'RDV bilan de compétences',
      body: 'Nous vous proposons un créneau.',
    });
    expect(proposer.isBilanDeCompetences).toBe(true);
    expect(proposer.kind).toBe('organisme_bilan');
    expect(proposer.displayName).toMatch(/Marie/);
  });

  it('construit un payload agenda riche (visio + tél = hybride)', () => {
    const payload = buildInterviewEventPayload({
      from: 'RH Acme <rh@acme.com>',
      subject: 'Entretien technique',
      body: 'Lien : https://zoom.us/j/123456\nTél : 06 12 34 56 78',
      snippet: 'Merci de confirmer',
    });
    expect(payload.modality).toBe('hybride');
    expect(payload.videoLink).toMatch(/zoom\.us/);
    expect(payload.description).toMatch(/Format/);
  });
});
