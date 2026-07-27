-- Backfill : candidatures dont Company.userId ≠ Application.userId
-- → crée (si besoin) une Company owned par le propriétaire de la candidature
--   et rattache la candidature à cette entreprise.
-- Idempotent. Ne supprime pas les anciennes Company partagées.

BEGIN;

-- 1) Créer les entreprises manquantes pour chaque (userId candidature, nom)
INSERT INTO "Company" (
  id,
  "userId",
  name,
  website,
  industry,
  size,
  "companyType",
  location,
  address,
  city,
  "postalCode",
  country,
  "logoUrl",
  description,
  "isTestData",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "isArchived",
  "archivedAt"
)
SELECT
  'c' || substr(md5(random()::text || clock_timestamp()::text || a."userId" || lower(src.name)), 1, 24),
  a."userId",
  src.name,
  src.website,
  src.industry,
  src.size,
  COALESCE(src."companyType", 'EMPLOYER'),
  src.location,
  src.address,
  src.city,
  src."postalCode",
  COALESCE(src.country, 'France'),
  src."logoUrl",
  src.description,
  COALESCE(src."isTestData", false),
  NOW(),
  NOW(),
  NULL,
  false,
  NULL
FROM "Application" a
JOIN "Company" src ON src.id = a."companyId"
WHERE a."deletedAt" IS NULL
  AND src."userId" <> a."userId"
  AND NOT EXISTS (
    SELECT 1
    FROM "Company" owned
    WHERE owned."userId" = a."userId"
      AND owned."deletedAt" IS NULL
      AND lower(owned.name) = lower(src.name)
  )
GROUP BY
  a."userId",
  src.name,
  src.website,
  src.industry,
  src.size,
  src."companyType",
  src.location,
  src.address,
  src.city,
  src."postalCode",
  src.country,
  src."logoUrl",
  src.description,
  src."isTestData";

-- 2) Rattacher les candidatures à la Company owned du même nom
UPDATE "Application" a
SET "companyId" = owned.id,
    "updatedAt" = NOW()
FROM "Company" foreign_co,
     "Company" owned
WHERE a."companyId" = foreign_co.id
  AND a."deletedAt" IS NULL
  AND foreign_co."userId" <> a."userId"
  AND owned."userId" = a."userId"
  AND owned."deletedAt" IS NULL
  AND lower(owned.name) = lower(foreign_co.name);

COMMIT;

-- Contrôle
SELECT
  COUNT(*) FILTER (WHERE c."userId" <> a."userId") AS apps_wrong_owner_remaining
FROM "Application" a
JOIN "Company" c ON c.id = a."companyId"
WHERE a."deletedAt" IS NULL;
