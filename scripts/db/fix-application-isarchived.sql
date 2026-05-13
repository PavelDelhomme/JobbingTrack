-- Fix: les clients Prisma (images Docker) génèrent du SQL avec "isArchived"
-- alors que la table n'a que "archived" (@map dans le schéma).
-- On ajoute une colonne "isArchived" générée pour que les requêtes Prisma passent sans rebuild.
-- À exécuter une fois : make db-fix-isarchived ou docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack -f - < scripts/db/fix-application-isarchived.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'isArchived'
  ) THEN
    ALTER TABLE "Application" ADD COLUMN "isArchived" boolean GENERATED ALWAYS AS (archived) STORED;
    RAISE NOTICE 'Colonne Application.isArchived ajoutée (générée depuis archived)';
  ELSE
    RAISE NOTICE 'Colonne Application.isArchived déjà présente';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'fix-application-isarchived: %', SQLERRM;
END $$;
