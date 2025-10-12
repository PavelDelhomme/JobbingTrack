const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Event Service...')

  // Nettoyer les données existantes
  await prisma.event.deleteMany()

  console.log('✅ Données de test créées avec succès!')
  console.log('')
  console.log('📅 Event Service prêt à enregistrer des événements')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

