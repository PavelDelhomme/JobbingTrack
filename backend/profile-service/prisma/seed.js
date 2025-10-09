const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du peuplement de la base de données Profile Service...')

  // Nettoyer les données existantes
  await prisma.project.deleteMany()
  await prisma.language.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.education.deleteMany()
  await prisma.experience.deleteMany()
  await prisma.cV.deleteMany()

  console.log('✅ Données de test créées avec succès!')
  console.log('')
  console.log('👤 Profile Service prêt à gérer les CVs et profils')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

