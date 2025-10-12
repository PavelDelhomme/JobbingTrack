const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDefaults() {
    console.log('🌱 Début du peuplement des données par défaut...');

    // Plateformes par défaut
    const platforms = [
        { name: "LinkedIn", url: "https://linkedin.com" },
        { name: "HelloWork", url: "https://hellowork.com" },
        { name: "Indeed", url: "https://indeed.com" },
        { name: "Site entreprise", url: null },
        { name: "Recommandation", url: null },
    ];


  for (const platform of platforms) {
    await prisma.applicationPlatform.upsert({
      where: { name: platform.name },
      update: {},
      create: {
        ...platform,
        userId: null, // Plateformes système
        isDefault: true,
        isActive: true
      }
    });
  }

  // Types de contrats par défaut
  const contractTypes = [
    'CDI', 'CDD', 'Freelance', 'Stage', 'Alternance', 'Intérim'
  ];

  for (const name of contractTypes) {
    await prisma.contractType.upsert({
      where: { name },
      update: {},
      create: {
        name,
        userId: null, // Types système
        isDefault: true,
        isActive: true
      }
    });
  }

  console.log('✅ Default data seeded!');
}

seedDefaults()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });