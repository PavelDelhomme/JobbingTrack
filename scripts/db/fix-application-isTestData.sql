DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Application'
      AND column_name = 'isTestData'
  ) THEN
    ALTER TABLE "Application" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Colonne Application.isTestData ajoutée';
  ELSE
    RAISE NOTICE 'Colonne Application.isTestData déjà présente';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Application_isTestData_idx" ON "Application"("isTestData");
