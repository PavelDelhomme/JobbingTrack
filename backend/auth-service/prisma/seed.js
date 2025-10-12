const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Auth Service...')

  // Créer un utilisateur de test (ou le mettre à jour s'il existe)
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'pavel@jobbingtrack.com' },
    update: {
      password: hashedPassword,
      firstName: 'Pavel',
      lastName: 'Delhomme',
      phone: '+33123456789',
      role: 'SUPER_ADMIN'
    },
    create: {
      email: 'pavel@jobbingtrack.com',
      password: hashedPassword,
      firstName: 'Pavel',
      lastName: 'Delhomme',
      phone: '+33123456789',
      role: 'SUPER_ADMIN'
    }
  })

  console.log('✅ Utilisateur de test créé:', testUser.email)
  console.log('✅ Rôle:', testUser.role)
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