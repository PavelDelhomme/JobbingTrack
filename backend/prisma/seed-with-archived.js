const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Création de données de test avec éléments archivés...')

  // Nettoyer les données existantes
  await prisma.activity.deleteMany()
  await prisma.call.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.applicationDocument.deleteMany()
  await prisma.application.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.document.deleteMany()
  await prisma.messageTemplate.deleteMany()
  await prisma.company.deleteMany()
  await prisma.platform.deleteMany()
  await prisma.user.deleteMany()

  // Créer un utilisateur de test
  const hashedPassword = await bcrypt.hash('password123', 10)

  const testUser = await prisma.user.create({
    data: {
      email: 'pavel@jobbingtrack.com',
      password: hashedPassword,
      firstName: 'Pavel',
      lastName: 'Delhomme',
      phone: '+33123456789',
    }
  })

  console.log('✅ Utilisateur de test créé:', testUser.email)

  // Créer des plateformes
  const platforms = await Promise.all([
    prisma.platform.create({
      data: {
        name: 'LinkedIn',
        website: 'https://linkedin.com',
        description: 'Réseau professionnel pour la recherche d\'emploi'
      }
    }),
    prisma.platform.create({
      data: {
        name: 'Indeed',
        website: 'https://indeed.com',
        description: 'Moteur de recherche d\'emploi'
      }
    }),
    prisma.platform.create({
      data: {
        name: 'Welcome to the Jungle',
        website: 'https://wttj.co',
        description: 'Plateforme française de recherche d\'emploi'
      }
    })
  ])

  console.log('✅ Plateformes créées:', platforms.length)

  // Créer des entreprises
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'Google',
        website: 'https://google.com',
        industry: 'Technology',
        size: '10000+',
        location: 'Mountain View, CA'
      }
    }),
    prisma.company.create({
      data: {
        name: 'Microsoft',
        website: 'https://microsoft.com',
        industry: 'Technology',
        size: '10000+',
        location: 'Redmond, WA'
      }
    }),
    prisma.company.create({
      data: {
        name: 'Startup Inc',
        website: 'https://startup.inc',
        industry: 'Technology',
        size: '10-50',
        location: 'Paris, France'
      }
    })
  ])

  console.log('✅ Entreprises créées:', companies.length)

  // Créer des candidatures actives et archivées
  const applications = await Promise.all([
    // Candidature active
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[0].id,
        platformId: platforms[0].id,
        position: 'Software Engineer',
        description: 'Développement d\'applications web',
        location: 'Remote',
        type: 'FULL_TIME',
        status: 'CANDIDATE_PENDING',
        applicationDate: new Date('2024-01-15'),
        jobUrl: 'https://careers.google.com/software-engineer',
        notes: 'Candidature active en cours',
        activities: {
          create: {
            type: 'APPLICATION_CREATED',
            description: 'Candidature créée pour Software Engineer chez Google'
          }
        }
      }
    }),

    // Candidature archivée
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[1].id,
        platformId: platforms[1].id,
        position: 'Frontend Developer',
        description: 'Développement frontend',
        location: 'Paris, France',
        type: 'FULL_TIME',
        status: 'REJECTED_AFTER_INTERVIEW',
        applicationDate: new Date('2024-01-10'),
        jobUrl: 'https://careers.microsoft.com/frontend-dev',
        notes: 'Candidature rejetée après entretien',
        isArchived: true,
        archivedAt: new Date('2024-01-20'),
        archivedBy: testUser.id,
        archivedReason: 'Refus après entretien technique',
        activities: {
          create: [
            {
              type: 'APPLICATION_CREATED',
              description: 'Candidature créée pour Frontend Developer chez Microsoft'
            },
            {
              type: 'APPLICATION_ARCHIVED',
              description: 'Candidature archivée suite à refus'
            }
          ]
        }
      }
    }),

    // Candidature archivée sans entretien
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[2].id,
        platformId: platforms[2].id,
        position: 'Full Stack Developer',
        description: 'Développement full stack',
        location: 'Paris, France',
        type: 'FULL_TIME',
        status: 'REJECTED_WITHOUT_INTERVIEW',
        applicationDate: new Date('2024-01-05'),
        jobUrl: 'https://startup-inc.wttj.co/job/fullstack-dev',
        notes: 'Candidature rejetée sans entretien',
        isArchived: true,
        archivedAt: new Date('2024-01-15'),
        archivedBy: testUser.id,
        archivedReason: 'Refus direct sans entretien',
        activities: {
          create: [
            {
              type: 'APPLICATION_CREATED',
              description: 'Candidature créée pour Full Stack Developer chez Startup Inc'
            },
            {
              type: 'APPLICATION_ARCHIVED',
              description: 'Candidature archivée suite à refus direct'
            }
          ]
        }
      }
    })
  ])

  console.log('✅ Candidatures créées:', applications.length)

  // Créer des entretiens (un actif, un archivé)
  const interviews = await Promise.all([
    prisma.interview.create({
      data: {
        applicationId: applications[0].id, // Candidature active
        type: 'VIDEO',
        scheduledAt: new Date('2024-01-25T14:00:00'),
        duration: 60,
        location: 'Remote',
        interviewer: 'Marie Dubois',
        notes: 'Entretien technique prévu',
        status: 'PENDING'
      }
    }),

    prisma.interview.create({
      data: {
        applicationId: applications[1].id, // Candidature archivée
        type: 'ON_SITE',
        scheduledAt: new Date('2024-01-18T10:00:00'),
        duration: 90,
        location: 'Microsoft Paris',
        interviewer: 'Pierre Martin',
        notes: 'Entretien passé mais candidature rejetée',
        status: 'COMPLETED',
        completedAt: new Date('2024-01-18T11:30:00'),
        feedback: 'Bon profil technique mais pas retenu',
        isArchived: true,
        archivedAt: new Date('2024-01-20'),
        archivedBy: testUser.id,
        archivedReason: 'Archivé avec la candidature'
      }
    })
  ])

  console.log('✅ Entretiens créés:', interviews.length)

  // Créer des relances (une active, une archivée)
  const followUps = await Promise.all([
    prisma.followUp.create({
      data: {
        applicationId: applications[0].id, // Candidature active
        type: 'EMAIL',
        scheduledDate: new Date('2024-01-22T10:00:00'),
        subject: 'Suivi candidature Software Engineer',
        message: 'Bonjour, j\'aimerais avoir des nouvelles...',
        status: 'PENDING_FOLLOWUP'
      }
    }),

    prisma.followUp.create({
      data: {
        applicationId: applications[1].id, // Candidature archivée
        type: 'PHONE',
        scheduledDate: new Date('2024-01-12T15:00:00'),
        completed: true,
        completedDate: new Date('2024-01-12T15:30:00'),
        subject: 'Appel de suivi',
        message: 'Appel pour avoir des retours',
        response: 'Nous vous contacterons prochainement',
        responseDate: new Date('2024-01-13T09:00:00'),
        status: 'POSITIVE_RESPONSE',
        isArchived: true,
        archivedAt: new Date('2024-01-20'),
        archivedBy: testUser.id,
        archivedReason: 'Archivé avec la candidature'
      }
    })
  ])

  console.log('✅ Relances créées:', followUps.length)

  // Créer des appels (un actif, un archivé)
  const calls = await Promise.all([
    prisma.call.create({
      data: {
        applicationId: applications[0].id, // Candidature active
        type: 'OUTGOING',
        scheduledDate: new Date('2024-01-23T11:00:00'),
        status: 'SCHEDULED',
        notes: 'Appel prévu pour discuter du poste',
        followUpNeeded: false
      }
    }),

    prisma.call.create({
      data: {
        applicationId: applications[1].id, // Candidature archivée
        type: 'OUTGOING',
        callDate: new Date('2024-01-16T16:00:00'),
        duration: 300, // 5 minutes
        status: 'COMPLETED',
        notes: 'Appel de suivi après entretien',
        outcome: 'Discussion sur les prochaines étapes',
        followUpNeeded: false,
        isArchived: true,
        archivedAt: new Date('2024-01-20'),
        archivedBy: testUser.id,
        archivedReason: 'Archivé avec la candidature'
      }
    })
  ])

  console.log('✅ Appels créés:', calls.length)

  // Créer des contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        userId: testUser.id,
        companyId: companies[0].id,
        firstName: 'Marie',
        lastName: 'Dubois',
        position: 'DRH',
        email: 'marie.dubois@google.com',
        phone: '+33123456789',
        linkedinUrl: 'https://linkedin.com/in/marie-dubois',
        notes: 'Contact principal chez Google'
      }
    }),

    prisma.contact.create({
      data: {
        userId: testUser.id,
        companyId: companies[1].id,
        firstName: 'Pierre',
        lastName: 'Martin',
        position: 'Chef de Projet',
        email: 'pierre.martin@microsoft.com',
        phone: '+33198765432',
        notes: 'Interlocuteur technique chez Microsoft',
        isArchived: true,
        archivedAt: new Date('2024-01-21'),
        archivedBy: testUser.id,
        archivedReason: 'Contact plus utilisé'
      }
    })
  ])

  console.log('✅ Contacts créés:', contacts.length)

  console.log('✅ Données de test avec archivage créées avec succès!')
  console.log('')
  console.log('📊 Résumé:')
  console.log(`   • ${applications.length} candidatures (${applications.filter(a => a.isArchived).length} archivées)`)
  console.log(`   • ${interviews.length} entretiens (${interviews.filter(i => i.isArchived).length} archivés)`)
  console.log(`   • ${followUps.length} relances (${followUps.filter(f => f.isArchived).length} archivées)`)
  console.log(`   • ${calls.length} appels (${calls.filter(c => c.isArchived).length} archivés)`)
  console.log(`   • ${contacts.length} contacts (${contacts.filter(c => c.isArchived).length} archivés)`)
  console.log('')
  console.log('🔐 Compte de test:')
  console.log('   Email: pavel@jobbingtrack.com')
  console.log('   Mot de passe: password123')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
