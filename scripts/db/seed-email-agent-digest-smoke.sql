-- Smoke digest agent email pour paul.delhomme@proton.me (idempotent)

BEGIN;

UPDATE "User"
SET "jobSearchAgentEnabled" = true
WHERE email = 'paul.delhomme@proton.me';

INSERT INTO user_agent_consents (id, "userId", "consentType", granted, version, "grantedAt", "updatedAt")
SELECT 'smoke-consent-mailbox', u.id, 'MAILBOX_ACCESS', true, '1.0', NOW(), NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me'
ON CONFLICT ("userId", "consentType", version) DO UPDATE
SET granted = true, "grantedAt" = NOW(), "revokedAt" = NULL, "updatedAt" = NOW();

INSERT INTO user_agent_consents (id, "userId", "consentType", granted, version, "grantedAt", "updatedAt")
SELECT 'smoke-consent-class', u.id, 'CONTENT_CLASSIFICATION', true, '1.0', NOW(), NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me'
ON CONFLICT ("userId", "consentType", version) DO UPDATE
SET granted = true, "grantedAt" = NOW(), "revokedAt" = NULL, "updatedAt" = NOW();

INSERT INTO user_agent_consents (id, "userId", "consentType", granted, version, "grantedAt", "updatedAt")
SELECT 'smoke-consent-digest', u.id, 'DIGEST_NOTIFICATIONS', true, '1.0', NOW(), NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me'
ON CONFLICT ("userId", "consentType", version) DO UPDATE
SET granted = true, "grantedAt" = NOW(), "revokedAt" = NULL, "updatedAt" = NOW();

INSERT INTO user_mailboxes (
  id, "userId", "emailAddress", "displayName", provider, "credentialsEnc",
  "imapHost", "imapPort", "imapUseTls", "syncEnabled", status, "lastSyncStatus", "updatedAt"
)
SELECT
  'smoke-mailbox-digest', u.id, 'candidatures@delhomme.ovh', 'Boîte candidatures smoke',
  'IMAP_GENERIC', 'smoke-credentials-placeholder',
  'imap.mail.ovh.net', 993, true, true, 'ACTIVE', 'OK', NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me'
ON CONFLICT ("userId", "emailAddress") DO UPDATE
SET status = 'ACTIVE', "syncEnabled" = true, "updatedAt" = NOW();

DELETE FROM email_triage_messages m
USING "User" u
WHERE m."userId" = u.id AND u.email = 'paul.delhomme@proton.me'
  AND m."externalId" LIKE 'smoke-digest-%';

INSERT INTO email_triage_messages (
  id, "userId", "mailboxId", "externalId", "fromAddress", subject, snippet,
  "receivedAt", classification, confidence, labels, "proposedActions", "reviewStatus", "updatedAt"
)
SELECT
  'smoke-triage-1', u.id, 'smoke-mailbox-digest', 'smoke-digest-1',
  'recruteur@acme.fr', 'Proposition entretien — Développeur',
  'Seriez-vous disponible pour un entretien visio la semaine prochaine ?',
  NOW() - INTERVAL '2 hours', 'interview_request', 'high', ARRAY['candidature','entretien'],
  '["propose_calendar_event"]'::jsonb, 'PENDING', NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me';

INSERT INTO email_triage_messages (
  id, "userId", "mailboxId", "externalId", "fromAddress", subject, snippet,
  "receivedAt", classification, confidence, labels, "proposedActions", "reviewStatus", "updatedAt"
)
SELECT
  'smoke-triage-2', u.id, 'smoke-mailbox-digest', 'smoke-digest-2',
  'rh@startup.io', 'Relance candidature sans nouvelles',
  'Nous souhaitions avoir de vos nouvelles concernant votre candidature.',
  NOW() - INTERVAL '5 hours', 'follow_up_needed', 'medium', ARRAY['relance'],
  '["create_follow_up_task"]'::jsonb, 'PENDING', NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me';

INSERT INTO email_triage_messages (
  id, "userId", "mailboxId", "externalId", "fromAddress", subject, snippet,
  "receivedAt", classification, confidence, labels, "proposedActions", "reviewStatus", "updatedAt"
)
SELECT
  'smoke-triage-3', u.id, 'smoke-mailbox-digest', 'smoke-digest-3',
  'candidatures@entreprise.fr', 'Candidature reçue — merci',
  'Nous avons bien reçu votre candidature et reviendrons vers vous.',
  NOW() - INTERVAL '1 day', 'manual_review', 'low', ARRAY['a-verifier'],
  '["manual_review"]'::jsonb, 'PENDING', NOW()
FROM "User" u WHERE u.email = 'paul.delhomme@proton.me';

DELETE FROM "EmailLog" e
USING "User" u
WHERE e."userId" = u.id AND u.email = 'paul.delhomme@proton.me'
  AND e.subject LIKE 'Digest recherche emploi JobbingTrack%'
  AND e."createdAt" >= CURRENT_DATE;

COMMIT;

SELECT u.email, u."jobSearchAgentEnabled", COUNT(m.id) AS triage_pending
FROM "User" u
LEFT JOIN email_triage_messages m ON m."userId" = u.id AND m."reviewStatus" = 'PENDING'
WHERE u.email = 'paul.delhomme@proton.me'
GROUP BY u.email, u."jobSearchAgentEnabled";
