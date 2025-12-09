/**
 * Tests pour le système de cache
 */

const { cacheManager } = require('../../frontend/src/lib/cache/cacheManager');

describe('CacheManager', () => {
  beforeEach(async () => {
    await cacheManager.clear();
  });

  test('devrait stocker et récupérer des données', async () => {
    const testData = { test: 'data' };
    await cacheManager.set('test-key', testData, { ttl: 60000 });
    const retrieved = await cacheManager.get('test-key');
    expect(retrieved).toEqual(testData);
  });

  test('devrait expirer les données après TTL', async () => {
    const testData = { test: 'data' };
    await cacheManager.set('test-key', testData, { ttl: 100 }); // 100ms
    await new Promise(resolve => setTimeout(resolve, 150));
    const retrieved = await cacheManager.get('test-key');
    expect(retrieved).toBeNull();
  });

  test('devrait gérer les erreurs gracieusement', async () => {
    const result = await cacheManager.get('non-existent-key');
    expect(result).toBeNull();
  });

  test('devrait nettoyer les entrées expirées', async () => {
    await cacheManager.set('key1', 'data1', { ttl: 100 });
    await cacheManager.set('key2', 'data2', { ttl: 1000 });
    await new Promise(resolve => setTimeout(resolve, 150));
    await cacheManager.cleanupExpired();
    expect(await cacheManager.get('key1')).toBeNull();
    expect(await cacheManager.get('key2')).not.toBeNull();
  });
});

