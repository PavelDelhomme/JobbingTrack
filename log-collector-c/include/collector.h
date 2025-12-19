#ifndef COLLECTOR_H
#define COLLECTOR_H

#include <time.h>
#include <sys/inotify.h>

// Structure pour un watch inotify
typedef struct {
    char container_id[64];
    char log_path[512];
    int watch_descriptor;
    long last_position;
} WatchInfo;

// Structure pour une entrée de log
typedef struct {
    time_t timestamp;
    char container_id[64];
    char container_name[256];
    char level[16];  // INFO, WARN, ERROR, DEBUG
    char message[2048];
    char source[128];  // service name
    double response_time_ms;  // Temps de réponse HTTP détecté (0 si non détecté)
    int http_status;            // Code HTTP détecté (0 si non détecté)
    int is_error;               // 1 si erreur détectée, 0 sinon
} LogEntry;

// Fonctions principales
int init_log_collector(void);
void discover_containers(void);
void process_log_event(const struct inotify_event *event);
void read_new_log_lines(WatchInfo *watch);
int parse_docker_log_line(const char *line, LogEntry *entry);
int should_process_log(const LogEntry *entry);
int store_log_entry(const LogEntry *entry);

#endif // COLLECTOR_H

