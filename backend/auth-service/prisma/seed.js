const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env')
const rootEnvPath = path.join(__dirname, '..', '..', '..', '.env')
require('dotenv').config({ path: envPath })
require('dotenv').config({ path: rootEnvPath })

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Auth Service...')

  // Créer un utilisateur de test (ou le mettre à jour s'il existe)
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

  const testUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: '+33123456789',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: '+33123456789',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    }
  })

  console.log('✅ Utilisateur de test créé:', testUser.email)
  console.log('✅ Rôle:', testUser.role)
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