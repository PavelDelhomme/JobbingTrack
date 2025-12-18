/**
 * Filtrage des logs
 */

#include "filter.h"
#include <string.h>
#include <regex.h>

static regex_t error_regex;
static regex_t warn_regex;
static int regex_compiled = 0;

/**
 * Initialise les regex de filtrage
 */
int init_filters(void) {
    if (regex_compiled) return 0;
    
    if (regcomp(&error_regex, "error|ERROR|Error|exception|Exception", REG_ICASE | REG_EXTENDED) != 0) {
        return -1;
    }
    
    if (regcomp(&warn_regex, "warn|WARN|Warn|warning|WARNING", REG_ICASE | REG_EXTENDED) != 0) {
        return -1;
    }
    
    regex_compiled = 1;
    return 0;
}

/**
 * Détermine si un log doit être traité
 */
int should_process_log(const LogEntry *entry) {
    if (!regex_compiled) {
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
 * Nettoie les ressources
 */
void cleanup_filters(void) {
    if (regex_compiled) {
        regfree(&error_regex);
        regfree(&warn_regex);
        regex_compiled = 0;
    }
}

