#!/usr/bin/env node
/**
 * 🎲 Script de génération de données de test cohérentes
 * Génère des données réalistes pour tous les services JobbingTrack
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://jobbingtrack:jobbingtrack123@localhost:5432/jobbingtrack?schema=public'
    }
  }
});

/** Détecte si l’erreur Prisma est « Unknown argument isTestData » (ancienne image api-gateway). */
function isTestDataUnknownError(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  return msg.includes('Unknown argument') && msg.includes('isTestData');
}

// Configuration par défaut
const DEFAULT_CONFIG = {
  users: 3,
  companies: 10,
  applications: 20,
  contacts: 15,
  interviews: 8,
  followups: 12,
  calls: 10,
  events: 20,
  deletedItems: 5,
  archivedItems: 3
};

// Presets optimisés pour différents types de tests
const PRESETS = {
  'e2e': {
    users: 4,
    companies: 8,
    applications: 12,
    contacts: 10,
    interviews: 4,
    followups: 6,
    calls: 4,
    events: 8,
    deletedItems: 2,
    archivedItems: 2,
    description: 'Données minimales pour tests end-to-end'
  },
  'api': {
    users: 3,
    companies: 6,
    applications: 15,
    contacts: 8,
    interviews: 3,
    followups: 5,
    calls: 3,
    events: 6,
    deletedItems: 1,
    archivedItems: 1,
    description: 'Données pour tests des endpoints API'
  },
  'performance': {
    users: 5,
    companies: 25,
    applications: 100,
    contacts: 50,
    interviews: 15,
    followups: 25,
    calls: 20,
    events: 40,
    deletedItems: 5,
    archivedItems: 5,
    description: 'Beaucoup de données pour tests de charge'
  },
  'security': {
    users: 6,
    companies: 12,
    applications: 30,
    contacts: 20,
    interviews: 8,
    followups: 12,
    calls: 8,
    events: 15,
    deletedItems: 3,
    archivedItems: 3,
    description: 'Données variées pour tests de sécurité'
  },
  'mobile': {
    users: 3,
    companies: 10,
    applications: 20,
    contacts: 12,
    interviews: 5,
    followups: 8,
    calls: 5,
    events: 10,
    deletedItems: 2,
    archivedItems: 2,
    description: 'Données optimisées pour tests mobile'
  },
  'complete': {
    users: 8,
    companies: 20,
    applications: 50,
    contacts: 35,
    interviews: 15,
    followups: 25,
    calls: 15,
    events: 30,
    deletedItems: 5,
    archivedItems: 5,
    description: 'Suite complète pour validation finale'
  },
  'minimal': {
    users: 2,
    companies: 5,
    applications: 5,
    contacts: 5,
    interviews: 2,
    followups: 3,
    calls: 2,
    events: 5,
    deletedItems: 1,
    archivedItems: 1,
    description: 'Configuration minimale pour tests rapides'
  },
  'demo': {
    users: 1,
    companies: 8,
    applications: 15,
    contacts: 12,
    interviews: 6,
    followups: 8,
    calls: 5,
    events: 15,
    deletedItems: 2,
    archivedItems: 2,
    description: 'Configuration pour démonstration client'
  }
};

// Données de test réalistes
const COMPANIES_DATA = [
  { name: 'Google', website: 'https://google.com', industry: 'Technologie', size: 'ENTERPRISE', location: 'Mountain View, CA' },
  { name: 'Microsoft', website: 'https://microsoft.com', industry: 'Technologie', size: 'ENTERPRISE', location: 'Redmond, WA' },
  { name: 'Amazon', website: 'https://amazon.com', industry: 'E-commerce', size: 'ENTERPRISE', location: 'Seattle, WA' },
  { name: 'Meta', website: 'https://meta.com', industry: 'Réseaux sociaux', size: 'ENTERPRISE', location: 'Menlo Park, CA' },
  { name: 'Apple', website: 'https://apple.com', industry: 'Technologie', size: 'ENTERPRISE', location: 'Cupertino, CA' },
  { name: 'Netflix', website: 'https://netflix.com', industry: 'Streaming', size: 'LARGE', location: 'Los Gatos, CA' },
  { name: 'Spotify', website: 'https://spotify.com', industry: 'Musique', size: 'LARGE', location: 'Stockholm, Suède' },
  { name: 'Airbnb', website: 'https://airbnb.com', industry: 'Voyage', size: 'LARGE', location: 'San Francisco, CA' },
  { name: 'Stripe', website: 'https://stripe.com', industry: 'Fintech', size: 'LARGE', location: 'San Francisco, CA' },
  { name: 'Datadog', website: 'https://datadoghq.com', industry: 'Monitoring', size: 'LARGE', location: 'New York, NY' },
  { name: 'GitLab', website: 'https://gitlab.com', industry: 'DevOps', size: 'LARGE', location: 'Remote' },
  { name: 'Notion', website: 'https://notion.so', industry: 'Productivité', size: 'MEDIUM', location: 'San Francisco, CA' },
  { name: 'Figma', website: 'https://figma.com', industry: 'Design', size: 'MEDIUM', location: 'San Francisco, CA' },
  { name: 'Vercel', website: 'https://vercel.com', industry: 'Cloud', size: 'MEDIUM', location: 'San Francisco, CA' },
  { name: 'Supabase', website: 'https://supabase.com', industry: 'Backend as a Service', size: 'SMALL', location: 'Remote' }
];

// Boîtes d'intérim pour tests (companyType TEMP_AGENCY)
const TEMP_AGENCY_DATA = [
  { name: 'Randstad', website: 'https://randstad.fr', industry: 'Intérim', size: 'LARGE', location: 'Paris, France' },
  { name: 'Manpower', website: 'https://manpower.fr', industry: 'Intérim', size: 'LARGE', location: 'Lyon, France' }
];

const POSITIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Product Manager',
  'Engineering Manager',
  'Solutions Architect',
  'Technical Lead',
  'Staff Engineer',
  'Principal Engineer'
];

const STATUSES = [
  'DRAFT',
  'SENT',
  'IN_REVIEW',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'OFFER_RECEIVED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'NO_RESPONSE'
];

const FIRST_NAMES = ['Pavel', 'Marie', 'Thomas', 'Sophie', 'Alexandre', 'Camille', 'Nicolas', 'Emma', 'Julien', 'Léa'];
const LAST_NAMES = ['Delhomme', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Durand', 'Leroy', 'Moreau'];

async function cleanExistingData() {
  console.log('🧹 Suppression des données existantes...');

  try {
    // Supprimer dans l'ordre inverse des dépendances (pas de Activity dans le schéma partagé)
    await prisma.followUp.deleteMany({});
    await prisma.call.deleteMany({});
    await prisma.interview.deleteMany({});
    try { await prisma.activity.deleteMany({}); } catch (_) { /* Activity absent du schéma */ }
    await prisma.applicationContact.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { startsWith: 'user' } } });

    console.log('✅ Données existantes supprimées');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
}

async function main() {
  console.log('🎲 Génération de données de test cohérentes...');
  console.log('='.repeat(50));

  // Récupérer la configuration depuis les arguments ou presets
  const args = process.argv.slice(2);
  const presetName = args.find(arg => !arg.startsWith('--') && PRESETS[arg]);
  const configArg = args.find(arg => !arg.startsWith('--') && arg !== presetName);
  const isClean = args.includes('--clean');
  const tagArg = args.find(arg => arg.startsWith('--tag='));
  const testTag = tagArg ? tagArg.split('=')[1] : `test-${Date.now()}`;

  let config = DEFAULT_CONFIG;

  if (presetName && PRESETS[presetName]) {
    config = PRESETS[presetName];
    console.log(`🎯 Preset utilisé: ${presetName}`);
    console.log(`📝 Description: ${PRESETS[presetName].description}`);
  } else if (presetName) {
    console.log(`⚠️ Preset "${presetName}" non reconnu, utilisation de la configuration par défaut`);
  }

  // Appliquer les modifications personnalisées si fournies
  if (configArg) {
    try {
      const customConfig = JSON.parse(configArg);
      config = { ...config, ...customConfig };
      console.log('🔧 Configuration personnalisée appliquée');
    } catch (error) {
      console.log('⚠️ Configuration personnalisée invalide, utilisation de la configuration par défaut');
    }
  }

  if (isClean) {
    console.log('🧹 Mode nettoyage activé - Suppression des données existantes');
  }

  console.log('📋 Configuration finale:', config);
  console.log(`🏷️  Tag de test: ${testTag}`);
  console.log('');

  try {
    // Nettoyer les données existantes si demandé
    if (isClean) {
      console.log('🧹 Nettoyage des données existantes...');
      await cleanExistingData();
    }
    // 1. Créer les utilisateurs
    console.log('👥 Création des utilisateurs...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user1Email = process.env.TEST_USER_EMAIL || 'user1@jobbingtrack.com';
    const user1Password = process.env.TEST_USER_PASSWORD || 'password123';
    const user1HashedPassword = user1Password === 'password123' ? hashedPassword : await bcrypt.hash(user1Password, 10);

    const users = [];
    for (let i = 0; i < config.users; i++) {
      const email = i === 0 ? user1Email : `user${i + 1}@jobbingtrack.com`;
      const password = i === 0 ? user1HashedPassword : hashedPassword;
      const user = await prisma.user.upsert({
        where: { email },
        update: { isTestData: true, ...(i === 0 ? { password: user1HashedPassword } : {}) },
        create: {
          email,
          password,
          firstName: FIRST_NAMES[i % FIRST_NAMES.length],
          lastName: LAST_NAMES[i % LAST_NAMES.length],
          phone: `+3361234567${i}`,
          role: i === 0 ? 'SUPER_ADMIN' : (i === 1 ? 'ADMIN' : 'USER'),
          isTestData: true
        }
      });
      users.push(user);
    }
    console.log(`   ✅ ${users.length} utilisateurs créés (user1: ${user1Email})`);

    // Utiliser l’admin qui a lancé la génération comme propriétaire (Suivi intérim visible).
    // La gateway peut passer un id factice (ex. user-123) ou un email (ex. user@jobbingtrack.com) alors que le seed crée admin@jobbingtrack.com.
    let companyOwners = users;
    const ownerId = process.env.TEST_DATA_OWNER_ID;
    const ownerEmail = process.env.TEST_DATA_OWNER_EMAIL;
    if (ownerId || ownerEmail) {
      let owner = ownerId ? await prisma.user.findUnique({ where: { id: ownerId } }).catch(() => null) : null;
      if (!owner && ownerEmail) {
        owner = await prisma.user.findUnique({ where: { email: ownerEmail } }).catch(() => null);
      }
      if (!owner && process.env.ADMIN_EMAIL) {
        owner = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } }).catch(() => null);
      }
      if (!owner) {
        owner = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }).catch(() => null);
      }
      if (owner) {
        companyOwners = [owner];
        console.log(`   👤 Données rattachées à l’admin: ${owner.email}`);
      }
    }

    // 2. Créer les entreprises (fallback si ancienne image api-gateway sans isTestData dans le schéma)
    let skipIsTestData = false;
    console.log('🏢 Création des entreprises...');
    const companies = [];
    for (let i = 0; i < Math.min(config.companies, COMPANIES_DATA.length); i++) {
      const companyData = COMPANIES_DATA[i];
      const { name, website, industry, size, location } = companyData;
      const base = {
        name,
        website,
        industry,
        size,
        location,
        userId: companyOwners[i % companyOwners.length].id,
        description: `[TEST_DATA_TAG:${testTag}]`,
        companyType: 'EMPLOYER',
        ...(skipIsTestData ? {} : { isTestData: true })
      };
      try {
        const company = await prisma.company.create({ data: base });
        companies.push(company);
      } catch (err) {
        if (isTestDataUnknownError(err)) {
          skipIsTestData = true;
          console.warn('⚠️ Schéma Prisma sans isTestData (rebuild api-gateway pour le marquage). Génération sans isTestData.');
          const company = await prisma.company.create({
            data: { name, website, industry, size, location, userId: base.userId, description: base.description, companyType: base.companyType }
          });
          companies.push(company);
        } else {
          throw err;
        }
      }
    }
    for (const agencyData of TEMP_AGENCY_DATA) {
      const { name, website, industry, size, location } = agencyData;
      const base = {
        name,
        website,
        industry,
        size,
        location,
        userId: companyOwners[0].id,
        description: `[TEST_DATA_TAG:${testTag}]`,
        companyType: 'TEMP_AGENCY',
        ...(skipIsTestData ? {} : { isTestData: true })
      };
      try {
        const agency = await prisma.company.create({ data: base });
        companies.push(agency);
      } catch (err) {
        if (isTestDataUnknownError(err)) {
          skipIsTestData = true;
          const agency = await prisma.company.create({
            data: { name, website, industry, size, location, userId: base.userId, description: base.description, companyType: base.companyType }
          });
          companies.push(agency);
        } else {
          throw err;
        }
      }
    }
    console.log(`   ✅ ${companies.length} entreprises créées (dont ${TEMP_AGENCY_DATA.length} boîtes d'intérim)`);

    // 3. Créer les contacts
    console.log('👤 Création des contacts...');
    const contacts = [];
    for (let i = 0; i < config.contacts; i++) {
      const user = users[i % users.length];
      const company = companies[i % companies.length];
      const contactData = {
        userId: user.id,
        firstName: FIRST_NAMES[i % FIRST_NAMES.length],
        lastName: LAST_NAMES[(i + 3) % LAST_NAMES.length],
        position: ['Recruteur', 'RH Manager', 'Tech Lead', 'CEO', 'CTO'][i % 5],
        email: `contact${i + 1}@${company.name.toLowerCase().replace(/\s/g, '')}.com`,
        phone: `+3361234${1000 + i}`,
        linkedinUrl: `https://linkedin.com/in/contact${i + 1}`,
        notes: `[TEST_DATA_TAG:${testTag}]`,
        ...(skipIsTestData ? {} : { isTestData: true })
      };
      let contact;
      try {
        contact = await prisma.contact.create({ data: contactData });
      } catch (err) {
        if (isTestDataUnknownError(err)) {
          skipIsTestData = true;
          const { isTestData, ...rest } = contactData;
          contact = await prisma.contact.create({ data: rest });
        } else {
          throw err;
        }
      }
      
      // Lier le contact à l'entreprise via la table de jonction
      try {
        await prisma.contactCompany.create({
          data: {
            contactId: contact.id,
            companyId: company.id
          }
        });
      } catch (error) {
        // Ignorer les erreurs de duplication
      }
      contacts.push(contact);
    }
    console.log(`   ✅ ${contacts.length} contacts créés`);

    // Récupérer ou créer un statut de candidature (ApplicationStatus)
    let appStatus = await prisma.applicationStatus.findFirst({ where: { isActive: true } });
    if (!appStatus) {
      appStatus = await prisma.applicationStatus.create({
        data: { code: 'DRAFT', name: 'Brouillon', order: 0, isPredefined: true, isActive: true }
      });
    }
    const applicationStatusId = appStatus.id;

    // 4. Créer les candidatures (même propriétaire que les entreprises pour visibilité Suivi intérim)
    console.log('📋 Création des candidatures...');
    const tempAgencies = companies.filter(c => c.companyType === 'TEMP_AGENCY');
    const applications = [];
    for (let i = 0; i < config.applications; i++) {
      const owner = companyOwners[i % companyOwners.length];
      const company = companies[i % companies.length];
      const position = POSITIONS[i % POSITIONS.length];
      // Au moins une candidature par boîte d’intérim + répartition régulière pour le Suivi intérim
      let agencyId = null;
      if (tempAgencies.length > 0) {
        if (i < tempAgencies.length) {
          agencyId = tempAgencies[i].id;
        } else if (i % 2 === 0) {
          agencyId = tempAgencies[i % tempAgencies.length].id;
        }
      }

      const applicationDate = new Date();
      applicationDate.setDate(applicationDate.getDate() - Math.floor(Math.random() * 60));

      const appData = {
        userId: owner.id,
        companyId: company.id,
        agencyId: agencyId || undefined,
        position,
        description: `Poste de ${position} chez ${company.name}. Opportunité intéressante dans le domaine de ${company.industry}.`,
        location: ['Remote', 'Paris, France', 'Lyon, France', 'Marseille, France', company.location][i % 5],
        contractType: ['CDI', 'CDD', 'STAGE', 'FREELANCE', 'CDI'][i % 5],
        applicationDate,
        applicationType: 'OFFRE',
        statusId: applicationStatusId,
        notes: `Candidature envoyée le ${applicationDate.toLocaleDateString('fr-FR')}. En attente de retour.\n[TEST_DATA_TAG:${testTag}]`,
        ...(skipIsTestData ? {} : { isTestData: true })
      };
      let application;
      try {
        application = await prisma.application.create({ data: appData });
      } catch (err) {
        if (isTestDataUnknownError(err)) {
          skipIsTestData = true;
          const { isTestData, ...rest } = appData;
          application = await prisma.application.create({ data: rest });
        } else {
          throw err;
        }
      }
      applications.push(application);

      // Créer des activités pour chaque candidature (Activity n'existe peut-être pas dans le schéma partagé)
      try {
        await prisma.activity.create({
          data: {
            applicationId: application.id,
            type: 'APPLICATION_CREATED',
            description: `Candidature créée pour ${position} chez ${company.name}`
          }
        });
      } catch (_) { /* Activity peut être absent du schéma */ }

      try {
        await prisma.activity.create({
          data: {
            applicationId: application.id,
            type: 'STATUS_CHANGED',
            description: `Statut initial`
          }
        });
      } catch (_) { /* ignore */ }
    }
    console.log(`   ✅ ${applications.length} candidatures créées`);

    // 5. Lier des contacts aux candidatures
    console.log('🔗 Liaison contacts-candidatures...');
    let linkedContacts = 0;
    for (let i = 0; i < Math.min(applications.length, contacts.length); i++) {
      try {
        await prisma.applicationContact.create({
          data: {
            applicationId: applications[i].id,
            contactId: contacts[i].id,
            role: ['Recruteur', 'Manager', 'RH', 'Tech Lead'][i % 4],
            isPrimary: i % 3 === 0
          }
        });
        linkedContacts++;
      } catch (error) {
        // Ignorer les erreurs de duplication
      }
    }
    console.log(`   ✅ ${linkedContacts} liaisons créées`);

    // Récupérer ou créer les statuts d'entretien (InterviewStatus)
    const interviewStatusCodes = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
    const interviewStatusIds = {};
    for (const code of interviewStatusCodes) {
      let s = await prisma.interviewStatus.findFirst({ where: { code } });
      if (!s) {
        s = await prisma.interviewStatus.create({
          data: { code, name: code.charAt(0) + code.slice(1).toLowerCase(), order: interviewStatusCodes.indexOf(code), isPredefined: true, isActive: true }
        });
      }
      interviewStatusIds[code] = s.id;
    }

    // 6. Créer des entretiens
    console.log('🎤 Création des entretiens...');
    const interviews = [];
    for (let i = 0; i < Math.min(config.interviews, applications.length); i++) {
      const application = applications[i];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 14) - 7);
      
      const interview = await prisma.interview.create({
        data: {
          userId: application.userId,
          applicationId: application.id,
          companyId: application.companyId,
          interviewDate: scheduledDate,
          estimatedDuration: [30, 45, 60, 90][i % 4],
          location: ['Visioconférence', 'Bureau Paris', 'Téléphone', 'Remote'][i % 4],
          videoLink: i % 2 === 0 ? 'https://meet.google.com/abc-defg-hij' : undefined,
          notes: `Entretien technique prévu\n[TEST_DATA_TAG:${testTag}]`,
          statusId: interviewStatusIds[['SCHEDULED', 'COMPLETED', 'CANCELLED'][i % 3]],
          ...(skipIsTestData ? {} : { isTestData: true })
        }
      });
      interviews.push(interview);

      try {
        await prisma.activity.create({
          data: {
            applicationId: application.id,
            type: 'INTERVIEW_SCHEDULED',
            description: `Entretien planifié le ${scheduledDate.toLocaleDateString('fr-FR')}`
          }
        });
      } catch (_) { /* Activity absent du schéma */ }
    }
    console.log(`   ✅ ${interviews.length} entretiens créés`);

    // Récupérer ou créer les statuts de relance (FollowUpStatus)
    const followUpStatusCodes = ['PENDING', 'POSITIVE_RESPONSE'];
    const followUpStatusIds = {};
    for (const code of followUpStatusCodes) {
      let s = await prisma.followUpStatus.findFirst({ where: { code } });
      if (!s) {
        s = await prisma.followUpStatus.create({
          data: { code, name: code === 'PENDING' ? 'En attente' : 'Réponse positive', order: followUpStatusCodes.indexOf(code), isPredefined: true, isActive: true }
        });
      }
      followUpStatusIds[code] = s.id;
    }

    // 7. Créer des relances
    console.log('📧 Création des relances...');
    const followups = [];
    for (let i = 0; i < Math.min(config.followups, applications.length); i++) {
      const application = applications[i];
      const contact = contacts[i % contacts.length];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 14));
      
      const followup = await prisma.followUp.create({
        data: {
          userId: application.userId,
          applicationId: application.id,
          companyId: application.companyId,
          followUpDate: scheduledDate,
          statusId: followUpStatusIds[i % 3 === 0 ? 'POSITIVE_RESPONSE' : 'PENDING'],
          response: i % 3 === 0 ? 'Réponse positive, entretien prévu' : null,
          notes: `Suivi candidature ${application.position}\nBonjour,\n\nJe me permets de revenir vers vous concernant ma candidature pour le poste de ${application.position}.\n\nCordialement\n[TEST_DATA_TAG:${testTag}]`,
          ...(skipIsTestData ? {} : { isTestData: true })
        }
      });
      followups.push(followup);
    }
    console.log(`   ✅ ${followups.length} relances créées`);

    // 8. Créer des appels
    console.log('📞 Création des appels...');
    const calls = [];
    for (let i = 0; i < Math.min(config.calls, applications.length); i++) {
      const application = applications[i];
      const contact = contacts[i % contacts.length];
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - Math.floor(Math.random() * 30));
      
      const call = await prisma.call.create({
        data: {
          userId: application.userId,
          applicationId: application.id,
          companyId: application.companyId,
          contactId: contact.id,
          callDate: callDate,
          duration: i % 2 === 0 ? Math.floor(Math.random() * 30) + 5 : null, // 5-35 minutes
          subject: `Appel concernant la candidature ${application.position}`,
          notes: `Appel concernant la candidature ${application.position}\n[TEST_DATA_TAG:${testTag}]`,
          status: ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'][i % 4],
          ...(skipIsTestData ? {} : { isTestData: true })
        }
      });
      calls.push(call);
    }
    console.log(`   ✅ ${calls.length} appels créés`);

    // 9. Créer des événements automatiquement liés
    console.log('📅 Création des événements...');
    const events = [];
    
    // Événements pour les candidatures (date de candidature)
    for (let i = 0; i < Math.min(Math.floor(config.events * 0.3), applications.length); i++) {
      const application = applications[i];
      const eventDate = new Date(application.applicationDate);
      eventDate.setHours(10 + (i % 8), 0, 0, 0); // Entre 10h et 17h
      
      try {
        const event = await prisma.event.create({
          data: {
            userId: application.userId,
            title: `Candidature: ${application.position} - ${companies.find(c => c.id === application.companyId)?.name || 'Entreprise'}`,
            description: `Candidature envoyée pour le poste de ${application.position}`,
            startDate: eventDate,
            endDate: new Date(eventDate.getTime() + 30 * 60 * 1000), // 30 minutes
            allDay: false,
            applicationId: application.id,
            reminderEnabled: true,
            reminderMinutes: 15,
            color: '#3B82F6',
            ...(skipIsTestData ? {} : { isTestData: true })
          }
        });
        events.push(event);
      } catch (error) {
        // Ignorer les erreurs de contrainte unique
      }
    }
    
    // Événements pour les entretiens
    for (let i = 0; i < interviews.length; i++) {
      const interview = interviews[i];
      const application = applications.find(a => a.id === interview.applicationId);
      if (!application) continue;
      
      try {
        const event = await prisma.event.create({
          data: {
            userId: application.userId,
            title: `Entretien - ${companies.find(c => c.id === application.companyId)?.name || 'Entreprise'}`,
            description: `Entretien pour ${application.position}`,
            startDate: interview.interviewDate,
            endDate: new Date(new Date(interview.interviewDate).getTime() + (interview.estimatedDuration || 60) * 60 * 1000),
            allDay: false,
            interviewId: interview.id,
            reminderEnabled: true,
            reminderMinutes: 30,
            color: '#10B981',
            ...(skipIsTestData ? {} : { isTestData: true })
          }
        });
        events.push(event);
      } catch (error) {
        // Ignorer les erreurs de contrainte unique
      }
    }
    
    // Événements pour les relances
    for (let i = 0; i < Math.min(Math.floor(config.events * 0.2), followups.length); i++) {
      const followup = followups[i];
      const application = applications.find(a => a.id === followup.applicationId);
      if (!application) continue;
      
      try {
        const event = await prisma.event.create({
          data: {
            userId: application.userId,
            title: `Relance: ${application.position}`,
            description: `Relance pour ${application.position}`,
            startDate: followup.followUpDate,
            endDate: new Date(new Date(followup.followUpDate).getTime() + 15 * 60 * 1000), // 15 minutes
            allDay: false,
            followUpId: followup.id,
            reminderEnabled: true,
            reminderMinutes: 60,
            color: '#F59E0B',
            ...(skipIsTestData ? {} : { isTestData: true })
          }
        });
        events.push(event);
      } catch (error) {
        // Ignorer les erreurs de contrainte unique
      }
    }
    
    // Événements pour les appels
    for (let i = 0; i < Math.min(Math.floor(config.events * 0.2), calls.length); i++) {
      const call = calls[i];
      const application = applications.find(a => a.id === call.applicationId);
      if (!application) continue;
      
      try {
        const event = await prisma.event.create({
          data: {
            userId: application.userId,
            title: `Appel: ${call.subject}`,
            description: `Appel concernant ${application.position}`,
            startDate: call.callDate,
            endDate: call.duration 
              ? new Date(new Date(call.callDate).getTime() + call.duration * 60 * 1000)
              : new Date(new Date(call.callDate).getTime() + 15 * 60 * 1000),
            allDay: false,
            callId: call.id,
            reminderEnabled: true,
            reminderMinutes: 15,
            color: '#8B5CF6',
            ...(skipIsTestData ? {} : { isTestData: true })
          }
        });
        events.push(event);
      } catch (error) {
        // Ignorer les erreurs de contrainte unique
      }
    }
    
    // Événements autonomes (rappels, tâches, etc.)
    const remainingEvents = config.events - events.length;
    for (let i = 0; i < remainingEvents; i++) {
      const user = users[i % users.length];
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 30));
      eventDate.setHours(9 + (i % 8), 0, 0, 0);
      
      const eventTypes = ['Rappel candidature', 'Suivi entreprise', 'Préparation entretien', 'Relance à faire', 'Tâche administrative'];
      const eventType = eventTypes[i % eventTypes.length];
      
      try {
        const event = await prisma.event.create({
          data: {
            userId: user.id,
            title: eventType,
            description: `Événement de test: ${eventType}`,
            startDate: eventDate,
            endDate: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 heure
            allDay: false,
            reminderEnabled: i % 2 === 0,
            reminderMinutes: 60,
            color: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'][i % 5],
            ...(skipIsTestData ? {} : { isTestData: true })
          }
        });
        events.push(event);
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    
    console.log(`   ✅ ${events.length} événements créés`);

    // 10. Archiver quelques éléments
    console.log('📦 Archivage de quelques éléments...');
    let archivedCount = 0;
    for (let i = 0; i < Math.min(config.archivedItems, applications.length); i++) {
      const app = applications[applications.length - 1 - i];
      await prisma.application.update({
        where: { id: app.id },
        data: { archivedAt: new Date() }
      });
      archivedCount++;
    }
    console.log(`   ✅ ${archivedCount} éléments archivés`);

    // 11. Supprimer (soft delete) quelques éléments
    console.log('🗑️ Suppression soft de quelques éléments...');
    let deletedCount = 0;
    for (let i = 0; i < Math.min(config.deletedItems, applications.length - config.archivedItems); i++) {
      const app = applications[i];
      await prisma.application.update({
        where: { id: app.id },
        data: { deletedAt: new Date() }
      });
      deletedCount++;
    }
    console.log(`   ✅ ${deletedCount} éléments supprimés (soft delete)`);

    // Résumé
    console.log('');
    console.log('🎉 Génération terminée avec succès !');
    console.log('='.repeat(50));
    console.log('📊 Résumé:');
    console.log(`   - ${users.length} utilisateurs`);
    console.log(`   - ${companies.length} entreprises`);
    console.log(`   - ${applications.length} candidatures`);
    console.log(`   - ${contacts.length} contacts`);
    console.log(`   - ${interviews.length} entretiens`);
    console.log(`   - ${followups.length} relances`);
    console.log(`   - ${calls.length} appels`);
    console.log(`   - ${events.length} événements`);
    console.log(`   - ${linkedContacts} liaisons contact-candidature`);
    console.log(`   - ${archivedCount} éléments archivés`);
    console.log(`   - ${deletedCount} éléments en corbeille`);
    if (skipIsTestData) {
      console.log('');
      console.warn('⚠️ Données créées sans marquage isTestData (ancienne image api-gateway). Pour que « Revenir à la base propre » les supprime, rebuild: make rebuild-service SERVICE=api-gateway');
    }
    console.log('');
    console.log('🔐 Comptes de test créés:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - password123`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

