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
#include "collector.h"
#include "proc_reader.h"
#include "storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <sys/statvfs.h>
#include <sys/sysinfo.h>

#define COLLECTION_INTERVAL 15  // secondes
#define MAX_CONTAINERS 100

// Structure globale pour les métriques
static MetricsData global_metrics = {0};

// Définitions simplifiées si non définies
#ifndef CONTAINER_METRICS_DEFINED
typedef struct {
    char name[256];
    double cpu_percent;
    unsigned long memory_mb;
} ContainerMetrics;
#endif

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
 * Collecte des métriques des conteneurs Docker (simplifié)
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
        return 0;
    }
    return -1;
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

