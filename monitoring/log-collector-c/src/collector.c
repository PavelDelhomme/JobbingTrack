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
#include <errno.h>
#include <poll.h>
#include "collector.h"
#include "parser.h"
#include "storage.h"
#include "filter.h"
#include "http_server.h"

#define MAX_WATCHES 100
#define BUFFER_SIZE 8192
#define LOG_DIR "/var/lib/docker/containers"
#define DISCOVERY_INTERVAL_SEC 10
#define INOTIFY_POLL_TIMEOUT_MS 1000

/** Préfixe datetime ISO pour les logs (ex: 2026-02-20T16:30:00Z) */
static const char* log_ts(void) {
    static char buf[32];
    time_t t = time(NULL);
    struct tm *tm = gmtime(&t);
    if (tm)
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", tm);
    else
        snprintf(buf, sizeof(buf), "%ld", (long)t);
    return buf;
}

static int inotify_fd;
static int watch_count = 0;
static WatchInfo watches[MAX_WATCHES];

static int should_read_existing_logs(void) {
    const char *v = getenv("LOG_COLLECTOR_READ_EXISTING");
    return v && (strcmp(v, "1") == 0 || strcmp(v, "true") == 0);
}

static int find_watch_by_path(const char *log_path) {
    for (int i = 0; i < watch_count; i++) {
        if (strcmp(watches[i].log_path, log_path) == 0) return i;
    }
    return -1;
}

static int find_watch_by_wd(int wd) {
    for (int i = 0; i < watch_count; i++) {
        if (watches[i].watch_descriptor == wd) return i;
    }
    return -1;
}

static void remove_watch_at(int idx) {
    if (idx < 0 || idx >= watch_count) return;
    if (watches[idx].watch_descriptor >= 0) {
        inotify_rm_watch(inotify_fd, watches[idx].watch_descriptor);
    }
    if (idx != watch_count - 1) {
        watches[idx] = watches[watch_count - 1];
    }
    watch_count--;
}

static int add_container_watch(const char *container_id, const char *log_path, const struct stat *st) {
    if (find_watch_by_path(log_path) >= 0) return 0;
    if (watch_count >= MAX_WATCHES) {
        fprintf(stderr, "[%s] ⚠️  Limite de watches atteinte (%d), ignore %s\n", log_ts(), MAX_WATCHES, container_id);
        return -1;
    }

    int wd = inotify_add_watch(inotify_fd, log_path, IN_MODIFY | IN_ATTRIB | IN_MOVE_SELF | IN_DELETE_SELF);
    if (wd < 0) {
        fprintf(stderr, "[%s] ⚠️  Watch impossible pour %s: %s\n", log_ts(), log_path, strerror(errno));
        return -1;
    }

    size_t id_len = strlen(container_id);
    size_t path_len = strlen(log_path);
    if (id_len >= sizeof(watches[watch_count].container_id) || path_len >= sizeof(watches[watch_count].log_path)) {
        inotify_rm_watch(inotify_fd, wd);
        return -1;
    }

    memcpy(watches[watch_count].container_id, container_id, id_len + 1);
    memcpy(watches[watch_count].log_path, log_path, path_len + 1);
    watches[watch_count].watch_descriptor = wd;
    watches[watch_count].last_position = should_read_existing_logs() ? 0 : (long)st->st_size;
    watches[watch_count].last_seen = time(NULL);
    watch_count++;
    return 1;
}

/**
 * Initialise le système de collecte
 */
int init_log_collector(void) {
    inotify_fd = inotify_init1(IN_NONBLOCK);
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
    DIR *dir = opendir(LOG_DIR);
    if (!dir) return;

    struct dirent *entry;
    int added = 0;
    while ((entry = readdir(dir)) != NULL) {
        if (entry->d_name[0] == '.') continue;

        char container_id[64];
        strncpy(container_id, entry->d_name, sizeof(container_id) - 1);
        container_id[sizeof(container_id) - 1] = '\0';

        char log_path[512];
        snprintf(log_path, sizeof(log_path), "%s/%s/%s-json.log", LOG_DIR, container_id, container_id);

        struct stat st;
        if (stat(log_path, &st) == 0 && S_ISREG(st.st_mode)) {
            int r = add_container_watch(container_id, log_path, &st);
            if (r > 0) added++;
        }
    }
    closedir(dir);

    if (added > 0) {
        printf("[%s] 🔎 Découverte logs: %d nouveau(x) conteneur(s), %d watch(es) actif(s)\n", log_ts(), added, watch_count);
    }
}

/**
 * Traite un événement de log
 */
void process_log_event(const struct inotify_event *event) {
    // Trouver le watch correspondant
    int idx = find_watch_by_wd(event->wd);
    if (idx < 0) return;

    if (event->mask & (IN_DELETE_SELF | IN_MOVE_SELF | IN_IGNORED)) {
        printf("[%s] 🔄 Rotation/suppression détectée pour %s, watch retiré\n", log_ts(), watches[idx].container_id);
        remove_watch_at(idx);
        return;
    }

    // Lire les nouvelles lignes. Les événements fichier ont souvent len=0 : ne pas filtrer dessus.
    read_new_log_lines(&watches[idx]);
}

/**
 * Lit les nouvelles lignes d'un fichier de log
 */
void read_new_log_lines(WatchInfo *watch) {
    struct stat st;
    if (stat(watch->log_path, &st) != 0) {
        return;
    }

    if ((long)st.st_size < watch->last_position) {
        printf("[%s] 🔄 Log tronqué/rotaté pour %s, reprise au début\n", log_ts(), watch->container_id);
        watch->last_position = 0;
    }

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
    long new_position = ftell(fp);
    if (new_position >= 0) {
        watch->last_position = new_position;
        watch->last_seen = time(NULL);
    }
    
    fclose(fp);
}

/**
 * Boucle principale de collecte
 */
int main(int argc, char *argv[]) {
    /* Port d’écoute HTTP dans le conteneur : aligné stack JobbingTrack (30xx), hôte mappe 5099→3019 */
    int http_port = 3019;
    
    if (argc > 1) {
        http_port = atoi(argv[1]);
    }
    
    printf("[%s] 🚀 Collecteur de logs démarré\n", log_ts());
    
    // ✅ NOUVEAU : Initialiser le stockage PostgreSQL
    printf("[%s] 💾 Initialisation du stockage PostgreSQL...\n", log_ts());
    if (init_storage() != 0) {
        fprintf(stderr, "[%s] ⚠️  Échec initialisation PostgreSQL (les logs seront toujours disponibles via l'API HTTP)\n", log_ts());
    } else {
        printf("[%s] ✅ Stockage PostgreSQL initialisé\n", log_ts());
    }
    
    // ✅ NOUVEAU : Démarrer le serveur HTTP
    printf("[%s] 🌐 Démarrage du serveur HTTP...\n", log_ts());
    if (start_http_server(http_port) != 0) {
        fprintf(stderr, "[%s] ⚠️  Erreur démarrage serveur HTTP (continuons quand même)\n", log_ts());
    } else {
        printf("[%s] ✅ Serveur HTTP démarré sur le port %d\n", log_ts(), http_port);
        printf("[%s] 📊 API disponible sur http://localhost:%d/api/v1/logs\n", log_ts(), http_port);
    }
    
    if (init_log_collector() != 0) {
        fprintf(stderr, "[%s] Erreur initialisation\n", log_ts());
        stop_http_server();
        cleanup_storage();
        return 1;
    }
    
    printf("[%s] ✅ Surveillance de %d conteneurs\n", log_ts(), watch_count);
    
    // ✅ AMÉLIORATION : Afficher les conteneurs surveillés
    if (watch_count > 0) {
        printf("[%s] 📋 Conteneurs surveillés:\n", log_ts());
        for (int i = 0; i < watch_count && i < 10; i++) {
            printf("[%s]    - %s\n", log_ts(), watches[i].container_id);
        }
        if (watch_count > 10) {
            printf("[%s]    ... et %d autres\n", log_ts(), watch_count - 10);
        }
    } else {
        printf("[%s] ⚠️  Aucun conteneur trouvé à surveiller\n", log_ts());
        printf("💡 Vérifiez que /var/lib/docker/containers est accessible\n");
    }
    
    // Boucle principale non bloquante : inotify + redécouverte périodique des nouveaux conteneurs.
    char buffer[BUFFER_SIZE];
    time_t last_discovery = time(NULL);
    while (1) {
        struct pollfd pfd = { .fd = inotify_fd, .events = POLLIN };
        int ready = poll(&pfd, 1, INOTIFY_POLL_TIMEOUT_MS);
        if (ready < 0) {
            if (errno == EINTR) continue;
            perror("poll");
            sleep(1);
            continue;
        }

        time_t now = time(NULL);
        if (now - last_discovery >= DISCOVERY_INTERVAL_SEC) {
            discover_containers();
            last_discovery = now;
        }

        if (ready == 0) continue;

        ssize_t length = read(inotify_fd, buffer, sizeof(buffer));
        if (length < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK || errno == EINTR) {
                continue;
            }
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
            process_log_event(event);
            i += sizeof(struct inotify_event) + event->len;
        }
    }
    
    // Nettoyage (ne sera jamais atteint, mais bon pour la propreté)
    close(inotify_fd);
    stop_http_server();
    cleanup_storage();
    return 0;
}

