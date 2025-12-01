#!/usr/bin/env node

/**
 * Script de Backup - Phase 1 : Préparation Migration Statuts
 * 
 * Ce script crée une sauvegarde complète de la base de données avant
 * la migration des enums vers des tables de statuts personnalisables.
 * 
 * Usage:
 *   node scripts/database/migration-phase1-backup.js
 * 
 * Ou via Makefile:
 *   make db-backup-before-migration
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

const BACKUP_DIR = path.join(__dirname, '../../backups/migrations');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');

async function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Répertoire de backup créé : ${BACKUP_DIR}`);
  }
}

async function backupDatabase() {
  console.log('📦 Création du backup de la base de données...\n');

  try {
    // 1. Backup PostgreSQL complet
    const pgBackupFile = path.join(BACKUP_DIR, `backup_${TIMESTAMP}.sql`);
    console.log('📥 Backup PostgreSQL...');
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL non défini dans les variables d\'environnement');
    }

    // Extraire les informations de connexion
    const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error('Format DATABASE_URL invalide');
    }

    const [, user, password, host, port, database] = urlMatch;

    // Créer le backup avec pg_dump via Docker
    const dockerExec = `docker exec jobbingtrack-postgres pg_dump -U ${user} -d ${database} > ${pgBackupFile}`;
    
    try {
      execSync(dockerExec, { stdio: 'inherit' });
      console.log(`✅ Backup PostgreSQL créé : ${pgBackupFile}`);
    } catch (error) {
      console.warn('⚠️  Backup PostgreSQL via Docker échoué, tentative alternative...');
      // Alternative : backup via Prisma
      await backupViaPrisma(pgBackupFile);
    }

    // 2. Backup des données critiques via Prisma
    const dataBackupFile = path.join(BACKUP_DIR, `data_backup_${TIMESTAMP}.json`);
    console.log('\n📥 Backup des données critiques...');
    
    const criticalData = {
      timestamp: new Date().toISOString(),
      applications: await prisma.application.findMany({
        select: {
          id: true,
          userId: true,
          status: true,
        },
      }),
      followUps: await prisma.followUp.findMany({
        select: {
          id: true,
          userId: true,
          status: true,
        },
      }),
      interviews: await prisma.interview.findMany({
        select: {
          id: true,
          userId: true,
          status: true,
        },
      }),
      counts: {
        applications: await prisma.application.count(),
        followUps: await prisma.followUp.count(),
        interviews: await prisma.interview.count(),
      },
    };

    fs.writeFileSync(dataBackupFile, JSON.stringify(criticalData, null, 2));
    console.log(`✅ Backup des données critiques créé : ${dataBackupFile}`);

    // 3. Créer un fichier de métadonnées
    const metadataFile = path.join(BACKUP_DIR, `metadata_${TIMESTAMP}.json`);
    const metadata = {
      timestamp: new Date().toISOString(),
      migration: 'phase1-enum-to-tables',
      description: 'Backup avant migration des enums ApplicationStatus, FollowUpStatus, InterviewStatus vers tables',
      files: {
        database: pgBackupFile,
        data: dataBackupFile,
      },
      database: {
        url: dbUrl.replace(/:[^:@]+@/, ':****@'), // Masquer le mot de passe
        host,
        port,
        database,
        user,
      },
    };

    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`✅ Métadonnées créées : ${metadataFile}`);

    console.log('\n✅ Backup terminé avec succès !');
    console.log(`📁 Fichiers créés dans : ${BACKUP_DIR}`);
    console.log(`\n📋 Fichiers de backup :`);
    console.log(`   - ${path.basename(pgBackupFile)}`);
    console.log(`   - ${path.basename(dataBackupFile)}`);
    console.log(`   - ${path.basename(metadataFile)}`);

    return {
      success: true,
      files: {
        database: pgBackupFile,
        data: dataBackupFile,
        metadata: metadataFile,
      },
    };

  } catch (error) {
    console.error('❌ Erreur lors du backup :', error);
    throw error;
  }
}

async function backupViaPrisma(backupFile) {
  // Backup minimal via Prisma (si pg_dump n'est pas disponible)
  const data = {
    timestamp: new Date().toISOString(),
    note: 'Backup minimal via Prisma (pg_dump non disponible)',
    applications: await prisma.application.findMany(),
    followUps: await prisma.followUp.findMany(),
    interviews: await prisma.interview.findMany(),
  };

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  console.log(`✅ Backup minimal créé : ${backupFile}`);
}

async function main() {
  console.log('🚀 Script de Backup - Migration Phase 1\n');
  console.log('=' .repeat(60));

  try {
    await createBackupDirectory();
    const result = await backupDatabase();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Backup terminé avec succès !');
    console.log('\n💡 Prochaines étapes :');
    console.log('   1. Vérifier les fichiers de backup');
    console.log('   2. Exécuter le script de migration : scripts/database/migration-phase2-create-tables.js');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur fatale :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { backupDatabase, createBackupDirectory };

