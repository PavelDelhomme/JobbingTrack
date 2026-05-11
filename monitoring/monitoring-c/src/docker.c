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
#include <errno.h>

#define DOCKER_SOCKET "/var/run/docker.sock"
#define INITIAL_RESPONSE_CAPACITY 16384
#define MAX_RESPONSE_CAPACITY (1024 * 1024)

static const char *get_docker_socket_path(void) {
    const char *env = getenv("DOCKER_SOCKET_PATH");
    return (env && env[0] != '\0') ? env : DOCKER_SOCKET;
}

static int write_all(int fd, const char *data, size_t len) {
    size_t written_total = 0;
    while (written_total < len) {
        ssize_t written = write(fd, data + written_total, len - written_total);
        if (written < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        if (written == 0) return -1;
        written_total += (size_t)written;
    }
    return 0;
}

static int docker_http_get(const char *path, char **body_out) {
    *body_out = NULL;

    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    snprintf(addr.sun_path, sizeof(addr.sun_path), "%s", get_docker_socket_path());

    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) != 0) {
        close(fd);
        return -1;
    }

    char request[512];
    snprintf(request, sizeof(request),
             "GET %s HTTP/1.1\r\nHost: docker\r\nConnection: close\r\n\r\n",
             path);
    size_t request_len = strlen(request);
    if (write_all(fd, request, request_len) != 0) {
        close(fd);
        return -1;
    }

    size_t cap = INITIAL_RESPONSE_CAPACITY;
    size_t len = 0;
    char *response = malloc(cap);
    if (!response) {
        close(fd);
        return -1;
    }

    while (1) {
        if (len + 4096 + 1 > cap) {
            if (cap >= MAX_RESPONSE_CAPACITY) {
                free(response);
                close(fd);
                return -1;
            }
            cap *= 2;
            if (cap > MAX_RESPONSE_CAPACITY) cap = MAX_RESPONSE_CAPACITY;
            char *next = realloc(response, cap);
            if (!next) {
                free(response);
                close(fd);
                return -1;
            }
            response = next;
        }
        ssize_t n = read(fd, response + len, cap - len - 1);
        if (n < 0) {
            if (errno == EINTR) continue;
            free(response);
            close(fd);
            return -1;
        }
        if (n == 0) break;
        len += (size_t)n;
    }
    close(fd);
    response[len] = '\0';

    if (strncmp(response, "HTTP/1.1 2", 10) != 0 && strncmp(response, "HTTP/1.0 2", 10) != 0) {
        free(response);
        return -1;
    }

    char *body = strstr(response, "\r\n\r\n");
    if (!body) {
        free(response);
        return -1;
    }
    body += 4;

    char *copy = strdup(body);
    free(response);
    if (!copy) return -1;

    *body_out = copy;
    return 0;
}

static int copy_json_string_value(const char *start, char *dest, size_t dest_size) {
    const char *end = strchr(start, '"');
    if (!end) return -1;
    size_t len = (size_t)(end - start);
    if (len >= dest_size) len = dest_size - 1;
    memcpy(dest, start, len);
    dest[len] = '\0';
    return 0;
}

/**
 * Liste les conteneurs Docker
 */
int docker_list_containers(ContainerInfo *containers, int max_count) {
    if (!containers || max_count <= 0) return 0;

    char *body = NULL;
    if (docker_http_get("/containers/json", &body) != 0) return -1;

    int count = 0;
    char *p = body;
    while (count < max_count && (p = strstr(p, "\"Id\":\"")) != NULL) {
        p += 6;
        memset(&containers[count], 0, sizeof(ContainerInfo));
        if (copy_json_string_value(p, containers[count].id, sizeof(containers[count].id)) != 0) break;

        char *names = strstr(p, "\"Names\":[\"");
        if (!names) {
            p++;
            continue;
        }
        names += 10;
        if (*names == '/') names++;
        if (copy_json_string_value(names, containers[count].name, sizeof(containers[count].name)) != 0) {
            p++;
            continue;
        }

        char *state = strstr(p, "\"State\":\"");
        if (state) {
            state += 9;
            copy_json_string_value(state, containers[count].status, sizeof(containers[count].status));
        }

        count++;
        p = names;
    }

    free(body);
    return count;
}

