/**
 * Seed des données par défaut pour metrics-aggregator-service
 * Créer des seuils d'alerte par défaut
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding des données par défaut...');

  // Créer des seuils d'alerte par défaut
  const defaultThresholds = [
    {
      name: 'CPU Usage Warning',
      description: 'Alerte si l\'usage CPU dépasse 80%',
      metricType: 'cpu_usage',
      warningThreshold: 80.0,
      criticalThreshold: 95.0,
      targetType: 'system',
      isEnabled: true,
      notifyEmail: false,
      notifySlack: false
    },
    {
      name: 'Memory Usage Warning',
      description: 'Alerte si l\'usage mémoire dépasse 85%',
      metricType: 'memory_usage',
      warningThreshold: 85.0,
      criticalThreshold: 95.0,
      targetType: 'system',
      isEnabled: true,
      notifyEmail: false,
      notifySlack: false
    },
    {
      name: 'Disk Usage Warning',
      description: 'Alerte si l\'usage disque dépasse 80%',
      metricType: 'disk_usage',
      warningThreshold: 80.0,
      criticalThreshold: 90.0,
      targetType: 'system',
      isEnabled: true,
      notifyEmail: false,
      notifySlack: false
    }
  ];

  for (const threshold of defaultThresholds) {
    try {
      const existing = await prisma.alertThreshold.findUnique({
        where: { name: threshold.name }
      });

      if (existing) {
        console.log(`  ⏭️  ${threshold.name} existe déjà`);
      } else {
        await prisma.alertThreshold.create({ data: threshold });
        console.log(`  ✅ ${threshold.name} créé`);
      }
    } catch (error) {
      console.error(`  ❌ Erreur pour ${threshold.name}:`, error.message);
    }
  }

  console.log('✅ Seed terminé !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
