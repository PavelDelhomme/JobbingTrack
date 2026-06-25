/** Libellés FR statuts candidature (alignés mobile application_labels.dart). */
const STATUS_LABELS = {
  CANDIDATE_PENDING: 'Candidaté et en attente',
  NO_RESPONSE: 'À relancer',
  NO_RESPONSE_AFTER_FIRST_FOLLOWUP: 'Pas de réponse après relance',
  NO_RESPONSE_AFTER_SECOND_FOLLOWUP: 'Pas de réponse après relance',
  NO_RESPONSE_AFTER_FOLLOWUP: 'Pas de réponse après relance',
  RELANCED_PENDING: 'Relancée — à relancer',
  FIRST_INTERVIEW_PENDING: 'Entretien à venir',
  INTERVIEW_PENDING: 'Entretien à venir',
  AWAITING_INTERVIEW: 'Entretien à venir',
  OTHER_INTERVIEW_PENDING: 'Autre entretien en attente',
  INTERVIEW_SOON: 'Entretien imminent',
  TECHNICAL_TEST_PENDING: 'Test technique en cours',
  OFFER_RECEIVED: 'Offre reçue',
  ACCEPTED_AFTER_INTERVIEW: 'Retenue',
  ACCEPTED: 'Retenue',
  REJECTED_WITHOUT_INTERVIEW: 'Non retenue (sans entretien)',
  NO_RESPONSE_NO_INTERVIEW: 'Non retenue (sans entretien)',
  REJECTED_AFTER_INTERVIEW: 'Refusée',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Candidature retirée',
  SENT: 'Envoyée',
  APPLIED: 'Envoyée',
  IN_PROGRESS: 'En cours',
};

function applicationStatusLabel(code) {
  if (!code) return '—';
  return STATUS_LABELS[code] || String(code).replace(/_/g, ' ').toLowerCase();
}

module.exports = { applicationStatusLabel, STATUS_LABELS };
