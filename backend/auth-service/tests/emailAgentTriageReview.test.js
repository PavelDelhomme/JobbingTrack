const { normalizeTriageReviewStatus } = require('../src/services/emailAgentService');

describe('normalizeTriageReviewStatus', () => {
  it('accepte ACCEPTED et DEFERRED', () => {
    expect(normalizeTriageReviewStatus('ACCEPTED')).toBe('ACCEPTED');
    expect(normalizeTriageReviewStatus('deferred')).toBe('DEFERRED');
  });

  it('mappe DISMISSED vers REJECTED (alias mobile legacy)', () => {
    expect(normalizeTriageReviewStatus('DISMISSED')).toBe('REJECTED');
    expect(normalizeTriageReviewStatus('dismissed')).toBe('REJECTED');
  });

  it('rejette statut inconnu', () => {
    expect(() => normalizeTriageReviewStatus('INVALID')).toThrow('invalid_review_status');
    expect(() => normalizeTriageReviewStatus('')).toThrow('invalid_review_status');
  });
});
