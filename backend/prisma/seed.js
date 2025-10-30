/**
 * Seed des données prédéfinies pour JobbingTrack
 * Crée les listes personnalisables par défaut (plateformes, types, etc.)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding des données prédéfinies JobbingTrack...\n');

  // ============================================
  // 1. PLATEFORMES DE CANDIDATURE
  // ============================================
  console.log('📱 Plateformes de candidature...');
  const platforms = [
    { name: 'LinkedIn', icon: '💼', url: 'https://linkedin.com' },
    { name: 'Indeed', icon: '🔍', url: 'https://indeed.fr' },
    { name: 'Welcome to the Jungle', icon: '🌴', url: 'https://welcometothejungle.com' },
    { name: 'Pôle Emploi', icon: '🏢', url: 'https://pole-emploi.fr' },
    { name: 'Apec', icon: '👔', url: 'https://apec.fr' },
    { name: 'HelloWork', icon: '👋', url: 'https://hellowork.com' },
    { name: 'Glassdoor', icon: '🚪', url: 'https://glassdoor.fr' },
    { name: 'Monster', icon: '👾', url: 'https://monster.fr' },
    { name: 'LesJeudis', icon: '📅', url: 'https://lesjeudis.com' },
    { name: 'Cadremploi', icon: '💼', url: 'https://cadremploi.fr' },
    { name: 'Site Entreprise', icon: '🌐', url: null },
    { name: 'Cooptation', icon: '🤝', url: null },
    { name: 'Autre', icon: '📌', url: null }
  ];

  for (const platform of platforms) {
    await prisma.platform.upsert({
      where: { userId_name: { userId: null, name: platform.name } },
      update: {},
      create: { ...platform, isPredefined: true }
    });
  }
  console.log(`  ✅ ${platforms.length} plateformes créées\n`);

  // ============================================
  // 2. TYPES DE RELANCE
  // ============================================
  console.log('🔄 Types de relance...');
  const followUpTypes = [
    { name: 'Première relance', icon: '1️⃣' },
    { name: 'Deuxième relance', icon: '2️⃣' },
    { name: 'Relance après entretien', icon: '💼' },
    { name: 'Relance urgente', icon: '⚡' },
    { name: 'Relance de courtoisie', icon: '🙏' },
    { name: 'Autre', icon: '📝' }
  ];

  for (const type of followUpTypes) {
    await prisma.followUpType.upsert({
      where: { userId_name: { userId: null, name: type.name } },
      update: {},
      create: { ...type, isPredefined: true }
    });
  }
  console.log(`  ✅ ${followUpTypes.length} types de relance créés\n`);

  // ============================================
  // 3. MOYENS DE RELANCE
  // ============================================
  console.log('📧 Moyens de relance...');
  const followUpMethods = [
    { name: 'Email', icon: '📧' },
    { name: 'Téléphone', icon: '📞' },
    { name: 'LinkedIn', icon: '💼' },
    { name: 'SMS', icon: '💬' },
    { name: 'Courrier', icon: '✉️' },
    { name: 'En personne', icon: '🤝' },
    { name: 'Autre', icon: '📌' }
  ];

  for (const method of followUpMethods) {
    await prisma.followUpMethod.upsert({
      where: { userId_name: { userId: null, name: method.name } },
      update: {},
      create: { ...method, isPredefined: true }
    });
  }
  console.log(`  ✅ ${followUpMethods.length} moyens de relance créés\n`);

  // ============================================
  // 4. TYPES D'ENTRETIEN
  // ============================================
  console.log('💼 Types d\'entretien...');
  const interviewTypes = [
    { name: 'Entretien RH', icon: '👤' },
    { name: 'Entretien Technique', icon: '💻' },
    { name: 'Entretien Manager', icon: '👔' },
    { name: 'Entretien Équipe', icon: '👥' },
    { name: 'Entretien Dirigeant', icon: '🎯' },
    { name: 'Test Technique', icon: '🧪' },
    { name: 'Case Study', icon: '📊' },
    { name: 'Assessment Center', icon: '🏢' },
    { name: 'Autre', icon: '📝' }
  ];

  for (const type of interviewTypes) {
    await prisma.interviewType.upsert({
      where: { userId_name: { userId: null, name: type.name } },
      update: {},
      create: { ...type, isPredefined: true }
    });
  }
  console.log(`  ✅ ${interviewTypes.length} types d\'entretien créés\n`);

  // ============================================
  // 5. STYLES D'ENTRETIEN
  // ============================================
  console.log('🏢 Styles d\'entretien...');
  const interviewStyles = [
    { name: 'Présentiel', icon: '🏢' },
    { name: 'Visioconférence', icon: '💻' },
    { name: 'Téléphone', icon: '📞' },
    { name: 'Hybride', icon: '🔄' }
  ];

  for (const style of interviewStyles) {
    await prisma.interviewStyle.upsert({
      where: { userId_name: { userId: null, name: style.name } },
      update: {},
      create: { ...style, isPredefined: true }
    });
  }
  console.log(`  ✅ ${interviewStyles.length} styles d\'entretien créés\n`);

  // ============================================
  // 6. TYPES D'ÉVÉNEMENT
  // ============================================
  console.log('📅 Types d\'événement...');
  const eventTypes = [
    { name: 'Entretien', color: '#3B82F6', icon: '💼' },
    { name: 'Relance', color: '#10B981', icon: '🔄' },
    { name: 'Appel', color: '#8B5CF6', icon: '📞' },
    { name: 'Deadline', color: '#EF4444', icon: '⏰' },
    { name: 'Salon emploi', color: '#F59E0B', icon: '🎪' },
    { name: 'Networking', color: '#EC4899', icon: '🤝' },
    { name: 'Formation', color: '#06B6D4', icon: '📚' },
    { name: 'Autre', color: '#6B7280', icon: '📌' }
  ];

  for (const type of eventTypes) {
    await prisma.eventType.upsert({
      where: { userId_name: { userId: null, name: type.name } },
      update: {},
      create: { ...type, isPredefined: true }
    });
  }
  console.log(`  ✅ ${eventTypes.length} types d\'événement créés\n`);

  // ============================================
  // 7. TYPES D'APPEL
  // ============================================
  console.log('📞 Types d\'appel...');
  const callTypes = [
    { name: 'Appel sortant', icon: '📤' },
    { name: 'Appel entrant', icon: '📥' },
    { name: 'Appel manqué', icon: '❌' },
    { name: 'Rappel programmé', icon: '⏰' },
    { name: 'Autre', icon: '📞' }
  ];

  for (const type of callTypes) {
    await prisma.callType.upsert({
      where: { userId_name: { userId: null, name: type.name } },
      update: {},
      create: { ...type, isPredefined: true }
    });
  }
  console.log(`  ✅ ${callTypes.length} types d\'appel créés\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed terminé avec succès !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Récapitulatif:');
  console.log(`  - ${platforms.length} plateformes de candidature`);
  console.log(`  - ${followUpTypes.length} types de relance`);
  console.log(`  - ${followUpMethods.length} moyens de relance`);
  console.log(`  - ${interviewTypes.length} types d'entretien`);
  console.log(`  - ${interviewStyles.length} styles d'entretien`);
  console.log(`  - ${eventTypes.length} types d'événement`);
  console.log(`  - ${callTypes.length} types d'appel\n`);
  console.log('💡 Les utilisateurs peuvent maintenant ajouter leurs propres valeurs !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
