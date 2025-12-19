/**
 * Système de collecte de logs ultra-performant en C
 * Remplace Loki avec une consommation minimale
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/inotify.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <dirent.h>
#include <pthread.h>
#include "collector.h"
#include "parser.h"
#include "storage.h"
#include "filter.h"

#define MAX_WATCHES 100
#define BUFFER_SIZE 8192
#define LOG_DIR "/var/lib/docker/containers"

static int inotify_fd;
static int watch_count = 0;
static WatchInfo watches[MAX_WATCHES];

/**
 * Initialise le système de collecte
 */
int init_log_collector(void) {
    inotify_fd = inotify_init();
    if (inotify_fd < 0) {
        perror("inotify_init");
        return -1;
    }
    
    // Découvrir les conteneurs Docker
    discover_containers();
    
    return 0;
}

/**
 * Découvre les conteneurs Docker à surveiller
 */
void discover_containers(void) {
    // Lister les conteneurs via Docker API (utiliser curl avec socket Unix)
    FILE *fp = popen("curl -s --unix-socket /var/run/docker.sock http://localhost/containers/json 2>/dev/null | grep -o '\"Id\":\"[^\"]*\"' | cut -d'\"' -f4", "r");
    if (!fp) {
        // Fallback : lister directement les répertoires dans /var/lib/docker/containers
        DIR *dir = opendir(LOG_DIR);
        if (!dir) return;
        
        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL && watch_count < MAX_WATCHES) {
            if (entry->d_name[0] == '.') continue;
            
            char container_id[64];
            strncpy(container_id, entry->d_name, sizeof(container_id) - 1);
            container_id[sizeof(container_id) - 1] = '\0';
            
            char log_path[512];
            snprintf(log_path, sizeof(log_path), "%s/%s/%s-json.log", 
                     LOG_DIR, container_id, container_id);
            
            struct stat st;
            if (stat(log_path, &st) == 0) {
                int wd = inotify_add_watch(inotify_fd, log_path, IN_MODIFY);
                if (wd >= 0) {
                    strncpy(watches[watch_count].container_id, container_id, sizeof(watches[watch_count].container_id) - 1);
                    strncpy(watches[watch_count].log_path, log_path, sizeof(watches[watch_count].log_path) - 1);
                    watches[watch_count].watch_descriptor = wd;
                    watch_count++;
                }
            }
        }
        closedir(dir);
        return;
    }
    
    char container_id[64];
    while (fgets(container_id, sizeof(container_id), fp) && watch_count < MAX_WATCHES) {
        // Nettoyer le ID
        container_id[strcspn(container_id, "\n")] = 0;
        
        // Chemin du fichier de log
        char log_path[512];
        snprintf(log_path, sizeof(log_path), "%s/%s/%s-json.log", 
                 LOG_DIR, container_id, container_id);
        
        // Vérifier si le fichier existe
        struct stat st;
        if (stat(log_path, &st) == 0) {
            // Ajouter un watch
            int wd = inotify_add_watch(inotify_fd, log_path, IN_MODIFY);
            if (wd >= 0) {
                strncpy(watches[watch_count].container_id, container_id, sizeof(watches[watch_count].container_id) - 1);
                strncpy(watches[watch_count].log_path, log_path, sizeof(watches[watch_count].log_path) - 1);
                watches[watch_count].watch_descriptor = wd;
                watch_count++;
            }
        }
    }
    
    pclose(fp);
}

/**
 * Traite un événement de log
 */
void process_log_event(const struct inotify_event *event) {
    // Trouver le watch correspondant
    for (int i = 0; i < watch_count; i++) {
        if (watches[i].watch_descriptor == event->wd) {
            // Lire les nouvelles lignes
            read_new_log_lines(&watches[i]);
            break;
        }
    }
}

/**
 * Lit les nouvelles lignes d'un fichier de log
 */
void read_new_log_lines(WatchInfo *watch) {
    FILE *fp = fopen(watch->log_path, "r");
    if (!fp) return;
    
    // Aller à la position de la dernière lecture
    fseek(fp, watch->last_position, SEEK_SET);
    
    char line[BUFFER_SIZE];
    while (fgets(line, sizeof(line), fp)) {
        // Parser la ligne JSON Docker
        LogEntry entry;
        if (parse_docker_log_line(line, &entry) == 0) {
            // Filtrer les logs (niveau, service, etc.)
            if (should_process_log(&entry)) {
                // Stocker en base de données
                store_log_entry(&entry);
            }
        }
    }
    
    // Sauvegarder la nouvelle position
    watch->last_position = ftell(fp);
    fclose(fp);
}

/**
 * Boucle principale de collecte
 */
int main(int argc __attribute__((unused)), char *argv[] __attribute__((unused))) {
    printf("🚀 Collecteur de logs démarré\n");
    
    if (init_log_collector() != 0) {
        fprintf(stderr, "Erreur initialisation\n");
        return 1;
    }
    
    printf("✅ Surveillance de %d conteneurs\n", watch_count);
    
    // Boucle principale
    char buffer[BUFFER_SIZE];
    while (1) {
        ssize_t length = read(inotify_fd, buffer, BUFFER_SIZE);
        if (length < 0) {
            perror("read");
            break;
        }
        
        // Traiter les événements
        int i = 0;
        while (i < length) {
            struct inotify_event *event = (struct inotify_event *)&buffer[i];
            process_log_event(event);
            i += sizeof(struct inotify_event) + event->len;
        }
    }
    
    close(inotify_fd);
    return 0;
}

