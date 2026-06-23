const { isWeeklyDigestDay, buildDigestSchedule } = require('../src/lib/digestSchedulePolicy');
const { renderDigestHtml } = require('../src/lib/digestRenderer');

const WEEKLY_DIGEST_SUBJECT_PREFIX = 'Récap hebdomadaire recherche emploi JobbingTrack';

describe('digestSchedulePolicy (auth-service)', () => {
  it('active le récap hebdo le dimanche quand EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED=true', () => {
    const sunday = new Date('2026-06-21T12:00:00');
    const check = isWeeklyDigestDay(sunday, {
      EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED: 'true',
      EMAIL_TRIAGE_DIGEST_WEEKLY_DAY: 'sunday',
    });
    expect(check.allowed).toBe(true);
  });

  it('refuse le récap hebdo un mardi', () => {
    const tuesday = new Date('2026-06-23T12:00:00');
    const check = isWeeklyDigestDay(tuesday, {
      EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED: 'true',
      EMAIL_TRIAGE_DIGEST_WEEKLY_DAY: 'sunday',
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('not_weekly_day');
  });

  it('expose la planification daily + weekly', () => {
    const schedule = buildDigestSchedule({
      EMAIL_TRIAGE_DIGEST_DAILY_ENABLED: 'true',
      EMAIL_TRIAGE_DIGEST_DAILY_TIME: '18:00',
      EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED: 'true',
      EMAIL_TRIAGE_DIGEST_WEEKLY_DAY: 'sunday',
      EMAIL_TRIAGE_DIGEST_WEEKLY_TIME: '18:00',
    });
    expect(schedule.daily.enabled).toBe(true);
    expect(schedule.weekly.enabled).toBe(true);
    expect(schedule.weekly.day).toBe('sunday');
  });
});

describe('weekly digest rendering', () => {
  it('inclut les stats hebdomadaires dans le HTML', () => {
    const html = renderDigestHtml({
      subject: `${WEEKLY_DIGEST_SUBJECT_PREFIX} — semaine du 16/06/2026`,
      stats: { total: 5, pending: 2, accepted: 1, linked: 1 },
      importantEmails: [{ label: 'Test', href: 'https://jobbingtrack.localhost:5443/agent' }],
    });
    expect(html).toContain('Vue d’ensemble');
    expect(html).toContain('Emails analysés');
    expect(html).toContain('5');
  });
});
