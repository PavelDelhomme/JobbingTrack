const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Call Service...')

  // Nettoyer les données existantes
  await prisma.call.deleteMany()

  console.log('✅ Données de test créées avec succès!')
  console.log('')
  console.log('📞 Call Service prêt à recevoir des appels')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

