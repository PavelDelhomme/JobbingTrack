#!/usr/bin/env node

/**
 * Script de Migration - Phase 2 : Création des Tables de Statuts
 * 
 * Ce script crée les tables ApplicationStatus, InterviewStatus, FollowUpStatus
 * dans le schéma Prisma et les applique à la base de données.
 * 
 * ⚠️ ATTENTION : Ce script modifie le schéma Prisma et la base de données.
 * Assurez-vous d'avoir fait un backup avant d'exécuter ce script.
 * 
 * Usage:
 *   node scripts/database/migration-phase2-create-tables.js
 * 
 * Ou via Makefile:
 *   make db-migration-phase2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCHEMA_PATH = path.join(__dirname, '../../../backend/prisma/schema.prisma');

// Définitions des statuts système par défaut
const APPLICATION_STATUSES = [
  { code: 'CANDIDATE_PENDING', name: 'Candidaté', description: 'Candidaté et en attente', order: 1, color: '#3B82F6', icon: 'Clock' },
  { code: 'NO_RESPONSE', name: 'Aucune réponse', description: 'Aucune réponse reçue', order: 2, color: '#F59E0B', icon: 'AlertCircle' },
  { code: 'NO_RESPONSE_AFTER_FIRST_FOLLOWUP', name: 'Pas de réponse (1 relance)', description: 'Aucune réponse après 1 relance', order: 3, color: '#EF4444', icon: 'AlertTriangle' },
  { code: 'NO_RESPONSE_AFTER_SECOND_FOLLOWUP', name: 'Pas de réponse (2 relances)', description: 'Aucune réponse après 2 relances', order: 4, color: '#DC2626', icon: 'XCircle' },
  { code: 'FIRST_INTERVIEW_PENDING', name: '1er entretien en attente', description: 'Premier entretien programmé', order: 5, color: '#8B5CF6', icon: 'Calendar' },
  { code: 'OTHER_INTERVIEW_PENDING', name: 'Autre entretien en attente', description: 'Autre entretien programmé', order: 6, color: '#7C3AED', icon: 'Calendar' },
  { code: 'TECHNICAL_TEST_PENDING', name: 'Test technique en cours', description: 'Test technique en cours', order: 7, color: '#6366F1', icon: 'FileText' },
  { code: 'OFFER_RECEIVED', name: 'Offre reçue', description: 'Offre d\'emploi reçue', order: 8, color: '#10B981', icon: 'CheckCircle' },
  { code: 'ACCEPTED_AFTER_INTERVIEW', name: 'Retenue', description: 'Retenue après entretien', order: 9, color: '#059669', icon: 'CheckCircle2' },
  { code: 'REJECTED_WITHOUT_INTERVIEW', name: 'Non retenue (sans entretien)', description: 'Non retenue sans entretien', order: 10, color: '#EF4444', icon: 'X' },
  { code: 'REJECTED_AFTER_INTERVIEW', name: 'Non retenue (après entretien)', description: 'Non retenue après entretien', order: 11, color: '#DC2626', icon: 'XCircle' },
  { code: 'WITHDRAWN', name: 'Candidature retirée', description: 'Candidature retirée par le candidat', order: 12, color: '#6B7280', icon: 'Archive' },
];

const INTERVIEW_STATUSES = [
  { code: 'SCHEDULED', name: 'Programmé', description: 'Entretien programmé', order: 1, color: '#3B82F6', icon: 'Calendar' },
  { code: 'COMPLETED', name: 'Terminé', description: 'Entretien passé', order: 2, color: '#10B981', icon: 'CheckCircle' },
  { code: 'FEEDBACK_PENDING', name: 'En attente de retour', description: 'En attente de retour', order: 3, color: '#F59E0B', icon: 'Clock' },
  { code: 'CANCELLED', name: 'Annulé', description: 'Entretien annulé', order: 4, color: '#EF4444', icon: 'XCircle' },
  { code: 'RESCHEDULED', name: 'Reporté', description: 'Entretien reporté', order: 5, color: '#8B5CF6', icon: 'CalendarClock' },
];

const FOLLOWUP_STATUSES = [
  { code: 'PENDING', name: 'En attente', description: 'Relance en attente', order: 1, color: '#3B82F6', icon: 'Clock' },
  { code: 'POSITIVE_RESPONSE', name: 'Réponse positive', description: 'Retour positif reçu', order: 2, color: '#10B981', icon: 'CheckCircle' },
  { code: 'NEGATIVE_RESPONSE', name: 'Réponse négative', description: 'Retour négatif reçu', order: 3, color: '#EF4444', icon: 'XCircle' },
  { code: 'NO_RESPONSE', name: 'Aucun retour', description: 'Aucun retour reçu', order: 4, color: '#F59E0B', icon: 'AlertCircle' },
  { code: 'PLANNED', name: 'Prévue', description: 'Relance prévisionnelle', order: 5, color: '#8B5CF6', icon: 'Calendar' },
];

function generateStatusModel(modelName, type) {
  return `
// ============================================
// 📊 ${modelName} - Statuts Personnalisables
// ============================================

model ${modelName} {
  id            String    @id @default(cuid())
  code          String    @unique // Code unique du statut (ex: CANDIDATE_PENDING)
  name          String              // Nom affiché (ex: "Candidaté")
  description   String?             // Description du statut
  order         Int                 // Ordre d'affichage
  color         String?             // Couleur hexadécimale (ex: "#3B82F6")
  icon          String?             // Nom de l'icône (ex: "Clock")
  
  // Personnalisation
  userId        String?             // null = statut système, String = statut utilisateur
  isPredefined  Boolean   @default(false) // true = statut système, false = statut utilisateur
  isActive      Boolean   @default(true)   // Statut actif/inactif
  
  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  ${type === 'Application' ? 'applications' : type === 'Interview' ? 'interviews' : 'followUps'}    ${type}[] // Relations vers les entités
  
  @@index([code])
  @@index([userId])
  @@index([isPredefined])
  @@index([isActive])
  @@index([order])
}
`;
}

function generateSeedData(modelName, statuses) {
  const seedData = statuses.map(status => {
    return `    {
      code: '${status.code}',
      name: '${status.name}',
      description: '${status.description}',
      order: ${status.order},
      color: '${status.color}',
      icon: '${status.icon}',
      userId: null,
      isPredefined: true,
      isActive: true,
    }`;
  }).join(',\n');

  return `// Seed ${modelName} - Statuts système par défaut
  await prisma.${modelName.toLowerCase()}.createMany({
    data: [
${seedData}
    ],
    skipDuplicates: true,
  });`;
}

async function readSchema() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Schéma Prisma non trouvé : ${SCHEMA_PATH}`);
  }
  return fs.readFileSync(SCHEMA_PATH, 'utf-8');
}

async function writeSchema(content) {
  fs.writeFileSync(SCHEMA_PATH, content, 'utf-8');
}

async function addStatusModelsToSchema() {
  console.log('📝 Lecture du schéma Prisma...');
  let schema = await readSchema();

  // Vérifier si les modèles existent déjà (vérifier le modèle exact, pas ApplicationStatusHistory)
  if (schema.includes('model ApplicationStatus {') && !schema.includes('model ApplicationStatusHistory')) {
    console.log('⚠️  Le modèle ApplicationStatus existe déjà dans le schéma');
    return false;
  }
  // Vérifier plus précisément avec regex
  const applicationStatusModelPattern = /^model ApplicationStatus\s*\{/m;
  if (applicationStatusModelPattern.test(schema)) {
    console.log('⚠️  Le modèle ApplicationStatus existe déjà dans le schéma');
    return false;
  }

  // Trouver où insérer les nouveaux modèles (après les enums)
  const enumEndPattern = /enum InterviewStatus \{[\s\S]*?\n\}/;
  const enumEndMatch = schema.match(enumEndPattern);
  
  if (!enumEndMatch) {
    throw new Error('Impossible de trouver la fin des enums dans le schéma');
  }

  const insertPosition = enumEndMatch.index + enumEndMatch[0].length;

  // Générer les modèles de statuts
  const statusModels = 
    generateStatusModel('ApplicationStatus', 'Application') +
    generateStatusModel('InterviewStatus', 'Interview') +
    generateStatusModel('FollowUpStatus', 'FollowUp');

  // Insérer les modèles après les enums
  schema = schema.slice(0, insertPosition) + '\n' + statusModels + '\n' + schema.slice(insertPosition);

  // Modifier les modèles Application, Interview, FollowUp pour utiliser les relations
  // Au lieu de modifier directement, on va créer un fichier de migration séparé
  // car cela nécessite aussi de modifier les champs status

  console.log('💾 Écriture du schéma modifié...');
  await writeSchema(schema);

  return true;
}

async function generateSeedScript() {
  const seedPath = path.join(__dirname, '../../../scripts/database/seed-statuses.js');
  
  const seedContent = `#!/usr/bin/env node

/**
 * Script de Seed - Statuts Système par Défaut
 * 
 * Ce script crée les statuts système par défaut dans la base de données.
 * 
 * Usage:
 *   node scripts/database/seed-statuses.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedStatuses() {
  console.log('🌱 Seed des statuts système par défaut...\\n');

  try {
${generateSeedData('ApplicationStatus', APPLICATION_STATUSES)}

    console.log('✅ ApplicationStatus créés');

${generateSeedData('InterviewStatus', INTERVIEW_STATUSES)}

    console.log('✅ InterviewStatus créés');

${generateSeedData('FollowUpStatus', FOLLOWUP_STATUSES)}

    console.log('✅ FollowUpStatus créés');

    console.log('\\n✅ Seed terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seed :', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedStatuses();
}

module.exports = { seedStatuses };
`;

  fs.writeFileSync(seedPath, seedContent, 'utf-8');
  fs.chmodSync(seedPath, '755');
  console.log(`✅ Script de seed créé : ${seedPath}`);
}

async function main() {
  console.log('🚀 Script de Migration - Phase 2 : Création des Tables\n');
  console.log('='.repeat(60));
  console.log('⚠️  ATTENTION : Ce script va modifier le schéma Prisma');
  console.log('⚠️  Assurez-vous d\'avoir fait un backup avant de continuer\n');
  console.log('='.repeat(60));

  try {
    // 1. Ajouter les modèles au schéma
    console.log('\n📝 Étape 1 : Ajout des modèles au schéma Prisma...');
    const schemaModified = await addStatusModelsToSchema();
    
    if (!schemaModified) {
      console.log('⚠️  Les modèles existent déjà, passage à l\'étape suivante...');
    } else {
      console.log('✅ Modèles ajoutés au schéma');
    }

    // 2. Générer le script de seed
    console.log('\n📝 Étape 2 : Génération du script de seed...');
    await generateSeedScript();
    console.log('✅ Script de seed généré');

    // 3. Instructions pour la suite
    console.log('\n' + '='.repeat(60));
    console.log('✅ Phase 2 terminée !');
    console.log('\n📋 Prochaines étapes :');
    console.log('   1. Vérifier le schéma Prisma modifié : backend/prisma/schema.prisma');
    console.log('   2. Exécuter : npx prisma format');
    console.log('   3. Exécuter : npx prisma generate');
    console.log('   4. Exécuter : npx prisma db push (ou make db-push-all)');
    console.log('   5. Exécuter le seed : node scripts/database/seed-statuses.js');
    console.log('   6. Passer à la Phase 3 : Migration des données enum → tables');
    console.log('\n💡 Pour annuler les modifications :');
    console.log('   git checkout backend/prisma/schema.prisma');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur fatale :', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { addStatusModelsToSchema, generateSeedScript };

