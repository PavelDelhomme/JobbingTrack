/**
 * Tests de performance mémoire
 * Tests spécialisés pour l'utilisation et les fuites mémoire
 */

const { performance } = require('perf_hooks');

class MemoryTester {
  constructor() {
    this.results = [];
  }

  getMemoryUsage() {
    const mem = process.memoryUsage();
    return {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      timestamp: new Date().toISOString()
    };
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  async testDataProcessing() {
    console.log('🧮 Test de traitement de données...');

    const initialMemory = this.getMemoryUsage();
    const results = [];

    // Test avec différentes tailles de données
    const dataSizes = [1000, 5000, 10000, 25000];

    for (const size of dataSizes) {
      console.log(`   Test avec ${size} éléments...`);

      // Création des données
      const data = Array(size).fill().map((_, i) => ({
        id: i,
        name: `Test Item ${i}`,
        description: `Description for item ${i}`.repeat(Math.floor(Math.random() * 5) + 1),
        data: {
          nested: {
            value: Math.random(),
            array: Array(Math.floor(Math.random() * 10)).fill().map((_, j) => ({
              id: j,
              value: `nested-${i}-${j}`
            }))
          },
          metadata: {
            created: new Date().toISOString(),
            tags: Array(Math.floor(Math.random() * 5)).fill().map((_, k) => `tag-${k}`)
          }
        }
      }));

      const beforeProcessing = this.getMemoryUsage();

      // Traitement des données
      const startTime = performance.now();
      const processed = data.map(item => {
        // Simulation de traitement complexe
        const hash = require('crypto').createHash('md5').update(JSON.stringify(item)).digest('hex');
        return {
          ...item,
          processed: true,
          hash,
          computed: {
            length: JSON.stringify(item).length,
            complexity: Math.floor(Math.random() * 100)
          }
        };
      });
      const endTime = performance.now();

      const afterProcessing = this.getMemoryUsage();

      const memoryIncrease = {
        rss: afterProcessing.rss - beforeProcessing.rss,
        heapUsed: afterProcessing.heapUsed - beforeProcessing.heapUsed,
        heapTotal: afterProcessing.heapTotal - beforeProcessing.heapTotal
      };

      results.push({
        dataSize: size,
        processingTime: endTime - startTime,
        memoryIncrease,
        itemsPerSecond: Math.round(size / ((endTime - startTime) / 1000)),
        memoryPerItem: {
          rss: memoryIncrease.rss / size,
          heapUsed: memoryIncrease.heapUsed / size
        }
      });

      console.log(`     ⏱️  ${Math.round(endTime - startTime)}ms - ${this.formatBytes(memoryIncrease.heapUsed)} utilisés`);
      console.log(`     📊 ${Math.round(size / ((endTime - startTime) / 1000))} éléments/seconde`);

      // Nettoyage explicite pour éviter les fuites
      processed.length = 0;
      data.length = 0;

      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }

      // Petite pause
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalMemory = this.getMemoryUsage();
    const totalMemoryIncrease = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };

    console.log(`\n📊 Augmentation mémoire totale:`);
    console.log(`   RSS: ${this.formatBytes(totalMemoryIncrease.rss)}`);
    console.log(`   Heap Used: ${this.formatBytes(totalMemoryIncrease.heapUsed)}`);
    console.log(`   Heap Total: ${this.formatBytes(totalMemoryIncrease.heapTotal)}`);

    return {
      initialMemory,
      finalMemory,
      totalMemoryIncrease,
      tests: results
    };
  }

  async testMemoryLeaks() {
    console.log('🔍 Test de détection de fuites mémoire...');

    const initialMemory = this.getMemoryUsage();
    const leakTests = [];

    // Test 1: Création d'objets sans nettoyage
    console.log('   Test 1: Accumulation d\'objets...');
    const objects = [];

    for (let i = 0; i < 1000; i++) {
      objects.push({
        id: i,
        data: Array(100).fill().map((_, j) => ({ id: j, value: `data-${i}-${j}` })),
        timestamp: new Date().toISOString()
      });
    }

    const afterObjects = this.getMemoryUsage();

    // Test 2: Fermetures qui capturent des variables
    console.log('   Test 2: Fermetures avec capture...');
    const closures = [];

    for (let i = 0; i < 500; i++) {
      const capturedData = Array(50).fill().map((_, j) => `captured-${i}-${j}`);
      closures.push(() => capturedData.length);
    }

    const afterClosures = this.getMemoryUsage();

    // Test 3: Événements et listeners
    console.log('   Test 3: Event listeners...');
    const events = require('events');
    const eventEmitters = [];

    for (let i = 0; i < 100; i++) {
      const emitter = new events.EventEmitter();
      const listeners = [];

      for (let j = 0; j < 10; j++) {
        const listener = () => `listener-${i}-${j}`;
        emitter.on(`event-${j}`, listener);
        listeners.push(listener);
      }

      eventEmitters.push({ emitter, listeners });
    }

    const afterEvents = this.getMemoryUsage();

    leakTests.push({
      test: 'objects',
      memoryIncrease: {
        rss: afterObjects.rss - initialMemory.rss,
        heapUsed: afterObjects.heapUsed - initialMemory.heapUsed
      }
    });

    leakTests.push({
      test: 'closures',
      memoryIncrease: {
        rss: afterClosures.rss - afterObjects.rss,
        heapUsed: afterClosures.heapUsed - afterObjects.heapUsed
      }
    });

    leakTests.push({
      test: 'events',
      memoryIncrease: {
        rss: afterEvents.rss - afterClosures.rss,
        heapUsed: afterEvents.heapUsed - afterClosures.heapUsed
      }
    });

    // Nettoyage
    objects.length = 0;
    closures.length = 0;
    eventEmitters.forEach(({ emitter, listeners }) => {
      listeners.forEach((listener, index) => {
        emitter.removeListener(`event-${index}`, listener);
      });
    });
    eventEmitters.length = 0;

    if (global.gc) {
      global.gc();
    }

    const afterCleanup = this.getMemoryUsage();

    console.log(`   🧹 Après nettoyage: ${this.formatBytes(afterCleanup.heapUsed)}`);

    return {
      initialMemory,
      afterCleanup,
      memoryRecovered: {
        rss: afterCleanup.rss - afterEvents.rss,
        heapUsed: afterCleanup.heapUsed - afterEvents.heapUsed
      },
      leakTests
    };
  }

  async testGarbageCollection() {
    console.log('♻️ Test du garbage collector...');

    const gcTests = [];
    const initialMemory = this.getMemoryUsage();

    // Test de pression GC
    for (let iteration = 0; iteration < 5; iteration++) {
      console.log(`   Itération ${iteration + 1}/5...`);

      // Créer beaucoup d'objets
      const largeArray = Array(10000).fill().map((_, i) => ({
        id: i,
        data: Array(100).fill().map((_, j) => ({ id: j, value: `item-${i}-${j}` })),
        timestamp: new Date().toISOString()
      }));

      // Traitement
      const processed = largeArray.map(item => ({
        ...item,
        processed: true,
        hash: require('crypto').createHash('md5').update(JSON.stringify(item)).digest('hex').substring(0, 8)
      }));

      const beforeGC = this.getMemoryUsage();

      // Nettoyage
      largeArray.length = 0;
      processed.length = 0;

      // Forcer GC si disponible
      if (global.gc) {
        global.gc();
      }

      const afterGC = this.getMemoryUsage();

      gcTests.push({
        iteration: iteration + 1,
        memoryBefore: beforeGC.heapUsed,
        memoryAfter: afterGC.heapUsed,
        memoryFreed: beforeGC.heapUsed - afterGC.heapUsed,
        freedPercentage: ((beforeGC.heapUsed - afterGC.heapUsed) / beforeGC.heapUsed * 100).toFixed(1) + '%'
      });

      console.log(`     📊 Mémoire libérée: ${this.formatBytes(beforeGC.heapUsed - afterGC.heapUsed)} (${((beforeGC.heapUsed - afterGC.heapUsed) / beforeGC.heapUsed * 100).toFixed(1)}%)`);

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      initialMemory,
      gcTests,
      averageMemoryFreed: gcTests.reduce((sum, test) => sum + test.memoryFreed, 0) / gcTests.length
    };
  }

  async generateReport(dataProcessing, memoryLeaks, garbageCollection) {
    console.log('\n📊 RAPPORT DE PERFORMANCE MÉMOIRE:');
    console.log('===================================');

    // Analyse du traitement de données
    console.log('\n🧮 TRAITEMENT DE DONNÉES:');
    dataProcessing.tests.forEach(test => {
      console.log(`   ${test.dataSize} éléments:`);
      console.log(`     ⏱️  ${Math.round(test.processingTime)}ms`);
      console.log(`     📊 ${test.itemsPerSecond} éléments/seconde`);
      console.log(`     💾 ${this.formatBytes(test.memoryIncrease.heapUsed)} utilisés`);
      console.log(`     📏 ${this.formatBytes(Math.round(test.memoryPerItem.heapUsed))} par élément`);
    });

    // Analyse des fuites mémoire
    console.log('\n🔍 DÉTECTION DE FUITES:');
    memoryLeaks.leakTests.forEach(test => {
      console.log(`   ${test.test}: ${this.formatBytes(test.memoryIncrease.heapUsed)}`);
    });

    console.log(`   🧹 Mémoire récupérée après nettoyage: ${this.formatBytes(memoryLeaks.memoryRecovered.heapUsed)}`);

    // Analyse du garbage collection
    console.log('\n♻️ GARBAGE COLLECTION:');
    console.log(`   Efficacité moyenne: ${this.formatBytes(garbageCollection.averageMemoryFreed)} libérés par itération`);

    garbageCollection.gcTests.forEach(test => {
      console.log(`   Itération ${test.iteration}: ${test.freedPercentage} de libération`);
    });

    // Évaluation globale
    console.log('\n🏆 ÉVALUATION GLOBALE:');

    const totalMemoryIncrease = dataProcessing.totalMemoryIncrease.heapUsed;
    const memoryRecovered = memoryLeaks.memoryRecovered.heapUsed;
    const recoveryRate = (memoryRecovered / totalMemoryIncrease) * 100;

    console.log(`   Augmentation totale: ${this.formatBytes(totalMemoryIncrease)}`);
    console.log(`   Récupération: ${this.formatBytes(memoryRecovered)} (${recoveryRate.toFixed(1)}%)`);

    if (recoveryRate > 80) {
      console.log('   ✅ Excellente gestion mémoire');
    } else if (recoveryRate > 60) {
      console.log('   👍 Bonne gestion mémoire');
    } else if (recoveryRate > 40) {
      console.log('   ⚠️ Gestion mémoire acceptable - surveiller les fuites');
    } else {
      console.log('   ❌ Problèmes de gestion mémoire - investigation nécessaire');
    }

    const report = {
      timestamp: new Date().toISOString(),
      dataProcessing,
      memoryLeaks,
      garbageCollection,
      summary: {
        totalMemoryIncrease: dataProcessing.totalMemoryIncrease,
        memoryRecovered: memoryLeaks.memoryRecovered,
        recoveryRate: recoveryRate.toFixed(1) + '%',
        evaluation: recoveryRate > 80 ? 'excellent' :
                   recoveryRate > 60 ? 'good' :
                   recoveryRate > 40 ? 'acceptable' : 'poor'
      }
    };

    // Sauvegarder le rapport
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join('tests', 'reports', 'memory-performance.json');

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Rapport sauvegardé: ${reportPath}`);
    return report;
  }

  async runAllTests() {
    console.log('🚀 Démarrage des tests de performance mémoire...\n');

    try {
      // Activer le garbage collection si disponible
      if (typeof global.gc === 'undefined') {
        console.log('💡 Pour des tests plus précis, lancez avec: node --expose-gc tests/performance/test-memory-usage.js\n');
      }

      const dataProcessing = await this.testDataProcessing();
      const memoryLeaks = await this.testMemoryLeaks();
      const garbageCollection = await this.testGarbageCollection();

      const report = await this.generateReport(dataProcessing, memoryLeaks, garbageCollection);

      return report;

    } catch (error) {
      console.error('❌ Erreur lors des tests mémoire:', error.message);
      return { error: error.message };
    }
  }
}

// Script principal
async function main() {
  const tester = new MemoryTester();

  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MemoryTester;
