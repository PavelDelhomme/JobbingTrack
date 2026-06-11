const { describe, it, expect } = require('@jest/globals');
const { classifyEmail, normalizeText } = require('./lib/classification-rules');

describe('email-triage classification-rules', () => {
  it('normalise le texte pour matcher les accents', () => {
    expect(normalizeText('Disponibilités pour un entretien')).toBe(
      'disponibilites pour un entretien',
    );
  });

  it('classe un refus sans entretien en candidature rejetée', () => {
    expect(
      classifyEmail({
        subject: 'Suite à votre candidature',
        body: 'Malheureusement votre candidature n’a pas été retenue.',
      }),
    ).toMatchObject({
      classification: 'application_rejected',
      confidence: 'high',
      suggestedStatus: 'REJECTED_WITHOUT_INTERVIEW',
    });
  });

  it('classe un refus après entretien avec le statut adapté', () => {
    expect(
      classifyEmail({
        subject: 'Retour entretien',
        body: 'Nous ne pouvons pas donner suite.',
        hadInterview: true,
      }),
    ).toMatchObject({
      classification: 'application_rejected',
      suggestedStatus: 'REJECTED_AFTER_INTERVIEW',
    });
  });

  it('classe une invitation entretien en préparation + événement proposé', () => {
    expect(
      classifyEmail({
        subject: 'Disponibilités pour un premier échange',
        body: 'Pouvez-vous nous transmettre vos disponibilités pour un entretien en visio ?',
      }),
    ).toMatchObject({
      classification: 'interview_request',
      suggestedStatus: 'FIRST_INTERVIEW_PENDING',
      proposedActions: ['create_task_prepare_interview', 'propose_calendar_event'],
    });
  });

  it('classe un deuxième entretien avec le statut autre entretien', () => {
    expect(
      classifyEmail({
        subject: 'Rendez-vous technique',
        body: 'Nous souhaitons planifier un nouvel entretien.',
        hadInterview: true,
      }),
    ).toMatchObject({
      classification: 'interview_request',
      suggestedStatus: 'OTHER_INTERVIEW_PENDING',
    });
  });

  it('classe un test technique', () => {
    expect(
      classifyEmail({
        subject: 'Test technique à réaliser',
        body: 'Voici le cas pratique à compléter.',
      }),
    ).toMatchObject({
      classification: 'technical_test',
      suggestedStatus: 'TECHNICAL_TEST_PENDING',
    });
  });

  it('classe un salon emploi comme événement à confirmer', () => {
    expect(
      classifyEmail({
        subject: 'Forum emploi Rennes',
        body: 'Inscription au salon emploi de la semaine prochaine.',
      }),
    ).toMatchObject({
      classification: 'job_event',
      proposedActions: ['create_event_to_confirm', 'add_digest_event'],
    });
  });

  it('propose une relance pour une candidature sans réponse depuis 7 jours', () => {
    expect(
      classifyEmail({
        subject: 'Candidature développeur',
        daysSinceApplication: 8,
        hasRecentResponse: false,
        followUpCount: 0,
      }),
    ).toMatchObject({
      classification: 'follow_up_needed',
      suggestedStatus: 'NO_RESPONSE',
    });
  });

  it('évite de prioriser les newsletters dans le digest', () => {
    expect(
      classifyEmail({
        subject: 'Newsletter offres recommandées',
        body: 'Cliquez ici pour vous désabonner.',
        daysSinceApplication: 20,
      }),
    ).toMatchObject({
      classification: 'noise_newsletter',
      proposedActions: ['keep_out_of_priority_digest'],
    });
  });

  it('garde les emails ambigus en revue manuelle', () => {
    expect(
      classifyEmail({
        subject: 'Information',
        body: 'Bonjour, merci pour votre message.',
      }),
    ).toMatchObject({
      classification: 'needs_manual_review',
      confidence: 'low',
    });
  });
});
