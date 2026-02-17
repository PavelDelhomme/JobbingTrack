/**
 * Implémentation du système de cache en mémoire
 * Cache avec TTL pour optimiser les performances
 */

#include "cache.h"
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdio.h>

// Fonction de hash simple (djb2)
static unsigned long hash(const char *str) {
    unsigned long hash = 5381;
    int c;
    while ((c = *str++)) {
        hash = ((hash << 5) + hash) + c; // hash * 33 + c
    }
    return hash % CACHE_MAX_ENTRIES;
}

Cache* cache_init(time_t default_ttl) {
    Cache *cache = (Cache*)calloc(1, sizeof(Cache));
    if (!cache) return NULL;
    
    cache->default_ttl = default_ttl > 0 ? default_ttl : CACHE_DEFAULT_TTL;
    cache->count = 0;
    
    return cache;
}

void cache_free(Cache *cache) {
    if (!cache) return;
    
    for (size_t i = 0; i < CACHE_MAX_ENTRIES; i++) {
        CacheEntry *entry = cache->entries[i];
        while (entry) {
            CacheEntry *next = entry->next;
            free(entry->key);
            free(entry->data);
            free(entry);
            entry = next;
        }
    }
    free(cache);
}

void* cache_get(Cache *cache, const char *key) {
    if (!cache || !key) return NULL;
    
    unsigned long index = hash(key);
    CacheEntry *entry = cache->entries[index];
    
    time_t now = time(NULL);
    
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            // Vérifier si l'entrée a expiré
            if (entry->expires_at > now) {
                return entry->data;
            } else {
            // Entrée expirée, la supprimer
            CacheEntry *prev_entry = cache->entries[index];
            CacheEntry *prev = NULL;
            while (prev_entry && prev_entry != entry) {
                prev = prev_entry;
                prev_entry = prev_entry->next;
            }
            if (prev) {
                prev->next = entry->next;
            } else {
                cache->entries[index] = entry->next;
            }
            if (entry->next) {
                entry->next->prev = prev;
            }
                free(entry->key);
                free(entry->data);
                free(entry);
                cache->count--;
                return NULL;
            }
        }
        entry = entry->next;
    }
    
    return NULL;
}

bool cache_set(Cache *cache, const char *key, void *data, size_t data_size, time_t ttl) {
    if (!cache || !key || !data) return false;
    
    // ✅ OPTIMISATION : Stratégie d'éviction LRU (Least Recently Used)
    // Si le cache est plein, supprimer les entrées les plus anciennes
    if (cache->count >= CACHE_MAX_ENTRIES) {
        // Nettoyer d'abord les entrées expirées
        cache_cleanup(cache);
        
        // Si toujours plein, supprimer les 10% les plus anciennes (LRU)
        if (cache->count >= CACHE_MAX_ENTRIES) {
            int to_remove = CACHE_MAX_ENTRIES / 10;
            time_t now = time(NULL);
            
            for (size_t i = 0; i < CACHE_MAX_ENTRIES && to_remove > 0; i++) {
                CacheEntry *entry = cache->entries[i];
                CacheEntry *prev = NULL;
                
                while (entry && to_remove > 0) {
                    // Supprimer les entrées les plus anciennes (expires_at le plus petit)
                    if (entry->expires_at < now + 60) { // Entrées qui expirent dans moins d'1 minute
                        CacheEntry *next = entry->next;
                        if (prev) {
                            prev->next = next;
                        } else {
                            cache->entries[i] = next;
                        }
                        if (next) {
                            next->prev = prev;
                        }
                        free(entry->key);
                        free(entry->data);
                        free(entry);
                        cache->count--;
                        to_remove--;
                        entry = next;
                    } else {
                        prev = entry;
                        entry = entry->next;
                    }
                }
            }
        }
    }
    
    unsigned long index = hash(key);
    time_t now = time(NULL);
    time_t expires_at = now + (ttl > 0 ? ttl : cache->default_ttl);
    
    // Chercher si l'entrée existe déjà
    CacheEntry *entry = cache->entries[index];
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            // Mettre à jour l'entrée existante
            free(entry->data);
            entry->data = malloc(data_size);
            if (!entry->data) return false;
            memcpy(entry->data, data, data_size);
            entry->data_size = data_size;
            entry->expires_at = expires_at;
            return true;
        }
        entry = entry->next;
    }
    
    // Créer une nouvelle entrée
    entry = (CacheEntry*)calloc(1, sizeof(CacheEntry));
    if (!entry) return false;
    
    entry->key = strdup(key);
    if (!entry->key) {
        free(entry);
        return false;
    }
    
    entry->data = malloc(data_size);
    if (!entry->data) {
        free(entry->key);
        free(entry);
        return false;
    }
    
    memcpy(entry->data, data, data_size);
    entry->data_size = data_size;
    entry->expires_at = expires_at;
    entry->next = cache->entries[index];
    if (entry->next) {
        entry->next->prev = entry;
    }
    cache->entries[index] = entry;
    cache->count++;
    
    return true;
}

bool cache_delete(Cache *cache, const char *key) {
    if (!cache || !key) return false;
    
    unsigned long index = hash(key);
    CacheEntry *entry = cache->entries[index];
    
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            if (entry->prev) {
                entry->prev->next = entry->next;
            } else {
                cache->entries[index] = entry->next;
            }
            if (entry->next) {
                entry->next->prev = entry->prev;
            }
            free(entry->key);
            free(entry->data);
            free(entry);
            cache->count--;
            return true;
        }
        entry = entry->next;
    }
    
    return false;
}

void cache_cleanup(Cache *cache) {
    if (!cache) return;
    
    time_t now = time(NULL);
    
    for (size_t i = 0; i < CACHE_MAX_ENTRIES; i++) {
        CacheEntry *entry = cache->entries[i];
        CacheEntry *prev = NULL;
        
        while (entry) {
            if (entry->expires_at <= now) {
                // Supprimer l'entrée expirée
                CacheEntry *next = entry->next;
                if (prev) {
                    prev->next = next;
                } else {
                    cache->entries[i] = next;
                }
                if (next) {
                    next->prev = prev;
                }
                free(entry->key);
                free(entry->data);
                free(entry);
                cache->count--;
                entry = next;
            } else {
                prev = entry;
                entry = entry->next;
            }
        }
    }
}

size_t cache_size(Cache *cache) {
    return cache ? cache->count : 0;
}

