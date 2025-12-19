/**
 * Système de collecte de métriques en C
 * Collecteur principal ultra-léger pour remplacer Node.js
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/statvfs.h>
#include <sys/sysinfo.h>
#include <strings.h>
#include <string.h>
#include "collector.h"
#include "proc_reader.h"
#include "storage.h"
#include "http_server.h"

#define COLLECTION_INTERVAL 15  // secondes
#define MAX_CONTAINERS 100

// Structure globale pour les métriques (exportée pour http_server.c)
MetricsData global_metrics = {0};

/**
 * Collecte des métriques système
 */
int collect_system_metrics(void) {
    struct sysinfo si;
    struct statvfs vfs;
    
    if (sysinfo(&si) != 0) {
        fprintf(stderr, "Erreur sysinfo\n");
        return -1;
    }
    
    if (statvfs("/var/lib/docker", &vfs) != 0) {
        // Fallback sur /
        statvfs("/", &vfs);
    }
    
    // CPU - lecture depuis /proc/loadavg
    double load1 = 0.0, load5 = 0.0, load15 = 0.0;
    if (read_proc_loadavg(&load1, &load5, &load15) == 0) {
        global_metrics.cpu.load_1 = load1;
        global_metrics.cpu.load_5 = load5;
        global_metrics.cpu.load_15 = load15;
    }
    
    // Mémoire
    global_metrics.memory.total_mb = si.totalram / (1024 * 1024);
    global_metrics.memory.free_mb = si.freeram / (1024 * 1024);
    global_metrics.memory.used_mb = global_metrics.memory.total_mb - global_metrics.memory.free_mb;
    global_metrics.memory.usage_percent = (double)global_metrics.memory.used_mb / global_metrics.memory.total_mb * 100.0;
    
    // Disque Docker uniquement
    unsigned long total_bytes = vfs.f_blocks * vfs.f_frsize;
    unsigned long free_bytes = vfs.f_bavail * vfs.f_frsize;
    unsigned long used_bytes = total_bytes - free_bytes;
    
    global_metrics.disk.total_gb = total_bytes / (1024.0 * 1024.0 * 1024.0);
    global_metrics.disk.used_gb = used_bytes / (1024.0 * 1024.0 * 1024.0);
    global_metrics.disk.free_gb = free_bytes / (1024.0 * 1024.0 * 1024.0);
    global_metrics.disk.usage_percent = (double)used_bytes / total_bytes * 100.0;
    
    global_metrics.timestamp = time(NULL);
    
    return 0;
}

/**
 * Collecte des métriques des conteneurs Docker (amélioré avec réseau)
 */
int collect_container_metrics(void) {
    // Compter les conteneurs Docker actifs
    FILE *fp = popen("docker ps -q 2>/dev/null | wc -l", "r");
    if (fp) {
        int count = 0;
        if (fscanf(fp, "%d", &count) == 1) {
            global_metrics.container_count = count;
        }
        pclose(fp);
    }
    
    // Collecter les stats détaillées des conteneurs JobbingTrack
    FILE *stats_fp = popen("docker stats --no-stream --format '{{json .}}' $(docker ps --filter 'name=jobbingtrack-' --format '{{.Names}}' 2>/dev/null | tr '\\n' ' ') 2>/dev/null", "r");
    if (stats_fp) {
        char line[4096];
        int container_idx = 0;
        unsigned long total_rx = 0, total_tx = 0;
        
        while (fgets(line, sizeof(line), stats_fp) && container_idx < 100) {
            // Parser JSON basique pour extraire NetIO (format: "1.2MB / 3.4MB")
            char *netio_start = strstr(line, "\"NetIO\":\"");
            if (netio_start) {
                netio_start += 9; // Skip "NetIO":"
                char *netio_end = strstr(netio_start, "\"");
                if (netio_end) {
                    *netio_end = '\0';
                    // Parser "1.2MB / 3.4MB" -> extraire les valeurs
                    char *slash = strstr(netio_start, " / ");
                    if (slash) {
                        *slash = '\0';
                        // Parser RX (avant le slash)
                        double rx_val = 0.0;
                        char rx_unit[4] = {0};
                        if (sscanf(netio_start, "%lf%s", &rx_val, rx_unit) == 2) {
                            unsigned long rx_bytes = (unsigned long)(rx_val * 1024 * 1024); // Convertir MB en bytes
                            if (strcmp(rx_unit, "GB") == 0) rx_bytes *= 1024;
                            else if (strcmp(rx_unit, "KB") == 0) rx_bytes /= 1024;
                            
                            // Parser TX (après le slash)
                            double tx_val = 0.0;
                            char tx_unit[4] = {0};
                            if (sscanf(slash + 3, "%lf%s", &tx_val, tx_unit) == 2) {
                                unsigned long tx_bytes = (unsigned long)(tx_val * 1024 * 1024);
                                if (strcmp(tx_unit, "GB") == 0) tx_bytes *= 1024;
                                else if (strcmp(tx_unit, "KB") == 0) tx_bytes /= 1024;
                                
                                total_rx += rx_bytes;
                                total_tx += tx_bytes;
                                
                                // Extraire le nom du conteneur
                                char *name_start = strstr(line, "\"Name\":\"");
                                if (name_start) {
                                    name_start += 8;
                                    char *name_end = strstr(name_start, "\"");
                                    if (name_end && container_idx < 100) {
                                        size_t name_len = name_end - name_start;
                                        if (name_len < sizeof(global_metrics.containers[container_idx].name)) {
                                            strncpy(global_metrics.containers[container_idx].name, name_start, name_len);
                                            global_metrics.containers[container_idx].name[name_len] = '\0';
                                            global_metrics.containers[container_idx].network_rx_bytes = rx_bytes;
                                            global_metrics.containers[container_idx].network_tx_bytes = tx_bytes;
                                            container_idx++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        pclose(stats_fp);
    }
    
    // Mettre à jour le nombre de conteneurs JobbingTrack trouvés
    global_metrics.container_count = container_idx > 0 ? container_idx : name_count;
    
    // Debug: afficher le nombre de conteneurs trouvés
    if (container_idx > 0) {
        printf("[CONTAINERS] %d conteneurs JobbingTrack trouvés\n", container_idx);
    }
    
    // Mesurer les temps de réponse HTTP pour les services JobbingTrack
    for (int i = 0; i < global_metrics.container_count && i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            // Construire l'URL de health check (format: http://service-name:port/health)
            char health_url[512];
            snprintf(health_url, sizeof(health_url), "http://%s/health", global_metrics.containers[i].name);
            
            // Mesurer le temps de réponse avec curl
            char curl_cmd[1024];
            snprintf(curl_cmd, sizeof(curl_cmd),
                "curl -s -o /dev/null -w '%%{time_total},%%{http_code}' --max-time 2 %s 2>/dev/null",
                health_url);
            
            FILE *curl_fp = popen(curl_cmd, "r");
            if (curl_fp) {
                char response[64];
                if (fgets(response, sizeof(response), curl_fp)) {
                    double time_total = 0.0;
                    int http_code = 0;
                    if (sscanf(response, "%lf,%d", &time_total, &http_code) == 2) {
                        global_metrics.containers[i].response_time_ms = time_total * 1000.0; // Convertir en ms
                        global_metrics.containers[i].http_status = http_code;
                    }
                }
                pclose(curl_fp);
            }
        }
    }
    
    return 0;
}

/**
 * Boucle principale de collecte
 */
int main(int argc, char *argv[]) {
    int interval = COLLECTION_INTERVAL;
    
    // Parser arguments
    if (argc > 1) {
        interval = atoi(argv[1]);
        if (interval < 5) interval = 5;  // Minimum 5 secondes
    }
    
    printf("🚀 Collecteur de métriques démarré (intervalle: %ds)\n", interval);
    
    // Démarrer le serveur HTTP AVANT de commencer la collecte
    printf("🌐 Démarrage du serveur HTTP...\n");
    if (start_http_server() != 0) {
        fprintf(stderr, "⚠️  Erreur démarrage serveur HTTP\n");
    } else {
        // Attendre que le serveur soit prêt
        sleep(1);
    }
    
    // Collecter une première fois pour avoir des données
    printf("📊 Première collecte des métriques...\n");
    if (collect_system_metrics() != 0) {
        fprintf(stderr, "Erreur collecte système\n");
    }
    if (collect_container_metrics() != 0) {
        fprintf(stderr, "Erreur collecte conteneurs\n");
    }
    
    // Boucle infinie de collecte
    while (1) {
        printf("[%ld] Collecte des métriques...\n", time(NULL));
        
        // Collecter métriques système
        if (collect_system_metrics() != 0) {
            fprintf(stderr, "Erreur collecte système\n");
        }
        
        // Collecter métriques conteneurs
        if (collect_container_metrics() != 0) {
            fprintf(stderr, "Erreur collecte conteneurs\n");
        }
        
        // Sauvegarder en base de données
        if (save_metrics_to_db(&global_metrics) != 0) {
            fprintf(stderr, "Erreur sauvegarde DB\n");
        }
        
        // Attendre avant la prochaine collecte
        sleep(interval);
    }
    
    return 0;
}

