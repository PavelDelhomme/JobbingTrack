#!/bin/bash

# Script pour créer les migrations Prisma

set -e

echo "🔄 Création des migrations Prisma..."
echo "===================================="

cd auth-service

# Créer le dossier de migration
MIGRATION_NAME="add_call_and_advanced_deletion"
MIGRATION_DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_${MIGRATION_NAME}"

mkdir -p "$MIGRATION_DIR"

# Créer le fichier SQL de migration
cat > "$MIGRATION_DIR/migration.sql" << 'EOF'
-- CreateTable
CREATE TABLE IF NOT EXISTS "Call" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OUTGOING',
    "scheduledDate" TIMESTAMP(3),
    "callDate" TIMESTAMP(3),
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "outcome" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "adminDeletedAt" TIMESTAMP(3),
    "canRestore" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApplicationContact" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationContact_pkey" PRIMARY KEY ("id")
);

-- AlterTable
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Application' AND column_name='deletedAt') THEN
        ALTER TABLE "Application" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Application' AND column_name='archivedAt') THEN
        ALTER TABLE "Application" ADD COLUMN "archivedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Application' AND column_name='deletedBy') THEN
        ALTER TABLE "Application" ADD COLUMN "deletedBy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Application' AND column_name='adminDeletedAt') THEN
        ALTER TABLE "Application" ADD COLUMN "adminDeletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Application' AND column_name='canRestore') THEN
        ALTER TABLE "Application" ADD COLUMN "canRestore" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- AlterTable Interview
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Interview' AND column_name='deletedAt') THEN
        ALTER TABLE "Interview" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Interview' AND column_name='archivedAt') THEN
        ALTER TABLE "Interview" ADD COLUMN "archivedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Interview' AND column_name='deletedBy') THEN
        ALTER TABLE "Interview" ADD COLUMN "deletedBy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Interview' AND column_name='adminDeletedAt') THEN
        ALTER TABLE "Interview" ADD COLUMN "adminDeletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Interview' AND column_name='canRestore') THEN
        ALTER TABLE "Interview" ADD COLUMN "canRestore" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- AlterTable Contact
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='deletedAt') THEN
        ALTER TABLE "Contact" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='archivedAt') THEN
        ALTER TABLE "Contact" ADD COLUMN "archivedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='deletedBy') THEN
        ALTER TABLE "Contact" ADD COLUMN "deletedBy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='adminDeletedAt') THEN
        ALTER TABLE "Contact" ADD COLUMN "adminDeletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Contact' AND column_name='canRestore') THEN
        ALTER TABLE "Contact" ADD COLUMN "canRestore" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- AlterTable FollowUp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FollowUp' AND column_name='deletedAt') THEN
        ALTER TABLE "FollowUp" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FollowUp' AND column_name='archivedAt') THEN
        ALTER TABLE "FollowUp" ADD COLUMN "archivedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FollowUp' AND column_name='deletedBy') THEN
        ALTER TABLE "FollowUp" ADD COLUMN "deletedBy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FollowUp' AND column_name='adminDeletedAt') THEN
        ALTER TABLE "FollowUp" ADD COLUMN "adminDeletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FollowUp' AND column_name='canRestore') THEN
        ALTER TABLE "FollowUp" ADD COLUMN "canRestore" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- AlterTable Company
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='deletedAt') THEN
        ALTER TABLE "Company" ADD COLUMN "deletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='archivedAt') THEN
        ALTER TABLE "Company" ADD COLUMN "archivedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='deletedBy') THEN
        ALTER TABLE "Company" ADD COLUMN "deletedBy" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='adminDeletedAt') THEN
        ALTER TABLE "Company" ADD COLUMN "adminDeletedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Company' AND column_name='canRestore') THEN
        ALTER TABLE "Company" ADD COLUMN "canRestore" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- CreateEnum CallType
DO $$ BEGIN
    CREATE TYPE "CallType" AS ENUM ('OUTGOING', 'INCOMING', 'MISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum CallStatus
DO $$ BEGIN
    CREATE TYPE "CallStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_ANSWER', 'VOICEMAIL', 'RESCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationContact_applicationId_contactId_key" ON "ApplicationContact"("applicationId", "contactId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Call_applicationId_fkey') THEN
        ALTER TABLE "Call" ADD CONSTRAINT "Call_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Call_contactId_fkey') THEN
        ALTER TABLE "Call" ADD CONSTRAINT "Call_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ApplicationContact_applicationId_fkey') THEN
        ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ApplicationContact_contactId_fkey') THEN
        ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
EOF

echo "✅ Migration SQL créée: $MIGRATION_DIR/migration.sql"

cd ..

