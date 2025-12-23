/**
 * Collecte de métriques Docker
 * Version simplifiée utilisant docker CLI
 */

#include "docker.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static bool docker_initialized = false;

bool docker_init(void) {
    // Vérifier si docker CLI est disponible
    if (system("docker --version > /dev/null 2>&1") != 0) {
        fprintf(stderr, "[DOCKER] ⚠️  Docker CLI non disponible\n");
        return false;
    }
    
    docker_initialized = true;
    return true;
}

int docker_list_containers(DockerMetrics *containers, int max_count) {
    if (!docker_initialized || !containers || max_count <= 0) {
        return 0;
    }
    
    // Utiliser docker ps pour lister les conteneurs
    FILE *fp = popen("docker ps --format '{{.ID}}\t{{.Names}}\t{{.Status}}'", "r");
    if (!fp) {
        return 0;
    }
    
    char line[512];
    int count = 0;
    
    while (fgets(line, sizeof(line), fp) && count < max_count) {
        char id[128], name[256], status[64];
        if (sscanf(line, "%127s\t%255s\t%63[^\n]", id, name, status) == 3) {
            strncpy(containers[count].container_id, id, sizeof(containers[count].container_id) - 1);
            strncpy(containers[count].container_name, name, sizeof(containers[count].container_name) - 1);
            strncpy(containers[count].status, status, sizeof(containers[count].status) - 1);
            containers[count].cpu_percent = 0.0;
            containers[count].memory_bytes = 0;
            containers[count].memory_limit_bytes = 0;
            containers[count].network_rx_bytes = 0;
            containers[count].network_tx_bytes = 0;
            count++;
        }
    }
    
    pclose(fp);
    return count;
}

bool docker_get_container_stats(const char *container_id, DockerMetrics *metrics) {
    if (!docker_initialized || !container_id || !metrics) {
        return false;
    }
    
    // Utiliser docker stats pour obtenir les métriques
    char cmd[512];
    snprintf(cmd, sizeof(cmd),
        "docker stats --no-stream --format '{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}' %s 2>/dev/null",
        container_id);
    
    FILE *fp = popen(cmd, "r");
    if (!fp) {
        return false;
    }
    
    char line[512];
    if (fgets(line, sizeof(line), fp)) {
        double cpu_percent;
        char mem_usage[128], net_io[256];
        
        if (sscanf(line, "%lf\t%127s\t%255s", &cpu_percent, mem_usage, net_io) == 3) {
            metrics->cpu_percent = cpu_percent;
            
            // Parser mem_usage (format: "used/total")
            char *slash = strchr(mem_usage, '/');
            if (slash) {
                *slash = '\0';
                // Convertir en bytes (simplifié)
                metrics->memory_bytes = atoll(mem_usage) * 1024 * 1024; // Approximation MB
                metrics->memory_limit_bytes = atoll(slash + 1) * 1024 * 1024;
            }
            
            // Parser net_io (format: "rx/tx")
            char *slash2 = strchr(net_io, '/');
            if (slash2) {
                *slash2 = '\0';
                metrics->network_rx_bytes = atoll(net_io);
                metrics->network_tx_bytes = atoll(slash2 + 1);
            }
        }
    }
    
    pclose(fp);
    return true;
}

void docker_cleanup(void) {
    docker_initialized = false;
}

