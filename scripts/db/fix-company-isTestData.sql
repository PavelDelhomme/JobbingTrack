-- Alignement BDD : Company.isTestData (schéma maître = auth-service au db push).
-- Les clients Prisma des services métier peuvent référencer cette colonne avant que
-- un prisma db push depuis un image auth ancienne ne l'ait créée.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isTestData" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Company_isTestData_idx" ON "Company" ("isTestData");
