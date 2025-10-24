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

  // Créer des plateformes de candidature
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
    }),
    prisma.platform.create({
      data: {
        name: 'Site entreprise',
        website: null,
        description: 'Candidature directe sur le site de l\'entreprise'
      }
    })
  ])

  console.log('✅ Plateformes créées:', platforms.length)

  // Créer un utilisateur de test (utilise les variables d'environnement)
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin'
  const adminLastName = process.env.ADMIN_LAST_NAME || 'JobbingTrack'

  // Vérifier que les variables d'environnement sont définies
  if (!adminEmail || !adminPassword) {
    console.error('❌ Variables d\'environnement ADMIN_EMAIL et ADMIN_PASSWORD non définies')
    console.error('💡 Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans votre fichier .env')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const testUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
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

  // Créer des candidatures de test avec les nouveaux états
  const applications = await Promise.all([
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[0].id,
        platformId: platforms[0].id, // LinkedIn
        position: 'Software Engineer',
        description: 'Développement d\'applications web avec React et Node.js',
        location: 'Remote',
        type: 'FULL_TIME',
        status: 'NO_RESPONSE', // "Aucune réponse"
        applicationDate: new Date('2024-01-15'),
        jobUrl: 'https://careers.google.com/jobs/software-engineer',
        notes: 'Candidature envoyée via LinkedIn. Poste très intéressant! Aucune réponse reçue après 2 semaines.',
        activities: {
          create: [
            {
              type: 'APPLICATION_CREATED',
              description: 'Candidature créée pour Software Engineer chez Google'
            },
            {
              type: 'STATUS_CHANGED',
              description: 'Statut changé vers NO_RESPONSE après délai'
            }
          ]
        }
      }
    }),
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[1].id,
        platformId: platforms[3].id, // Site entreprise
        position: 'Frontend Developer',
        description: 'Développement d\'interfaces utilisateur modernes',
        location: 'Paris, France',
        type: 'FULL_TIME',
        status: 'FIRST_INTERVIEW_PENDING', // "1er entretien en attente"
        applicationDate: new Date('2024-01-10'),
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
              description: 'Statut changé vers FIRST_INTERVIEW_PENDING'
            }
          ]
        }
      }
    }),
    prisma.application.create({
      data: {
        userId: testUser.id,
        companyId: companies[2].id,
        platformId: platforms[2].id, // Welcome to the Jungle
        position: 'Full Stack Developer',
        description: 'Développement full stack avec Node.js et Vue.js',
        location: 'Paris, France',
        type: 'FULL_TIME',
        status: 'CANDIDATE_PENDING', // "Candidaté et en attente"
        applicationDate: new Date('2024-01-20'),
        jobUrl: 'https://startup-inc.wttj.co/job/fullstack-dev',
        notes: 'Startup en croissance, poste très motivant!',
        activities: {
          create: {
            type: 'APPLICATION_CREATED',
            description: 'Candidature créée pour Full Stack Developer chez Startup Inc'
          }
        }
      }
    })
  ])

  console.log('✅ Candidatures créées:', applications.length)

  console.log('✅ Données de test créées avec succès!')
  console.log('')
  console.log('🔐 Compte de test:')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Mot de passe: ${adminPassword}`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })