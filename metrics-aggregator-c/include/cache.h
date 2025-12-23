/**
 * Système de cache en mémoire pour optimiser les performances
 * Cache les résultats des requêtes fréquentes avec TTL
 */

#ifndef CACHE_H
#define CACHE_H

#include <time.h>
#include <stdbool.h>

#define CACHE_MAX_ENTRIES 1000
#define CACHE_DEFAULT_TTL 30  // 30 secondes par défaut

typedef struct CacheEntry {
    char *key;
    void *data;
    size_t data_size;
    time_t expires_at;
    struct CacheEntry *next;
    struct CacheEntry *prev;
} CacheEntry;

typedef struct {
    CacheEntry *entries[CACHE_MAX_ENTRIES];
    size_t count;
    time_t default_ttl;
} Cache;

// Initialiser le cache
Cache* cache_init(time_t default_ttl);

// Libérer le cache
void cache_free(Cache *cache);

// Obtenir une valeur du cache
void* cache_get(Cache *cache, const char *key);

// Mettre une valeur dans le cache
bool cache_set(Cache *cache, const char *key, void *data, size_t data_size, time_t ttl);

// Supprimer une entrée du cache
bool cache_delete(Cache *cache, const char *key);

// Nettoyer les entrées expirées
void cache_cleanup(Cache *cache);

// Obtenir la taille du cache
size_t cache_size(Cache *cache);

#endif // CACHE_H

