#ifndef DOCKER_H
#define DOCKER_H

#include "collector.h"

typedef struct {
    char id[65];
    char name[256];
    char status[32];
} ContainerInfo;

// Fonctions Docker
int docker_list_containers(ContainerInfo *containers, int max_count);

#endif // DOCKER_H

