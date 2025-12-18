/**
 * Interface Docker API - Collecte via socket Unix
 */

#include "docker.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>

#define DOCKER_SOCKET "/var/run/docker.sock"
#define BUFFER_SIZE 8192

/**
 * Liste les conteneurs Docker
 */
int docker_list_containers(ContainerInfo *containers, int max_count) {
    // Utiliser curl ou libcurl pour accéder à l'API Docker
    // Pour simplifier, on utilise curl via système
    FILE *fp = popen("curl -s --unix-socket /var/run/docker.sock http://localhost/containers/json", "r");
    if (!fp) return -1;
    
    char buffer[BUFFER_SIZE];
    int count = 0;
    
    // Parser JSON (simplifié - utiliser jansson ou cJSON en production)
    while (fgets(buffer, sizeof(buffer), fp) && count < max_count) {
        // Parser les conteneurs depuis JSON
        // TODO: Implémenter parser JSON complet
    }
    
    pclose(fp);
    return count;
}

/**
 * Récupère les stats d'un conteneur
 */
int docker_get_container_stats(const ContainerInfo *container, ContainerMetrics *metrics) {
    char command[512];
    snprintf(command, sizeof(command),
        "curl -s --unix-socket /var/run/docker.sock http://localhost/containers/%s/stats?stream=false",
        container->id);
    
    FILE *fp = popen(command, "r");
    if (!fp) return -1;
    
    // Parser les stats depuis JSON
    // TODO: Implémenter parser JSON complet
    
    pclose(fp);
    return 0;
}

