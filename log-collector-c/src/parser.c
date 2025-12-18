/**
 * Parseur de logs Docker JSON (version simplifiée sans json-c)
 */

#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/**
 * Parse une ligne de log Docker JSON (version simplifiée)
 */
int parse_docker_log_line(const char *line, LogEntry *entry) {
    // Parser JSON basique sans bibliothèque
    // Format Docker: {"log":"...","stream":"stdout","time":"..."}
    
    const char *log_start = strstr(line, "\"log\":\"");
    const char *time_start = strstr(line, "\"time\":\"");
    
    if (!log_start) return -1;
    
    // Extraire le message
    log_start += 7; // Skip "log":"
    const char *log_end = strstr(log_start, "\"");
    if (log_end) {
        size_t len = log_end - log_start;
        if (len > sizeof(entry->message) - 1) len = sizeof(entry->message) - 1;
        strncpy(entry->message, log_start, len);
        entry->message[len] = '\0';
    }
    
    // Extraire le timestamp
    if (time_start) {
        time_start += 8; // Skip "time":"
        // Parser ISO 8601 basique: 2024-01-01T12:00:00
        struct tm tm = {0};
        if (strptime(time_start, "%Y-%m-%dT%H:%M:%S", &tm) != NULL) {
            entry->timestamp = mktime(&tm);
        } else {
            entry->timestamp = time(NULL);
        }
    } else {
        entry->timestamp = time(NULL);
    }
    
    // Détecter le niveau
    if (strstr(entry->message, "ERROR") || strstr(entry->message, "error")) {
        strcpy(entry->level, "ERROR");
    } else if (strstr(entry->message, "WARN") || strstr(entry->message, "warn")) {
        strcpy(entry->level, "WARN");
    } else if (strstr(entry->message, "DEBUG") || strstr(entry->message, "debug")) {
        strcpy(entry->level, "DEBUG");
    } else {
        strcpy(entry->level, "INFO");
    }
    
    return 0;
}

