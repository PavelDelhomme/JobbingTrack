/**
 * Filtrage des logs
 */

#include "filter.h"
#include <string.h>
// Utiliser strstr au lieu de regex pour éviter les dépendances
// #include <regex.h>

// Utiliser strstr au lieu de regex
static int filters_initialized = 0;

/**
 * Initialise les filtres (simplifié sans regex)
 */
int init_filters(void) {
    filters_initialized = 1;
    return 0;
}

/**
 * Détermine si un log doit être traité (version simplifiée)
 */
int should_process_log(const LogEntry *entry) {
    if (!filters_initialized) {
        init_filters();
    }
    
    // Toujours traiter les erreurs et warnings
    if (strcmp(entry->level, "ERROR") == 0 || strcmp(entry->level, "WARN") == 0) {
        return 1;
    }
    
    // Filtrer les logs de debug en production
    if (strcmp(entry->level, "DEBUG") == 0) {
        return 0;  // Ignorer les DEBUG
    }
    
    // Traiter les INFO
    return 1;
}

/**
 * Nettoie les ressources (simplifié)
 */
void cleanup_filters(void) {
    filters_initialized = 0;
}

