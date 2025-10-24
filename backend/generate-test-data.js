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

// Données de test réalistes
const COMPANIES_DATA = [
  { name: 'Google', website: 'https://google.com', industry: 'Technologie', size: '10000+', location: 'Mountain View, CA' },
  { name: 'Microsoft', website: 'https://microsoft.com', industry: 'Technologie', size: '10000+', location: 'Redmond, WA' },
  { name: 'Amazon', website: 'https://amazon.com', industry: 'E-commerce', size: '10000+', location: 'Seattle, WA' },
  { name: 'Meta', website: 'https://meta.com', industry: 'Réseaux sociaux', size: '10000+', location: 'Menlo Park, CA' },
  { name: 'Apple', website: 'https://apple.com', industry: 'Technologie', size: '10000+', location: 'Cupertino, CA' },
  { name: 'Netflix', website: 'https://netflix.com', industry: 'Streaming', size: '1000-5000', location: 'Los Gatos, CA' },
  { name: 'Spotify', website: 'https://spotify.com', industry: 'Musique', size: '1000-5000', location: 'Stockholm, Suède' },
  { name: 'Airbnb', website: 'https://airbnb.com', industry: 'Voyage', size: '1000-5000', location: 'San Francisco, CA' },
  { name: 'Stripe', website: 'https://stripe.com', industry: 'Fintech', size: '500-1000', location: 'San Francisco, CA' },
  { name: 'Datadog', website: 'https://datadoghq.com', industry: 'Monitoring', size: '500-1000', location: 'New York, NY' },
  { name: 'GitLab', website: 'https://gitlab.com', industry: 'DevOps', size: '500-1000', location: 'Remote' },
  { name: 'Notion', website: 'https://notion.so', industry: 'Productivité', size: '100-500', location: 'San Francisco, CA' },
  { name: 'Figma', website: 'https://figma.com', industry: 'Design', size: '100-500', location: 'San Francisco, CA' },
  { name: 'Vercel', website: 'https://vercel.com', industry: 'Cloud', size: '100-500', location: 'San Francisco, CA' },
  { name: 'Supabase', website: 'https://supabase.com', industry: 'Backend as a Service', size: '50-100', location: 'Remote' }
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

async function main() {
  console.log('🎲 Génération de données de test cohérentes...');
  console.log('='.repeat(50));

  // Récupérer la configuration depuis les arguments
  const configArg = process.argv[2];
  const config = configArg ? { ...DEFAULT_CONFIG, ...JSON.parse(configArg) } : DEFAULT_CONFIG;

  console.log('📋 Configuration:', config);
  console.log('');

  try {
    // 1. Créer les utilisateurs
    console.log('👥 Création des utilisateurs...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [];
    for (let i = 0; i < config.users; i++) {
      const user = await prisma.user.upsert({
        where: { email: `user${i + 1}@jobbingtrack.com` },
        update: {},
        create: {
          email: `user${i + 1}@jobbingtrack.com`,
          password: hashedPassword,
          firstName: FIRST_NAMES[i % FIRST_NAMES.length],
          lastName: LAST_NAMES[i % LAST_NAMES.length],
          phone: `+3361234567${i}`,
          role: i === 0 ? 'SUPER_ADMIN' : (i === 1 ? 'ADMIN' : 'USER')
        }
      });
      users.push(user);
    }
    console.log(`   ✅ ${users.length} utilisateurs créés`);

    // 2. Créer les entreprises
    console.log('🏢 Création des entreprises...');
    const companies = [];
    for (let i = 0; i < Math.min(config.companies, COMPANIES_DATA.length); i++) {
      const companyData = COMPANIES_DATA[i];
      const company = await prisma.company.create({
        data: companyData
      });
      companies.push(company);
    }
    console.log(`   ✅ ${companies.length} entreprises créées`);

    // 3. Créer les contacts
    console.log('👤 Création des contacts...');
    const contacts = [];
    for (let i = 0; i < config.contacts; i++) {
      const user = users[i % users.length];
      const company = companies[i % companies.length];
      
      const contact = await prisma.contact.create({
        data: {
          userId: user.id,
          companyId: company.id,
          firstName: FIRST_NAMES[i % FIRST_NAMES.length],
          lastName: LAST_NAMES[(i + 3) % LAST_NAMES.length],
          position: ['Recruteur', 'RH Manager', 'Tech Lead', 'CEO', 'CTO'][i % 5],
          email: `contact${i + 1}@${company.name.toLowerCase().replace(/\s/g, '')}.com`,
          phone: `+3361234${1000 + i}`,
          linkedinUrl: `https://linkedin.com/in/contact${i + 1}`
        }
      });
      contacts.push(contact);
    }
    console.log(`   ✅ ${contacts.length} contacts créés`);

    // 4. Créer les candidatures
    console.log('📋 Création des candidatures...');
    const applications = [];
    for (let i = 0; i < config.applications; i++) {
      const user = users[i % users.length];
      const company = companies[i % companies.length];
      const position = POSITIONS[i % POSITIONS.length];
      const status = STATUSES[i % STATUSES.length];
      
      const applicationDate = new Date();
      applicationDate.setDate(applicationDate.getDate() - Math.floor(Math.random() * 60));
      
      const application = await prisma.application.create({
        data: {
          userId: user.id,
          companyId: company.id,
          position,
          description: `Poste de ${position} chez ${company.name}. Opportunité intéressante dans le domaine de ${company.industry}.`,
          location: ['Remote', 'Paris, France', 'Lyon, France', 'Marseille, France', company.location][i % 5],
          type: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'REMOTE'][i % 5],
          salary: ['50-60K€', '60-70K€', '70-80K€', '80-100K€', '100K+'][i % 5],
          status,
          applicationDate,
          source: ['LinkedIn', 'Indeed', 'Site entreprise', 'Recommandation', 'Welcome to the Jungle'][i % 5],
          jobUrl: `https://careers.${company.name.toLowerCase()}.com/jobs/${position.toLowerCase().replace(/\s/g, '-')}`,
          notes: `Candidature envoyée le ${applicationDate.toLocaleDateString('fr-FR')}. En attente de retour.`
        }
      });
      applications.push(application);

      // Créer des activités pour chaque candidature
      await prisma.activity.create({
        data: {
          applicationId: application.id,
          type: 'APPLICATION_CREATED',
          description: `Candidature créée pour ${position} chez ${company.name}`
        }
      });

      if (status !== 'DRAFT') {
        await prisma.activity.create({
          data: {
            applicationId: application.id,
            type: 'STATUS_CHANGED',
            description: `Statut changé vers ${status}`
          }
        });
      }
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

    // 6. Créer des entretiens
    console.log('🎤 Création des entretiens...');
    const interviews = [];
    for (let i = 0; i < Math.min(config.interviews, applications.length); i++) {
      const application = applications[i];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 14) - 7);
      
      const interview = await prisma.interview.create({
        data: {
          applicationId: application.id,
          type: ['PHONE_SCREENING', 'VIDEO', 'ON_SITE', 'TECHNICAL', 'HR', 'MANAGER'][i % 6],
          scheduledAt: scheduledDate,
          duration: [30, 45, 60, 90][i % 4],
          location: ['Visioconférence', 'Bureau Paris', 'Téléphone', 'Remote'][i % 4],
          meetingUrl: i % 2 === 0 ? 'https://meet.google.com/abc-defg-hij' : undefined,
          interviewer: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`,
          notes: 'Entretien technique prévu',
          status: ['SCHEDULED', 'COMPLETED', 'CANCELLED'][i % 3]
        }
      });
      interviews.push(interview);

      // Activité
      await prisma.activity.create({
        data: {
          applicationId: application.id,
          type: 'INTERVIEW_SCHEDULED',
          description: `Entretien ${interview.type} planifié le ${scheduledDate.toLocaleDateString('fr-FR')}`
        }
      });
    }
    console.log(`   ✅ ${interviews.length} entretiens créés`);

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
          applicationId: application.id,
          contactId: contact.id,
          type: ['EMAIL', 'PHONE', 'LINKEDIN', 'MESSAGE'][i % 4],
          scheduledDate,
          completed: i % 3 === 0,
          completedDate: i % 3 === 0 ? new Date() : null,
          subject: `Suivi candidature ${application.position}`,
          message: `Bonjour,\n\nJe me permets de revenir vers vous concernant ma candidature pour le poste de ${application.position}.\n\nCordialement`,
          response: i % 3 === 0 ? 'Réponse positive, entretien prévu' : null
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
          applicationId: application.id,
          contactId: contact.id,
          type: ['OUTGOING', 'INCOMING', 'MISSED'][i % 3],
          scheduledDate: callDate,
          callDate: i % 2 === 0 ? callDate : null,
          duration: i % 2 === 0 ? Math.floor(Math.random() * 1800) + 300 : null, // 5-35 minutes en secondes
          status: ['SCHEDULED', 'COMPLETED', 'NO_ANSWER', 'VOICEMAIL'][i % 4],
          notes: `Appel concernant la candidature ${application.position}`,
          outcome: i % 2 === 0 ? 'Discussion positive' : null,
          followUpNeeded: i % 3 === 0
        }
      });
      calls.push(call);
    }
    console.log(`   ✅ ${calls.length} appels créés`);

    // 9. Archiver quelques éléments
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

    // 10. Supprimer (soft delete) quelques éléments
    console.log('🗑️ Suppression soft de quelques éléments...');
    let deletedCount = 0;
    for (let i = 0; i < Math.min(config.deletedItems, applications.length - config.archivedItems); i++) {
      const app = applications[i];
      await prisma.application.update({
        where: { id: app.id },
        data: { 
          deletedAt: new Date(),
          canRestore: true
        }
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
    console.log(`   - ${linkedContacts} liaisons contact-candidature`);
    console.log(`   - ${archivedCount} éléments archivés`);
    console.log(`   - ${deletedCount} éléments en corbeille`);
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

