#ifndef DOCKER_H
#define DOCKER_H

#include "collector.h"

typedef struct {
    char id[64];
    char name[256];
    char status[32];
} ContainerInfo;

// Fonctions Docker
int docker_list_containers(ContainerInfo *containers, int max_count);
int docker_get_container_stats(const ContainerInfo *container, ContainerMetrics *metrics);

#endif // DOCKER_H

