-- Seed des tables de statuts prédéfinis (ApplicationStatus, InterviewStatus, FollowUpStatus).
-- À exécuter après make db-push-all pour que les services trouvent des lignes (ex. interview-service crée un entretien avec statusId).
-- Utilise ON CONFLICT (code) DO NOTHING pour ne pas dupliquer si déjà présents.

-- ApplicationStatus : statuts de candidature (liste utilisateur)
INSERT INTO "ApplicationStatus" (id, code, name, description, "order", color, icon, "userId", "isPredefined", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'CANDIDATE_PENDING', 'Candidaté et en attente', 'Candidature envoyée, en attente de réponse', 1, '#3B82F6', 'Clock', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'RELANCED_PENDING', 'Relancée et en attente', 'Relance effectuée, en attente de réponse', 2, '#8B5CF6', 'RefreshCw', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'AWAITING_INTERVIEW', 'En attente d''un entretien', 'Entretien planifié ou à planifier', 3, '#F59E0B', 'Calendar', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INTERVIEW_SOON', 'Entretien proche', 'Entretien prévu bientôt', 4, '#10B981', 'Zap', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'POST_INTERVIEW_FEEDBACK', 'Faire un retour post-entretien', 'Entretien passé, en attente de retour', 5, '#6366F1', 'MessageSquare', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NO_RESPONSE_NO_INTERVIEW', 'Aucune réponse sans entretien', 'Refus ou silence sans entretien', 6, '#EF4444', 'XCircle', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NO_RESPONSE', 'Aucune réponse', 'Aucune réponse reçue', 7, '#6B7280', 'Inbox', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NO_RESPONSE_AFTER_FOLLOWUP', 'Aucune réponse après relance', 'Relance(s) sans réponse', 8, '#78716C', 'MailX', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INTERVIEW_PENDING', 'Entretien planifié', 'Un entretien a été programmé pour cette candidature', 9, '#F59E0B', 'CalendarCheck', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'INTERVIEW_DONE', 'Entretien passé', 'L''entretien a été effectué, en attente de retour', 10, '#10B981', 'CheckCircle', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'OFFER_RECEIVED', 'Offre reçue', 'Une offre a été reçue suite à un entretien positif', 11, '#22C55E', 'Gift', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'REJECTED', 'Refusée', 'Candidature refusée après entretien', 12, '#EF4444', 'XOctagon', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP', 'Aucune réponse après 1ère relance', 'Première relance sans réponse', 13, '#9CA3AF', 'MailX', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP', 'Aucune réponse après 2ème relance', 'Deuxième relance sans réponse', 14, '#6B7280', 'MailX', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'FIRST_INTERVIEW_PENDING', 'Premier entretien planifié', 'Premier entretien programmé', 15, '#3B82F6', 'Calendar', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'OTHER_INTERVIEW_PENDING', 'Autre entretien planifié', 'Entretien supplémentaire programmé', 16, '#8B5CF6', 'Calendar', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'ACCEPTED_AFTER_INTERVIEW', 'Acceptée après entretien', 'Candidature acceptée suite à entretien', 17, '#22C55E', 'Check', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'REJECTED_WITHOUT_INTERVIEW', 'Refusée sans entretien', 'Candidature refusée sans entretien', 18, '#EF4444', 'X', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'REJECTED_AFTER_INTERVIEW', 'Refusée après entretien', 'Candidature refusée après entretien', 19, '#DC2626', 'XCircle', NULL, true, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- InterviewStatus
INSERT INTO "InterviewStatus" (id, code, name, description, "order", color, icon, "userId", "isPredefined", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'SCHEDULED', 'Programmé', 'Entretien programmé', 1, '#3B82F6', 'Calendar', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'COMPLETED', 'Effectué', 'Entretien passé', 2, '#10B981', 'Check', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'FEEDBACK_PENDING', 'En attente de retour', 'En attente de retour post-entretien', 3, '#F59E0B', 'MessageSquare', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'CANCELLED', 'Annulé', 'Entretien annulé', 4, '#EF4444', 'XCircle', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'RESCHEDULED', 'Reporté', 'Entretien reporté', 5, '#8B5CF6', 'CalendarClock', NULL, true, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- EventType : types d'événements prédéfinis (utilisés par l'auto-création)
-- ON CONFLICT sur (userId, name) ne fonctionne pas avec NULL userId, on utilise NOT EXISTS
INSERT INTO "EventType" (id, "userId", code, name, color, icon, "isPredefined", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'INTERVIEW', 'Entretien', '#3B82F6', 'Calendar', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EventType" WHERE code = 'INTERVIEW' AND "userId" IS NULL);
INSERT INTO "EventType" (id, "userId", code, name, color, icon, "isPredefined", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'FOLLOWUP', 'Relance', '#F59E0B', 'RefreshCw', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EventType" WHERE code = 'FOLLOWUP' AND "userId" IS NULL);
INSERT INTO "EventType" (id, "userId", code, name, color, icon, "isPredefined", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'CALL', 'Appel', '#10B981', 'Phone', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EventType" WHERE code = 'CALL' AND "userId" IS NULL);
INSERT INTO "EventType" (id, "userId", code, name, color, icon, "isPredefined", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'DEADLINE', 'Échéance', '#EF4444', 'Clock', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EventType" WHERE code = 'DEADLINE' AND "userId" IS NULL);
INSERT INTO "EventType" (id, "userId", code, name, color, icon, "isPredefined", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'OTHER', 'Autre', '#6B7280', 'Tag', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "EventType" WHERE code = 'OTHER' AND "userId" IS NULL);

-- FollowUpStatus
INSERT INTO "FollowUpStatus" (id, code, name, description, "order", color, icon, "userId", "isPredefined", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'PENDING', 'En attente', 'Relance à faire', 1, '#F59E0B', 'Clock', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'POSITIVE_RESPONSE', 'Retour positif', 'Réponse positive reçue', 2, '#10B981', 'ThumbsUp', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NEGATIVE_RESPONSE', 'Retour négatif', 'Réponse négative reçue', 3, '#EF4444', 'ThumbsDown', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'NO_RESPONSE', 'Aucun retour', 'Aucune réponse à la relance', 4, '#6B7280', 'Inbox', NULL, true, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'PLANNED', 'Prévue', 'Relance planifiée', 5, '#3B82F6', 'Calendar', NULL, true, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
