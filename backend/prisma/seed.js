# Script de seed pour Prisma
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données...')

  // Nettoyer les données existantes
  await prisma.activity.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.applicationDocument.deleteMany()
  await prisma.application.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.document.deleteMany()
  await prisma.messageTemplate.deleteMany()
  await prisma.company.deleteMany()
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

  // Créer des entreprises de test
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

  // Créer des candidatures de test
  const applications = await Promise.all([
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[0].id,
        position: 'Software Engineer',
        description: 'Développement d\'applications web avec React et Node.js',
        location: 'Remote',
        type: 'FULL_TIME',
        status: 'SENT',
        applicationDate: new Date('2024-01-15'),
        source: 'LinkedIn',
        jobUrl: 'https://careers.google.com/jobs/software-engineer',
        notes: 'Candidature envoyée via LinkedIn. Poste très intéressant!',
        activities: {
          create: {
            type: 'APPLICATION_CREATED',
            description: 'Candidature créée pour Software Engineer chez Google'
          }
        }
      }
    }),
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[1].id,
        position: 'Frontend Developer',
        description: 'Développement d\'interfaces utilisateur modernes',
        location: 'Paris, France',
        type: 'FULL_TIME',
        status: 'INTERVIEW_SCHEDULED',
        applicationDate: new Date('2024-01-10'),
        source: 'Site entreprise',
        jobUrl: 'https://careers.microsoft.com/frontend-dev',
        notes: 'Entretien technique prévu la semaine prochaine',
        activities: {
          create: [
            {
              type: 'APPLICATION_CREATED',
              description: 'Candidature créée pour Frontend Developer chez Microsoft'
            },
            {
              type: 'STATUS_CHANGED',
              description: 'Statut changé vers INTERVIEW_SCHEDULED'
            }
          ]
        }
      }
    }),
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[2].id,
        position: 'Full Stack Developer',
        description: 'Développement complet d\'une plateforme SaaS',
        location: 'Paris, France',
        type: 'FULL_TIME',
        status: 'REJECTED',
        applicationDate: new Date('2024-01-05'),
        source: 'Indeed',
        notes: 'Profil intéressant mais ils cherchent plus d\'expérience',
        activities: {
          create: [
            {
              type: 'APPLICATION_CREATED',
              description: 'Candidature créée pour Full Stack Developer chez Startup Inc'
            },
            {
              type: 'STATUS_CHANGED',
              description: 'Statut changé vers REJECTED'
            }
          ]
        }
      }
    })
  ])

  console.log('✅ Candidatures créées:', applications.length)

  // Créer des entretiens de test
  await prisma.interview.create({
    data: {
      applicationId: applications[1].id,
      type: 'TECHNICAL',
      scheduledAt: new Date('2024-02-01T14:00:00Z'),
      duration: 60,
      location: 'Visioconférence',
      meetingUrl: 'https://teams.microsoft.com/join/123456',
      interviewer: 'Sarah Johnson, Tech Lead',
      status: 'SCHEDULED',
      notes: 'Entretien technique sur React et TypeScript'
    }
  })

  // Créer des contacts de test
  await Promise.all([
    prisma.contact.create({
      data: {
        userId: testUser.id,
        companyId: companies[0].id,
        firstName: 'John',
        lastName: 'Smith',
        position: 'Engineering Manager',
        email: 'john.smith@google.com',
        phone: '+1-555-0123',
        linkedinUrl: 'https://linkedin.com/in/johnsmith',
        notes: 'Très sympa lors de notre échange sur LinkedIn'
      }
    }),
    prisma.contact.create({
      data: {
        userId: testUser.id,
        companyId: companies[1].id,
        firstName: 'Marie',
        lastName: 'Dubois',
        position: 'HR Manager',
        email: 'marie.dubois@microsoft.com',
        notes: 'Contact RH principal pour le suivi'
      }
    })
  ])

  // Créer des templates de message
  await Promise.all([
    prisma.messageTemplate.create({
      data: {
        userId: testUser.id,
        name: 'Relance après candidature',
        subject: 'Suivi de ma candidature - {{position}}',
        content: `Bonjour,

Je me permets de revenir vers vous concernant ma candidature pour le poste de {{position}} que j'ai envoyée le {{applicationDate}}.

Je reste très intéressé par cette opportunité et serais ravi d'échanger avec vous sur mon profil.

Cordialement,
{{firstName}} {{lastName}}`,
        type: 'FOLLOWUP',
        variables: ['position', 'applicationDate', 'firstName', 'lastName']
      }
    }),
    prisma.messageTemplate.create({
      data: {
        userId: testUser.id,
        name: 'Remerciement après entretien',
        subject: 'Merci pour l\'entretien - {{position}}',
        content: `Bonjour {{interviewer}},

Je vous remercie pour le temps que vous m'avez accordé lors de notre entretien pour le poste de {{position}}.

Notre échange m'a conforté dans mon intérêt pour ce poste et votre équipe.

Je reste à votre disposition pour tout complément d'information.

Cordialement,
{{firstName}} {{lastName}}`,
        type: 'THANK_YOU',
        variables: ['interviewer', 'position', 'firstName', 'lastName']
      }
    })
  ])

  // Créer des rappels
  await Promise.all([
    prisma.reminder.create({
      data: {
        userId: testUser.id,
        title: 'Relancer Google',
        description: 'Faire un suivi de la candidature Software Engineer',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
        type: 'APPLICATION_FOLLOWUP',
        relatedId: applications[0].id
      }
    }),
    prisma.reminder.create({
      data: {
        userId: testUser.id,
        title: 'Préparer entretien Microsoft',
        description: 'Revoir les concepts React et TypeScript',
        dueDate: new Date('2024-01-31T10:00:00Z'),
        type: 'INTERVIEW',
        relatedId: applications[1].id
      }
    })
  ])

  console.log('✅ Données de test créées avec succès!')
  console.log('')
  console.log('🔐 Compte de test:')
  console.log('   Email: pavel@jobbingtrack.com')
  console.log('   Mot de passe: password123')
  console.log('')
  console.log('📊 Données créées:')
  console.log('   - 1 utilisateur')
  console.log('   - 3 entreprises')
  console.log('   - 3 candidatures')
  console.log('   - 1 entretien')
  console.log('   - 2 contacts')
  console.log('   - 2 templates de message')
  console.log('   - 2 rappels')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })