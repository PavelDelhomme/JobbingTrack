-- Ajoute la colonne thankYouEmailSentAt à Application si elle n'existe pas.
-- Nécessaire quand l'image auth-service a été buildée avant l'ajout du champ
-- (prisma db push depuis le conteneur ne l'ajoute pas).
-- Exécuté par : make db-push-all (après fix-application-isarchived.sql)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Application' AND column_name = 'thankYouEmailSentAt'
  ) THEN
    ALTER TABLE "Application" ADD COLUMN "thankYouEmailSentAt" TIMESTAMP(3);
    RAISE NOTICE 'Colonne Application.thankYouEmailSentAt ajoutée';
  ELSE
    RAISE NOTICE 'Colonne Application.thankYouEmailSentAt déjà présente';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'fix-application-thankyou-sent: %', SQLERRM;
END $$;
