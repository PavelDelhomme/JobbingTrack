/**
 * Collecte de métriques Docker
 * Version simplifiée pour tester rapidement
 */

#ifndef DOCKER_H
#define DOCKER_H

#include <stdbool.h>

// Structure pour les métriques Docker
typedef struct {
    char container_id[128];
    char container_name[256];
    char status[64];
    double cpu_percent;
    long long memory_bytes;
    long long memory_limit_bytes;
    long long network_rx_bytes;
    long long network_tx_bytes;
} DockerMetrics;

// Initialiser la connexion Docker
bool docker_init(void);

// Obtenir la liste des conteneurs
int docker_list_containers(DockerMetrics *containers, int max_count);

// Obtenir les stats d'un conteneur
bool docker_get_container_stats(const char *container_id, DockerMetrics *metrics);

// Nettoyer
void docker_cleanup(void);

#endif // DOCKER_H

