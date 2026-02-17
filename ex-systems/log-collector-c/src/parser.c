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
    
    // ✅ AMÉLIORATION : Détecter le niveau avec plus de patterns
    // Détecter les erreurs de sécurité
    if (strstr(entry->message, "ERROR") || strstr(entry->message, "error") || 
        strstr(entry->message, "ERR") || strstr(entry->message, "Exception") ||
        strstr(entry->message, "Failed") || strstr(entry->message, "failed") ||
        strstr(entry->message, "FATAL") || strstr(entry->message, "fatal") ||
        strstr(entry->message, "CRITICAL") || strstr(entry->message, "critical") ||
        strstr(entry->message, "unauthorized") || strstr(entry->message, "Unauthorized") ||
        strstr(entry->message, "forbidden") || strstr(entry->message, "Forbidden") ||
        strstr(entry->message, "attack") || strstr(entry->message, "Attack") ||
        strstr(entry->message, "threat") || strstr(entry->message, "Threat") ||
        strstr(entry->message, "malicious") || strstr(entry->message, "Malicious")) {
        strcpy(entry->level, "ERROR");
    } else if (strstr(entry->message, "WARN") || strstr(entry->message, "warn") ||
               strstr(entry->message, "Warning") || strstr(entry->message, "warning") ||
               strstr(entry->message, "suspicious") || strstr(entry->message, "Suspicious")) {
        strcpy(entry->level, "WARN");
    } else if (strstr(entry->message, "DEBUG") || strstr(entry->message, "debug")) {
        strcpy(entry->level, "DEBUG");
    } else {
        strcpy(entry->level, "INFO");
    }
    
    // ✅ AMÉLIORATION : Extraire le nom du conteneur depuis le message si disponible
    // Chercher des patterns comme "jobbingtrack-auth-service" ou "auth-service"
    if (entry->container_name[0] == '\0') {
        const char *jobbingtrack = strstr(entry->message, "jobbingtrack-");
        if (jobbingtrack) {
            const char *name_start = jobbingtrack + 13; // Skip "jobbingtrack-"
            const char *name_end = name_start;
            while (*name_end && *name_end != ' ' && *name_end != '\t' && *name_end != '\n' && 
                   *name_end != ':' && *name_end != '[' && *name_end != '(') {
                name_end++;
            }
            size_t name_len = name_end - name_start;
            if (name_len > 0 && name_len < sizeof(entry->container_name)) {
                strncpy(entry->container_name, name_start, name_len);
                entry->container_name[name_len] = '\0';
            }
        }
    }
    
    // ✅ AMÉLIORATION : Extraire le service source depuis le message
    if (entry->source[0] == '\0' && entry->container_name[0] != '\0') {
        strncpy(entry->source, entry->container_name, sizeof(entry->source) - 1);
        entry->source[sizeof(entry->source) - 1] = '\0';
    }
    
    // Initialiser les champs de métriques
    entry->response_time_ms = 0.0;
    entry->http_status = 0;
    entry->is_error = (strcmp(entry->level, "ERROR") == 0) ? 1 : 0;
    
    // Détecter les temps de réponse HTTP dans les logs
    // Format typique: "GET /api/v1/... 200 123ms" ou "Response time: 123ms" ou "took 123ms"
    const char *msg = entry->message;
    
    // Chercher "123ms" ou "123 ms"
    const char *ms_pos = strstr(msg, "ms");
    if (ms_pos) {
        // Chercher le nombre avant "ms"
        const char *num_end = ms_pos;
        while (num_end > msg && (*(num_end-1) == ' ' || *(num_end-1) == '\t')) num_end--;
        const char *num_start = num_end;
        while (num_start > msg && ((*(num_start-1) >= '0' && *(num_start-1) <= '9') || *(num_start-1) == '.')) {
            num_start--;
        }
        if (num_start < num_end) {
            char num_str[32] = {0};
            size_t num_len = num_end - num_start;
            if (num_len < sizeof(num_str)) {
                strncpy(num_str, num_start, num_len);
                entry->response_time_ms = atof(num_str);
            }
        }
    }
    
    // Détecter les codes HTTP (200, 404, 500, etc.)
    // Chercher des patterns comme "200", "404", "500" dans le message
    for (int code = 200; code <= 599; code++) {
        char code_str[8];
        snprintf(code_str, sizeof(code_str), "%d", code);
        if (strstr(msg, code_str)) {
            entry->http_status = code;
            if (code >= 400) {
                entry->is_error = 1;
            }
            break;
        }
    }
    
    return 0;
}

