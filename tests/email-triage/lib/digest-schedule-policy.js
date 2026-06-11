const { parseHourMinute } = require('./calendar-time-policy');

const DEFAULT_DAILY_DIGEST_TIME = '18:00';
const DEFAULT_WEEKLY_DIGEST_DAY = 'sunday';
const DEFAULT_WEEKLY_DIGEST_TIME = '18:00';
const MIN_DIGEST_HOUR = '05:00';
const MAX_DIGEST_HOUR = '23:00';

const WEEK_DAYS = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

function formatHourMinute(parsed) {
  return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
}

function resolveDigestTime(value, fallback = DEFAULT_DAILY_DIGEST_TIME) {
  const requested = value || fallback;
  const parsed = parseHourMinute(requested);
  if (!parsed) {
    return {
      valid: false,
      reason: 'invalid_time',
      requested,
    };
  }

  const min = parseHourMinute(MIN_DIGEST_HOUR);
  const max = parseHourMinute(MAX_DIGEST_HOUR);
  if (parsed.totalMinutes < min.totalMinutes) {
    return {
      valid: false,
      reason: 'before_min_hour',
      requested,
      minHour: MIN_DIGEST_HOUR,
    };
  }
  if (parsed.totalMinutes > max.totalMinutes) {
    return {
      valid: false,
      reason: 'after_max_hour',
      requested,
      maxHour: MAX_DIGEST_HOUR,
    };
  }

  return {
    valid: true,
    time: formatHourMinute(parsed),
  };
}

function resolveWeeklyDay(value) {
  const day = String(value || DEFAULT_WEEKLY_DIGEST_DAY).trim().toLowerCase();
  if (!WEEK_DAYS.has(day)) {
    return {
      valid: false,
      reason: 'invalid_weekday',
      requested: value,
      allowedDays: [...WEEK_DAYS],
    };
  }
  return { valid: true, day };
}

function buildDigestSchedule(env = process.env) {
  const daily = resolveDigestTime(env.EMAIL_TRIAGE_DIGEST_DAILY_TIME);
  const weeklyTime = resolveDigestTime(
    env.EMAIL_TRIAGE_DIGEST_WEEKLY_TIME,
    DEFAULT_WEEKLY_DIGEST_TIME,
  );
  const weeklyDay = resolveWeeklyDay(env.EMAIL_TRIAGE_DIGEST_WEEKLY_DAY);

  return {
    daily: {
      enabled: env.EMAIL_TRIAGE_DIGEST_DAILY_ENABLED !== 'false',
      ...daily,
    },
    weekly: {
      enabled: env.EMAIL_TRIAGE_DIGEST_WEEKLY_ENABLED === 'true',
      ...weeklyDay,
      time: weeklyTime.time,
      timeValid: weeklyTime.valid,
      timeReason: weeklyTime.reason,
    },
    timezone: env.EMAIL_TRIAGE_DIGEST_TIMEZONE || env.TZ || 'Europe/Paris',
  };
}

module.exports = {
  DEFAULT_DAILY_DIGEST_TIME,
  DEFAULT_WEEKLY_DIGEST_DAY,
  DEFAULT_WEEKLY_DIGEST_TIME,
  MIN_DIGEST_HOUR,
  MAX_DIGEST_HOUR,
  buildDigestSchedule,
  resolveDigestTime,
  resolveWeeklyDay,
};
