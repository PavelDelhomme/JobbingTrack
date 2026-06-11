const DEFAULT_MIN_HOUR = '05:00';
const DEFAULT_MAX_HOUR = '23:00';

function parseHourMinute(value) {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase().replace('h', ':');
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute, totalMinutes: hour * 60 + minute };
}

function resolveWindow(options = {}) {
  const min = parseHourMinute(options.minHour || process.env.TEST_EMAIL_TRIAGE_CALENDAR_MIN_HOUR || DEFAULT_MIN_HOUR);
  const max = parseHourMinute(options.maxHour || process.env.TEST_EMAIL_TRIAGE_CALENDAR_MAX_HOUR || DEFAULT_MAX_HOUR);

  if (!min || !max) {
    throw new Error('Fenêtre horaire Calendar invalide');
  }

  return { min, max };
}

/**
 * Décide si un créneau peut être créé automatiquement dans Google Calendar.
 * Retourne `schedule` ou `confirm` + une raison stable pour les tests/rapports.
 */
function evaluateCalendarSlot(input = {}) {
  const {
    hasExplicitTime = false,
    hour,
    minute,
    allDayProposed = false,
    ambiguousText = false,
  } = input;

  if (!hasExplicitTime || ambiguousText) {
    return {
      decision: 'confirm',
      reason: ambiguousText ? 'ambiguous_time_text' : 'date_only',
      suggestedAction: allDayProposed ? 'all_day_or_task' : 'task_confirm_time',
    };
  }

  const parsed =
    typeof hour === 'number' && typeof minute === 'number'
      ? { hour, minute, totalMinutes: hour * 60 + minute }
      : null;

  if (!parsed) {
    return {
      decision: 'confirm',
      reason: 'invalid_time',
      suggestedAction: 'task_confirm_time',
    };
  }

  if (parsed.hour === 0 && parsed.minute === 0 && !allDayProposed) {
    return {
      decision: 'confirm',
      reason: 'midnight_without_all_day',
      suggestedAction: 'task_confirm_time',
    };
  }

  const { min, max } = resolveWindow(input);

  if (parsed.totalMinutes < min.totalMinutes) {
    return {
      decision: 'confirm',
      reason: 'before_min_hour',
      minHour: `${String(min.hour).padStart(2, '0')}:${String(min.minute).padStart(2, '0')}`,
      suggestedAction: 'task_verify_time',
    };
  }

  if (parsed.totalMinutes > max.totalMinutes) {
    return {
      decision: 'confirm',
      reason: 'after_max_hour',
      maxHour: `${String(max.hour).padStart(2, '0')}:${String(max.minute).padStart(2, '0')}`,
      suggestedAction: 'task_verify_time',
    };
  }

  return {
    decision: 'schedule',
    reason: 'within_window',
    hour: parsed.hour,
    minute: parsed.minute,
  };
}

module.exports = {
  DEFAULT_MIN_HOUR,
  DEFAULT_MAX_HOUR,
  parseHourMinute,
  evaluateCalendarSlot,
};
