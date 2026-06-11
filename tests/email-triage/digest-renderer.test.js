const { describe, it, expect } = require('@jest/globals');
const {
  renderDigestHtml,
  renderDigestText,
  validateDigestRender,
} = require('./lib/digest-renderer');

const sampleSummary = {
  subject: 'Digest recherche emploi — 12 juin 2026',
  appUrl: 'https://jobbingtrack.localhost:5443',
  tomorrowTasks: [{ label: 'Relancer ACME', href: 'https://jobbingtrack.localhost:5443/applications/1' }],
  overdueTasks: [{ label: 'Préparer entretien Beta', href: 'https://jobbingtrack.localhost:5443/interviews/2' }],
  recommendedFollowups: [{ label: 'Relance Gamma', href: 'https://jobbingtrack.localhost:5443/followups/3' }],
  importantEmails: [{ label: 'Invitation entretien Delta', href: 'https://jobbingtrack.localhost:5443/emails/4' }],
};

describe('email-triage digest-renderer', () => {
  it('génère un HTML digest avec sections et liens JobbingTrack', () => {
    const html = renderDigestHtml(sampleSummary);

    expect(html).toContain('<h1>Digest recherche emploi — 12 juin 2026</h1>');
    expect(html).toContain('Tâches demain');
    expect(html).toContain('Relancer ACME');
    expect(html).toContain('https://jobbingtrack.localhost:5443/applications/1');
    expect(html).toContain('Ouvrir JobbingTrack');
  });

  it('génère une version texte lisible', () => {
    const text = renderDigestText(sampleSummary);

    expect(text).toContain('Digest recherche emploi — 12 juin 2026');
    expect(text).toContain('Tâches demain');
    expect(text).toContain('Relancer ACME');
    expect(text).toContain('Ouvrir JobbingTrack: https://jobbingtrack.localhost:5443');
  });

  it('valide un rendu digest sans fuite de secret', () => {
    const html = renderDigestHtml(sampleSummary);
    const text = renderDigestText(sampleSummary);
    const validation = validateDigestRender(html, text);

    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it('refuse un rendu contenant un mot de passe ou token', () => {
    const html = '<h1>Digest</h1><p>refresh_token=abc</p>';
    const validation = validateDigestRender(html, '');

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'possible_secret_leak' }),
      ]),
    );
  });
});
