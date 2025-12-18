/**
 * Serveur HTTP simple pour exposer les métriques
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <pthread.h>
#include "collector.h"
#include "storage.h"

#define HTTP_PORT 8015
#define BUFFER_SIZE 8192

extern MetricsData global_metrics;

/**
 * Génère une réponse JSON avec les métriques
 */
void generate_json_response(char *buffer, size_t buffer_size) {
    snprintf(buffer, buffer_size,
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: application/json\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Connection: close\r\n"
        "\r\n"
        "{\n"
        "  \"timestamp\": %ld,\n"
        "  \"cpu\": {\n"
        "    \"load_1\": %.2f,\n"
        "    \"load_5\": %.2f,\n"
        "    \"load_15\": %.2f,\n"
        "    \"cores\": %d\n"
        "  },\n"
        "  \"memory\": {\n"
        "    \"total_mb\": %lu,\n"
        "    \"used_mb\": %lu,\n"
        "    \"free_mb\": %lu,\n"
        "    \"usage_percent\": %.2f\n"
        "  },\n"
        "  \"disk\": {\n"
        "    \"total_gb\": %.2f,\n"
        "    \"used_gb\": %.2f,\n"
        "    \"free_gb\": %.2f,\n"
        "    \"usage_percent\": %.2f\n"
        "  },\n"
        "  \"container_count\": %d\n"
        "}",
        (long)global_metrics.timestamp,
        global_metrics.cpu.load_1,
        global_metrics.cpu.load_5,
        global_metrics.cpu.load_15,
        global_metrics.cpu.cores,
        global_metrics.memory.total_mb,
        global_metrics.memory.used_mb,
        global_metrics.memory.free_mb,
        global_metrics.memory.usage_percent,
        global_metrics.disk.total_gb,
        global_metrics.disk.used_gb,
        global_metrics.disk.free_gb,
        global_metrics.disk.usage_percent,
        global_metrics.container_count
    );
}

/**
 * Traite une requête HTTP
 */
void handle_request(int client_fd) {
    char buffer[BUFFER_SIZE];
    char response[BUFFER_SIZE];
    
    // Lire la requête (simplifié)
    ssize_t bytes_read = read(client_fd, buffer, sizeof(buffer) - 1);
    if (bytes_read <= 0) {
        close(client_fd);
        return;
    }
    
    buffer[bytes_read] = '\0';
    
    // Générer la réponse JSON
    generate_json_response(response, sizeof(response));
    
    // Envoyer la réponse
    write(client_fd, response, strlen(response));
    close(client_fd);
}

/**
 * Thread serveur HTTP
 */
void* http_server_thread(void* arg) {
    int server_fd, client_fd;
    struct sockaddr_in address;
    int opt = 1;
    int addrlen = sizeof(address);
    
    // Créer socket
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        return NULL;
    }
    
    // Configurer socket
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt))) {
        perror("setsockopt");
        return NULL;
    }
    
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(HTTP_PORT);
    
    // Bind
    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("bind failed");
        return NULL;
    }
    
    // Listen
    if (listen(server_fd, 3) < 0) {
        perror("listen");
        return NULL;
    }
    
    printf("🌐 Serveur HTTP démarré sur le port %d\n", HTTP_PORT);
    
    // Accepter les connexions
    while (1) {
        if ((client_fd = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen)) < 0) {
            perror("accept");
            continue;
        }
        
        handle_request(client_fd);
    }
    
    return NULL;
}

/**
 * Démarrer le serveur HTTP
 */
int start_http_server(void) {
    pthread_t thread;
    if (pthread_create(&thread, NULL, http_server_thread, NULL) != 0) {
        perror("pthread_create");
        return -1;
    }
    pthread_detach(thread);
    return 0;
}

