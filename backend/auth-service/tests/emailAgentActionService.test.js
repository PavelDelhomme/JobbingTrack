const {
  buildTaskTitle,
  buildCalendarProposal,
} = require('../src/services/emailAgentActionService');

describe('emailAgentActionService', () => {
  it('propose un titre de tâche pour une relance', () => {
    const title = buildTaskTitle({
      classification: 'follow_up_needed',
      subject: 'Relance candidature Foo',
    });
    expect(title).toContain('Relancer candidature');
    expect(title).toContain('Relance candidature Foo');
  });

  it('demande confirmation calendrier si horaire ambigu', () => {
    const proposal = buildCalendarProposal({
      classification: 'interview_request',
      subject: 'Entretien semaine prochaine',
      snippet: 'Disponible semaine prochaine pour un entretien',
    });
    expect(proposal.decision).toBe('confirm');
    expect(proposal.reason).toBe('ambiguous_time_text');
  });

  it('refuse calendrier pour un email non entretien', () => {
    const proposal = buildCalendarProposal({
      classification: 'rejection',
      subject: 'Refus candidature',
      snippet: '',
    });
    expect(proposal.reason).toBe('not_interview_request');
  });
});
