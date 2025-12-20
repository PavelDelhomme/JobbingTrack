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
    // ✅ Ne pas inclure les en-têtes HTTP ici (seront ajoutés dans handle_request)
    int pos = snprintf(buffer, buffer_size,
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
    
    // Lire la requête (simplifié)
    ssize_t bytes_read = read(client_fd, buffer, sizeof(buffer) - 1);
    if (bytes_read <= 0) {
        // Connexion fermée ou erreur de lecture
        close(client_fd);
        return;
    }
    
    buffer[bytes_read] = '\0';
    
    // Debug: afficher la première ligne de la requête
    // printf("[DEBUG] Requête reçue: %.100s\n", buffer);
    
    // Vérifier si c'est une requête GET /api/v1/metrics ou GET /
    if (strstr(buffer, "GET /api/v1/metrics") == NULL && strstr(buffer, "GET / HTTP") == NULL) {
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
    
    // Buffer pour le JSON
    char json_buffer[BUFFER_SIZE];
    memset(json_buffer, 0, sizeof(json_buffer));
    
    // Générer la réponse JSON (protéger l'accès à global_metrics)
    pthread_mutex_lock(&metrics_mutex);
    generate_json_response(json_buffer, sizeof(json_buffer));
    pthread_mutex_unlock(&metrics_mutex);
    
    // Vérifier que la réponse a été générée correctement
    size_t json_len = strlen(json_buffer);
    
    // Si le JSON est vide, envoyer une réponse minimale
    if (json_len == 0) {
        fprintf(stderr, "[ERROR] JSON vide - utilisation réponse minimale\n");
        // Réponse minimale avec données vides
        strncpy(json_buffer, 
            "{\n"
            "  \"timestamp\": 0,\n"
            "  \"cpu\": {\"load_1\": 0, \"load_5\": 0, \"load_15\": 0, \"cores\": 0, \"usage_percent\": 0},\n"
            "  \"memory\": {\"total_mb\": 0, \"used_mb\": 0, \"free_mb\": 0, \"usage_percent\": 0},\n"
            "  \"disk\": {\"total_gb\": 0, \"used_gb\": 0, \"free_gb\": 0, \"usage_percent\": 0},\n"
            "  \"container_count\": 0,\n"
            "  \"avg_response_time_ms\": 0,\n"
            "  \"avg_cpu_percent\": 0,\n"
            "  \"avg_memory_percent\": 0,\n"
            "  \"availability_percent\": 0,\n"
            "  \"load_score\": 0,\n"
            "  \"network\": {\"total_rx_mb\": 0, \"total_tx_mb\": 0, \"total_mb\": 0},\n"
            "  \"containers\": []\n"
            "}",
            sizeof(json_buffer) - 1);
        json_len = strlen(json_buffer);
    }
    
    if (json_len >= sizeof(json_buffer) - 200) {
        fprintf(stderr, "[ERROR] JSON trop grand: %zu bytes\n", json_len);
        // Réponse vide ou buffer dépassé, envoyer une erreur
        const char *error_response = 
            "HTTP/1.1 500 Internal Server Error\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: 52\r\n"
            "Connection: close\r\n"
            "\r\n"
            "{\"error\": \"Failed to generate metrics response\"}";
        ssize_t written = write(client_fd, error_response, strlen(error_response));
        if (written < 0) {
            perror("write error");
        }
        shutdown(client_fd, SHUT_WR);
        close(client_fd);
        return;
    }
    
    // Construire la réponse HTTP complète avec en-têtes
    char http_response[BUFFER_SIZE + 300];
    int http_len = snprintf(http_response, sizeof(http_response),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: %zu\r\n"
        "Connection: close\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "\r\n"
        "%s",
        json_len, json_buffer);
    
    if (http_len < 0 || (size_t)http_len >= sizeof(http_response)) {
        // Erreur de formatage, envoyer erreur 500
        const char *error_response = 
            "HTTP/1.1 500 Internal Server Error\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: 52\r\n"
            "Connection: close\r\n"
            "\r\n"
            "{\"error\": \"Response too large\"}";
        write(client_fd, error_response, strlen(error_response));
        shutdown(client_fd, SHUT_WR);
        close(client_fd);
        return;
    }
    
    // Envoyer la réponse HTTP complète
    ssize_t total_written = 0;
    size_t http_response_len = (size_t)http_len;
    
    // Debug: afficher la taille de la réponse
    // printf("[DEBUG] Envoi réponse HTTP: %zu bytes\n", http_response_len);
    
    while (total_written < (ssize_t)http_response_len) {
        ssize_t written = write(client_fd, http_response + total_written, http_response_len - total_written);
        if (written < 0) {
            perror("[ERROR] write error");
            break;
        }
        if (written == 0) {
            fprintf(stderr, "[WARN] write returned 0\n");
            break;
        }
        total_written += written;
    }
    
    // Debug: vérifier que tout a été envoyé
    if (total_written < (ssize_t)http_response_len) {
        fprintf(stderr, "[WARN] Réponse incomplète: %zd/%zu bytes\n", total_written, http_response_len);
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
    int retry_count = 0;
    const int max_retries = 5;
    const int retry_delay = 2; // secondes
    
    // Boucle de réessai pour le bind
    while (retry_count < max_retries) {
        // Créer socket
        server_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (server_fd < 0) {
            perror("socket failed");
            retry_count++;
            sleep(retry_delay);
            continue;
        }
        
        // Configurer socket - SO_REUSEADDR pour permettre le rebind rapide
        if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
            perror("setsockopt SO_REUSEADDR");
            close(server_fd);
            retry_count++;
            sleep(retry_delay);
            continue;
        }
        
        // SO_REUSEPORT pour Linux (permet plusieurs processus sur le même port)
        #ifdef SO_REUSEPORT
        if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt)) < 0) {
            // Non critique, continuer même si ça échoue
            // perror("setsockopt SO_REUSEPORT (non critique)");
        }
        #endif
        
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = INADDR_ANY;
        address.sin_port = htons(HTTP_PORT);
        
        // Bind avec retry
        if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
            perror("bind failed");
            close(server_fd);
            retry_count++;
            if (retry_count < max_retries) {
                fprintf(stderr, "⚠️  Réessai du bind dans %d secondes... (tentative %d/%d)\n", 
                        retry_delay, retry_count, max_retries);
                sleep(retry_delay);
            }
            continue;
        }
        
        // Listen
        if (listen(server_fd, 10) < 0) {  // Augmenté à 10 pour plus de connexions
            perror("listen");
            close(server_fd);
            retry_count++;
            sleep(retry_delay);
            continue;
        }
        
        // Succès - sortir de la boucle de retry
        printf("🌐 Serveur HTTP démarré sur le port %d\n", HTTP_PORT);
        fflush(stdout);
        break;
    }
    
    // Si on a épuisé les tentatives, retourner erreur
    if (retry_count >= max_retries) {
        fprintf(stderr, "❌ Impossible de démarrer le serveur HTTP après %d tentatives\n", max_retries);
        return NULL;
    }
    
    // Accepter les connexions (boucle infinie)
    while (1) {
        client_fd = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen);
        if (client_fd < 0) {
            perror("accept");
            // Ne pas sortir de la boucle en cas d'erreur accept
            sleep(1);
            continue;
        }
        
        // Traiter la requête (ne pas bloquer la boucle principale)
        handle_request(client_fd);
    }
    
    // Ne devrait jamais arriver ici, mais fermer proprement si c'est le cas
    close(server_fd);
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

