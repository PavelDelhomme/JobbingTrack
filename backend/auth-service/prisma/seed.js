const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Auth Service...')

  // Créer un utilisateur de test (ou le mettre à jour s'il existe)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jobbingtrack.test'
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123'
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin'
  const adminLastName = process.env.ADMIN_LAST_NAME || 'JobbingTrack'

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const testUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: '+33123456789',
      role: 'SUPER_ADMIN'
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: '+33123456789',
      role: 'SUPER_ADMIN'
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