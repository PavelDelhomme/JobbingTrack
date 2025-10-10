const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Auth Service...')

  // Créer un utilisateur de test (ou le mettre à jour s'il existe)
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'admin@jobbingtrack.test' },
    update: {
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'JobbingTrack',
      phone: '+33123456789',
      role: 'SUPER_ADMIN'
    },
    create: {
      email: 'admin@jobbingtrack.test',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'JobbingTrack',
      phone: '+33123456789',
      role: 'SUPER_ADMIN'
    }
  })

  console.log('✅ Utilisateur de test créé:', testUser.email)
  console.log('✅ Rôle:', testUser.role)
  console.log('')
  console.log('🔐 Compte de test:')
  console.log('   Email: admin@jobbingtrack.test')
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