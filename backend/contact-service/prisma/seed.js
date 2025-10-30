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
      email: 'admin@jobbingtrack.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'JobbingTrack',
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
    })
  ])

  console.log('✅ Candidatures créées:', applications.length)

  console.log('✅ Données de test créées avec succès!')
  console.log('')
  console.log('🔐 Compte de test:')
  console.log('   Email: admin@jobbingtrack.com')
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