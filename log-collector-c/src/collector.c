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
#include "http_server.h"

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
                    size_t id_len = strlen(container_id);
                    size_t path_len = strlen(log_path);
                    if (id_len < sizeof(watches[watch_count].container_id) && 
                        path_len < sizeof(watches[watch_count].log_path)) {
                        memcpy(watches[watch_count].container_id, container_id, id_len + 1);
                        memcpy(watches[watch_count].log_path, log_path, path_len + 1);
                        watches[watch_count].watch_descriptor = wd;
                        watch_count++;
                    }
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
                size_t id_len = strlen(container_id);
                size_t path_len = strlen(log_path);
                if (id_len < sizeof(watches[watch_count].container_id) && 
                    path_len < sizeof(watches[watch_count].log_path)) {
                    memcpy(watches[watch_count].container_id, container_id, id_len + 1);
                    memcpy(watches[watch_count].log_path, log_path, path_len + 1);
                    watches[watch_count].watch_descriptor = wd;
                    watch_count++;
                }
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
    if (!fp) {
        // Debug: afficher si le fichier n'existe pas
        // printf("[DEBUG] Impossible d'ouvrir %s\n", watch->log_path);
        return;
    }
    
    // Aller à la position de la dernière lecture
    if (fseek(fp, watch->last_position, SEEK_SET) != 0) {
        // Si la position est invalide, aller au début
        fseek(fp, 0, SEEK_SET);
        watch->last_position = 0;
    }
    
    char line[BUFFER_SIZE];
    int lines_read = 0;
    while (fgets(line, sizeof(line), fp)) {
        lines_read++;
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
    long new_position = ftell(fp);
    if (new_position >= 0) {
        watch->last_position = new_position;
    }
    
    // Debug: afficher si des lignes ont été lues
    // if (lines_read > 0) {
    //     printf("[DEBUG] %d lignes lues depuis %s\n", lines_read, watch->container_id);
    // }
    
    fclose(fp);
}

/**
 * Boucle principale de collecte
 */
int main(int argc, char *argv[]) {
    int http_port = 5099;
    
    if (argc > 1) {
        http_port = atoi(argv[1]);
    }
    
    printf("🚀 Collecteur de logs démarré\n");
    
    // ✅ NOUVEAU : Initialiser le stockage PostgreSQL
    printf("💾 Initialisation du stockage PostgreSQL...\n");
    if (init_storage() != 0) {
        fprintf(stderr, "⚠️  Échec initialisation PostgreSQL (les logs seront toujours disponibles via l'API HTTP)\n");
    } else {
        printf("✅ Stockage PostgreSQL initialisé\n");
    }
    
    // ✅ NOUVEAU : Démarrer le serveur HTTP
    printf("🌐 Démarrage du serveur HTTP...\n");
    if (start_http_server(http_port) != 0) {
        fprintf(stderr, "⚠️  Erreur démarrage serveur HTTP (continuons quand même)\n");
    } else {
        printf("✅ Serveur HTTP démarré sur le port %d\n", http_port);
        printf("📊 API disponible sur http://localhost:%d/api/v1/logs\n", http_port);
    }
    
    if (init_log_collector() != 0) {
        fprintf(stderr, "Erreur initialisation\n");
        stop_http_server();
        cleanup_storage();
        return 1;
    }
    
    printf("✅ Surveillance de %d conteneurs\n", watch_count);
    
    // ✅ AMÉLIORATION : Afficher les conteneurs surveillés
    if (watch_count > 0) {
        printf("📋 Conteneurs surveillés:\n");
        for (int i = 0; i < watch_count && i < 10; i++) {
            printf("   - %s\n", watches[i].container_id);
        }
        if (watch_count > 10) {
            printf("   ... et %d autres\n", watch_count - 10);
        }
    } else {
        printf("⚠️  Aucun conteneur trouvé à surveiller\n");
        printf("💡 Vérifiez que /var/lib/docker/containers est accessible\n");
    }
    
    // Boucle principale
    char buffer[BUFFER_SIZE];
    while (1) {
        ssize_t length = read(inotify_fd, buffer, BUFFER_SIZE);
        if (length < 0) {
            perror("read");
            // Réessayer après une courte pause
            sleep(1);
            continue;
        }
        
        if (length == 0) {
            // Pas d'événements, continuer
            continue;
        }
        
        // Traiter les événements
        int i = 0;
        while (i < length) {
            struct inotify_event *event = (struct inotify_event *)&buffer[i];
            if (event->len > 0) {
                process_log_event(event);
            }
            i += sizeof(struct inotify_event) + event->len;
        }
    }
    
    // Nettoyage (ne sera jamais atteint, mais bon pour la propreté)
    close(inotify_fd);
    stop_http_server();
    cleanup_storage();
    return 0;
}

