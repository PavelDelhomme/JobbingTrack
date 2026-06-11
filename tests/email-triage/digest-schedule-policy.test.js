const { describe, it, expect } = require('@jest/globals');
const {
  buildDigestSchedule,
  resolveDigestTime,
  resolveWeeklyDay,
} = require('./lib/digest-schedule-policy');

describe('email-triage digest-schedule-policy', () => {
  it('programme le digest quotidien à 18:00 par défaut', () => {
    expect(buildDigestSchedule({})).toMatchObject({
      daily: {
        enabled: true,
        valid: true,
        time: '18:00',
      },
      timezone: 'Europe/Paris',
    });
  });

  it('accepte une heure quotidienne paramétrée dans la fenêtre 05:00-23:00', () => {
    expect(resolveDigestTime('07h30')).toEqual({
      valid: true,
      time: '07:30',
    });
  });

  it('refuse un digest avant 05:00', () => {
    expect(resolveDigestTime('04:59')).toMatchObject({
      valid: false,
      reason: 'before_min_hour',
      minHour: '05:00',
    });
  });

  it('refuse un digest après 23:00', () => {
    expect(resolveDigestTime('23:30')).toMatchObject({
      valid: false,
      reason: 'after_max_hour',
      maxHour: '23:00',
    });
  });

  it('valide le jour hebdomadaire explicite', () => {
    expect(resolveWeeklyDay('monday')).toEqual({
      valid: true,
      day: 'monday',
    });
  });

  it('refuse un jour hebdomadaire inconnu', () => {
    expect(resolveWeeklyDay('funday')).toMatchObject({
      valid: false,
      reason: 'invalid_weekday',
    });
  });
});
