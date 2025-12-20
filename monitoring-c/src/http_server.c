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
#define BUFFER_SIZE 65536  // 64KB pour supporter plus de conteneurs

extern MetricsData global_metrics;
static pthread_mutex_t metrics_mutex = PTHREAD_MUTEX_INITIALIZER;

/**
 * Génère une réponse JSON avec les métriques
 */
void generate_json_response(char *buffer, size_t buffer_size) {
    // Initialiser le buffer
    memset(buffer, 0, buffer_size);
    
    // Format adapté pour le frontend (formatMetricsFromMonitoringC)
    int pos = snprintf(buffer, buffer_size,
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
        "    \"cores\": %d,\n"
        "    \"usage_percent\": %.2f\n"
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
        "  \"container_count\": %d,\n"
        "  \"avg_response_time_ms\": %.2f,\n"
        "  \"avg_cpu_percent\": %.2f,\n"
        "  \"avg_memory_percent\": %.2f,\n"
        "  \"availability_percent\": %.2f,\n"
        "  \"load_score\": %.2f,\n"
        "  \"network\": {\n"
        "    \"total_rx_mb\": %.2f,\n"
        "    \"total_tx_mb\": %.2f,\n"
        "    \"total_mb\": %.2f\n"
        "  },\n"
        "  \"containers\": [\n",
        (long)global_metrics.timestamp,
        global_metrics.cpu.load_1,
        global_metrics.cpu.load_5,
        global_metrics.cpu.load_15,
        global_metrics.cpu.cores,
        global_metrics.cpu.load_1, // usage_percent approximatif depuis load_1
        global_metrics.memory.total_mb,
        global_metrics.memory.used_mb,
        global_metrics.memory.free_mb,
        global_metrics.memory.usage_percent,
        global_metrics.disk.total_gb,
        global_metrics.disk.used_gb,
        global_metrics.disk.free_gb,
        global_metrics.disk.usage_percent,
        global_metrics.container_count,
        global_metrics.avg_response_time_ms,
        global_metrics.avg_cpu_percent,
        global_metrics.avg_memory_percent,
        global_metrics.availability_percent,
        global_metrics.load_score,
        global_metrics.total_network_rx_bytes / (1024.0 * 1024.0),
        global_metrics.total_network_tx_bytes / (1024.0 * 1024.0),
        (global_metrics.total_network_rx_bytes + global_metrics.total_network_tx_bytes) / (1024.0 * 1024.0)
    );
    
    // Ajouter les conteneurs avec métriques complètes
    int container_added = 0;
    int actual_count = 0;
    
    // Compter d'abord les conteneurs valides
    for (int i = 0; i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            actual_count++;
        }
    }
    
    for (int i = 0; i < 100; i++) {
        if (global_metrics.containers[i].name[0] != '\0') {
            // Vérifier l'espace disponible avant d'écrire
            size_t remaining = buffer_size - (size_t)pos;
            if (remaining < 300) {
                // Pas assez d'espace pour un conteneur complet
                break;
            }
            
            int written = snprintf(buffer + pos, remaining,
                "%s    {\n"
                "      \"name\": \"%s\",\n"
                "      \"cpu_percent\": %.2f,\n"
                "      \"memory_mb\": %lu,\n"
                "      \"memory_limit_mb\": %lu,\n"
                "      \"memory_percent\": %.2f,\n"
                "      \"network_rx_bytes\": %lu,\n"
                "      \"network_tx_bytes\": %lu,\n"
                "      \"network_rx_mb\": %.2f,\n"
                "      \"network_tx_mb\": %.2f,\n"
                "      \"response_time_ms\": %.2f,\n"
                "      \"http_status\": %d\n"
                "    }",
                (container_added > 0) ? ",\n" : "",
                global_metrics.containers[i].name,
                global_metrics.containers[i].cpu_percent,
                global_metrics.containers[i].memory_mb,
                global_metrics.containers[i].memory_limit_mb,
                global_metrics.containers[i].memory_percent,
                global_metrics.containers[i].network_rx_bytes,
                global_metrics.containers[i].network_tx_bytes,
                global_metrics.containers[i].network_rx_bytes / (1024.0 * 1024.0),
                global_metrics.containers[i].network_tx_bytes / (1024.0 * 1024.0),
                global_metrics.containers[i].response_time_ms,
                global_metrics.containers[i].http_status
            );
            
            // Vérifier si l'écriture a réussi
            if (written < 0) {
                // Erreur lors de l'écriture
                break;
            } else if ((size_t)written >= remaining) {
                // Buffer plein, tronquer et arrêter
                buffer[buffer_size - 1] = '\0';
                break;
            }
            
            pos += written;
            container_added++;
        }
    }
    
    // Fermer le JSON (vérifier que pos n'a pas dépassé buffer_size)
    if ((size_t)pos < buffer_size - 10) {
        snprintf(buffer + pos, buffer_size - pos, "\n  ]\n}");
    } else {
        // Buffer trop petit, tronquer proprement
        if (buffer_size > 10) {
            buffer[buffer_size - 10] = '\0';
            strncat(buffer, "\n  ]\n}", buffer_size - strlen(buffer) - 1);
        }
    }
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
    
    // Vérifier si c'est une requête GET /api/v1/metrics
    if (strstr(buffer, "GET /api/v1/metrics") == NULL && strstr(buffer, "GET /") == NULL) {
        // Requête non supportée
        const char *not_found = 
            "HTTP/1.1 404 Not Found\r\n"
            "Content-Type: application/json\r\n"
            "Connection: close\r\n"
            "\r\n"
            "{\"error\": \"Endpoint not found\"}";
        write(client_fd, not_found, strlen(not_found));
        close(client_fd);
        return;
    }
    
    // Initialiser le buffer de réponse
    memset(response, 0, sizeof(response));
    
    // Générer la réponse JSON (protéger l'accès à global_metrics)
    pthread_mutex_lock(&metrics_mutex);
    generate_json_response(response, sizeof(response));
    pthread_mutex_unlock(&metrics_mutex);
    
    // Vérifier que la réponse a été générée correctement
    size_t response_len = strlen(response);
    
    if (response_len == 0 || response_len >= sizeof(response)) {
        // Réponse vide ou buffer dépassé, envoyer une erreur
        const char *error_response = 
            "HTTP/1.1 500 Internal Server Error\r\n"
            "Content-Type: application/json\r\n"
            "Connection: close\r\n"
            "\r\n"
            "{\"error\": \"Failed to generate metrics response\"}";
        ssize_t written = write(client_fd, error_response, strlen(error_response));
        if (written < 0) {
            perror("write error");
        }
        close(client_fd);
        return;
    }
    
    // Envoyer la réponse normale
    ssize_t total_written = 0;
    while (total_written < (ssize_t)response_len) {
        ssize_t written = write(client_fd, response + total_written, response_len - total_written);
        if (written < 0) {
            perror("write error");
            break;
        }
        if (written == 0) {
            break;
        }
        total_written += written;
    }
    
    // Fermer proprement la connexion
    shutdown(client_fd, SHUT_WR);
    close(client_fd);
}

/**
 * Thread serveur HTTP
 */
void* http_server_thread(void* arg __attribute__((unused))) {
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
    pthread_attr_t attr;
    
    // Initialiser les attributs du thread
    pthread_attr_init(&attr);
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
    
    if (pthread_create(&thread, &attr, http_server_thread, NULL) != 0) {
        perror("pthread_create");
        pthread_attr_destroy(&attr);
        return -1;
    }
    
    pthread_attr_destroy(&attr);
    return 0;
}

