const NORMALIZE_RE = /[\u0300-\u036f]/g;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(NORMALIZE_RE, '')
    .toLowerCase();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function buildText(input = {}) {
  return normalizeText([input.from, input.subject, input.body].filter(Boolean).join(' '));
}

function classifyEmail(input = {}) {
  const text = buildText(input);

  if (
    includesAny(text, [
      'malheureusement',
      'pas retenu',
      'non retenue',
      'ne donnerons pas suite',
      'nous ne pouvons pas donner suite',
      'candidature non retenue',
    ])
  ) {
    return {
      classification: 'application_rejected',
      confidence: 'high',
      suggestedStatus: input.hadInterview ? 'REJECTED_AFTER_INTERVIEW' : 'REJECTED_WITHOUT_INTERVIEW',
      labels: ['candidature', 'refus'],
      proposedActions: ['mark_application_rejected', 'archive_candidate_email'],
    };
  }

  if (
    includesAny(text, [
      'test technique',
      'exercice technique',
      'coding challenge',
      'cas pratique',
      'evaluation technique',
    ])
  ) {
    return {
      classification: 'technical_test',
      confidence: 'high',
      suggestedStatus: 'TECHNICAL_TEST_PENDING',
      labels: ['candidature', 'test-technique'],
      proposedActions: ['create_task_prepare_test', 'add_digest_priority'],
    };
  }

  if (
    includesAny(text, [
      'entretien',
      'rendez-vous',
      'rendez vous',
      'disponibilites',
      'visioconference',
      'visio',
      'premier echange',
    ])
  ) {
    return {
      classification: 'interview_request',
      confidence: 'high',
      suggestedStatus: input.hadInterview ? 'OTHER_INTERVIEW_PENDING' : 'FIRST_INTERVIEW_PENDING',
      labels: ['candidature', 'entretien'],
      proposedActions: ['create_task_prepare_interview', 'propose_calendar_event'],
    };
  }

  if (includesAny(text, ['job dating', 'salon emploi', 'forum emploi', 'recrutement en ligne'])) {
    return {
      classification: 'job_event',
      confidence: 'medium',
      suggestedStatus: null,
      labels: ['veille', 'evenement-emploi'],
      proposedActions: ['create_event_to_confirm', 'add_digest_event'],
    };
  }

  if (
    input.daysSinceApplication >= 7 &&
    !input.hasRecentResponse &&
    !includesAny(text, ['newsletter', 'alerte emploi', 'desabonner', 'unsubscribe'])
  ) {
    return {
      classification: 'follow_up_needed',
      confidence: input.daysSinceApplication >= 14 ? 'high' : 'medium',
      suggestedStatus:
        input.followUpCount >= 1 ? 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP' : 'NO_RESPONSE',
      labels: ['candidature', 'relance'],
      proposedActions: ['create_follow_up_task', 'add_digest_follow_up'],
    };
  }

  if (
    includesAny(text, [
      'newsletter',
      'alerte emploi',
      'offres recommandees',
      'desabonner',
      'unsubscribe',
    ])
  ) {
    return {
      classification: 'noise_newsletter',
      confidence: 'medium',
      suggestedStatus: null,
      labels: ['bruit'],
      proposedActions: ['keep_out_of_priority_digest'],
    };
  }

  return {
    classification: 'needs_manual_review',
    confidence: 'low',
    suggestedStatus: null,
    labels: ['a-verifier'],
    proposedActions: ['add_digest_unclassified'],
  };
}

module.exports = {
  classifyEmail,
  normalizeText,
};
