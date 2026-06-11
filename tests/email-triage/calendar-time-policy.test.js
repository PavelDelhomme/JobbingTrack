const { describe, it, expect } = require('@jest/globals');
const {
  parseHourMinute,
  evaluateCalendarSlot,
  DEFAULT_MIN_HOUR,
  DEFAULT_MAX_HOUR,
} = require('./lib/calendar-time-policy');

describe('email-triage calendar-time-policy', () => {
  it('parse les heures HH:MM et HHhMM', () => {
    expect(parseHourMinute('09:30')).toEqual({ hour: 9, minute: 30, totalMinutes: 570 });
    expect(parseHourMinute('23h00')).toEqual({ hour: 23, minute: 0, totalMinutes: 1380 });
    expect(parseHourMinute('invalid')).toBeNull();
  });

  it('refuse une date seule sans heure explicite', () => {
    expect(evaluateCalendarSlot({ hasExplicitTime: false })).toMatchObject({
      decision: 'confirm',
      reason: 'date_only',
    });
  });

  it('refuse minuit par défaut sans journée entière', () => {
    expect(
      evaluateCalendarSlot({
        hasExplicitTime: true,
        hour: 0,
        minute: 0,
        allDayProposed: false,
      })
    ).toMatchObject({
      decision: 'confirm',
      reason: 'midnight_without_all_day',
    });
  });

  it('autorise un créneau explicite dans la fenêtre 05:00-23:00', () => {
    expect(
      evaluateCalendarSlot({
        hasExplicitTime: true,
        hour: 10,
        minute: 30,
      })
    ).toMatchObject({
      decision: 'schedule',
      reason: 'within_window',
    });
  });

  it('refuse un créneau avant 05:00', () => {
    expect(
      evaluateCalendarSlot({
        hasExplicitTime: true,
        hour: 4,
        minute: 30,
        minHour: DEFAULT_MIN_HOUR,
        maxHour: DEFAULT_MAX_HOUR,
      })
    ).toMatchObject({
      decision: 'confirm',
      reason: 'before_min_hour',
      minHour: '05:00',
    });
  });

  it('refuse un créneau après 23:00', () => {
    expect(
      evaluateCalendarSlot({
        hasExplicitTime: true,
        hour: 23,
        minute: 30,
        minHour: DEFAULT_MIN_HOUR,
        maxHour: DEFAULT_MAX_HOUR,
      })
    ).toMatchObject({
      decision: 'confirm',
      reason: 'after_max_hour',
      maxHour: '23:00',
    });
  });

  it('garde les formulations ambiguës en confirmation', () => {
    expect(
      evaluateCalendarSlot({
        hasExplicitTime: true,
        hour: 18,
        minute: 0,
        ambiguousText: true,
      })
    ).toMatchObject({
      decision: 'confirm',
      reason: 'ambiguous_time_text',
    });
  });
});
