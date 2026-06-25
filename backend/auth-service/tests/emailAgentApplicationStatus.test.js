const { resolveStatusCode, STATUS_CODE_ALIASES } = require('../src/services/emailAgentApplicationStatusService');

describe('emailAgentApplicationStatusService', () => {
  it('mappe FOLLOW_UP_PENDING vers RELANCED_PENDING', () => {
    expect(resolveStatusCode('FOLLOW_UP_PENDING')).toBe('RELANCED_PENDING');
  });

  it('conserve les codes entretien/refus', () => {
    expect(resolveStatusCode('FIRST_INTERVIEW_PENDING')).toBe('FIRST_INTERVIEW_PENDING');
    expect(resolveStatusCode('REJECTED_WITHOUT_INTERVIEW')).toBe('REJECTED_WITHOUT_INTERVIEW');
  });

  it('retourne null si absent', () => {
    expect(resolveStatusCode(null)).toBeNull();
    expect(resolveStatusCode('')).toBeNull();
  });

  it('expose les alias documentés', () => {
    expect(STATUS_CODE_ALIASES.FOLLOW_UP_PENDING).toBe('RELANCED_PENDING');
  });
});
