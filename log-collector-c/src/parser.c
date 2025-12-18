/**
 * Parseur de logs Docker JSON
 */

#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <json-c/json.h>

/**
 * Parse une ligne de log Docker JSON
 */
int parse_docker_log_line(const char *line, LogEntry *entry) {
    json_object *json = json_tokener_parse(line);
    if (!json) return -1;
    
    json_object *log_obj, *time_obj, *stream_obj;
    
    // Extraire le timestamp
    if (json_object_object_get_ex(json, "time", &time_obj)) {
        const char *time_str = json_object_get_string(time_obj);
        // Parser le timestamp ISO 8601
        struct tm tm = {0};
        strptime(time_str, "%Y-%m-%dT%H:%M:%S", &tm);
        entry->timestamp = mktime(&tm);
    } else {
        entry->timestamp = time(NULL);
    }
    
    // Extraire le log
    if (json_object_object_get_ex(json, "log", &log_obj)) {
        const char *log_str = json_object_get_string(log_obj);
        strncpy(entry->message, log_str, sizeof(entry->message) - 1);
        
        // Détecter le niveau (INFO, WARN, ERROR, DEBUG)
        if (strstr(log_str, "ERROR") || strstr(log_str, "error")) {
            strcpy(entry->level, "ERROR");
        } else if (strstr(log_str, "WARN") || strstr(log_str, "warn")) {
            strcpy(entry->level, "WARN");
        } else if (strstr(log_str, "DEBUG") || strstr(log_str, "debug")) {
            strcpy(entry->level, "DEBUG");
        } else {
            strcpy(entry->level, "INFO");
        }
    }
    
    // Extraire le stream (stdout/stderr)
    if (json_object_object_get_ex(json, "stream", &stream_obj)) {
        const char *stream = json_object_get_string(stream_obj);
        // Utiliser stream pour déterminer le niveau si nécessaire
    }
    
    json_object_put(json);
    return 0;
}

