const { scoreApplicationMatch } = require('../src/services/emailAgentLinkService');

describe('emailAgentLinkService', () => {
  it('score élevé quand entreprise et poste apparaissent dans le mail', () => {
    const score = scoreApplicationMatch(
      {
        subject: 'Entretien Acme Corp — développeur backend',
        snippet: 'Bonjour, nous souhaitons planifier un entretien',
        fromAddress: 'recruteur@acme.com',
      },
      {
        position: 'Développeur backend',
        company: { name: 'Acme Corp' },
      },
    );
    expect(score).toBeGreaterThanOrEqual(15);
  });

  it('score nul sans correspondance', () => {
    const score = scoreApplicationMatch(
      {
        subject: 'Newsletter marketing',
        snippet: 'Promo du mois',
        fromAddress: 'news@random.io',
      },
      {
        position: 'Data engineer',
        company: { name: 'Totally Unrelated SA' },
      },
    );
    expect(score).toBe(0);
  });
});
