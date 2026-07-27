-- Backfill ContactCompany : liens vers une Company d’un autre userId
-- → ajoute un lien vers la Company owned du contact (même nom).
-- Idempotent. Ne supprime pas les anciens liens (évite casse multi-owner).

BEGIN;

INSERT INTO "ContactCompany" (id, "contactId", "companyId", "createdAt")
SELECT
  'cc' || substr(md5(random()::text || clock_timestamp()::text || c.id || owned.id), 1, 23),
  c.id,
  owned.id,
  NOW()
FROM "Contact" c
JOIN "ContactCompany" cc ON cc."contactId" = c.id
JOIN "Company" old ON old.id = cc."companyId"
JOIN "Company" owned
  ON owned."userId" = c."userId"
 AND owned."deletedAt" IS NULL
 AND lower(owned.name) = lower(old.name)
 AND owned.id <> old.id
WHERE c."deletedAt" IS NULL
  AND old."userId" IS DISTINCT FROM c."userId"
  AND NOT EXISTS (
    SELECT 1
    FROM "ContactCompany" existing
    WHERE existing."contactId" = c.id
      AND existing."companyId" = owned.id
  );

-- Aussi : contacts liés à une candidature mais sans ContactCompany vers l’entreprise de la candidature
INSERT INTO "ContactCompany" (id, "contactId", "companyId", "createdAt")
SELECT
  'cc' || substr(md5(random()::text || clock_timestamp()::text || c.id || a."companyId"), 1, 23),
  c.id,
  a."companyId",
  NOW()
FROM "ContactApplication" ca
JOIN "Contact" c ON c.id = ca."contactId"
JOIN "Application" a ON a.id = ca."applicationId"
WHERE c."deletedAt" IS NULL
  AND a."deletedAt" IS NULL
  AND a."companyId" IS NOT NULL
  AND c."userId" = a."userId"
  AND NOT EXISTS (
    SELECT 1
    FROM "ContactCompany" existing
    WHERE existing."contactId" = c.id
      AND existing."companyId" = a."companyId"
  );

COMMIT;
