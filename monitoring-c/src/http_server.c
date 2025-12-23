/**
 * Serveur HTTP simple pour exposer les métriques
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <signal.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <pthread.h>
#include <sys/time.h>
#include "collector.h"
#include "storage.h"

#define HTTP_PORT 8015
#define BUFFER_SIZE 65536  // 64KB pour supporter plus de conteneurs

extern MetricsData global_metrics;
static pthread_mutex_t metrics_mutex = PTHREAD_MUTEX_INITIALIZER;

// ✅ CORRECTION : Handler pour capturer les signaux de crash
void signal_handler(int sig) {
    const char *msg = "[FATAL] Signal reçu: ";
    write(2, msg, strlen(msg));
    char sig_str[20];
    snprintf(sig_str, sizeof(sig_str), "%d", sig);
    write(2, sig_str, strlen(sig_str));
    write(2, "\n", 1);
    _exit(1);
}

/**
 * Génère une réponse JSON avec les métriques
 */
void generate_json_response(char *buffer, size_t buffer_size) {
    const char *msg = "[DEBUG] generate_json_response: début\n";
    write(2, msg, strlen(msg));
    
    // Initialiser le buffer
    memset(buffer, 0, buffer_size);
    
    const char *msg2 = "[DEBUG] generate_json_response: buffer initialisé\n";
    write(2, msg2, strlen(msg2));
    
    // Format adapté pour le frontend (formatMetricsFromMonitoringC)
    // ✅ Ne pas inclure les en-têtes HTTP ici (seront ajoutés dans handle_request)
    const char *msg3 = "[DEBUG] generate_json_response: snprintf début\n";
    write(2, msg3, strlen(msg3));
    
    // ✅ CORRECTION : Utiliser les métriques projet déjà calculées dans collector.c
    double project_cpu_avg = global_metrics.project_cpu_avg;
    unsigned long project_memory_mb = global_metrics.project_memory_mb;
    
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
        "  \"project_memory_mb\": %lu,\n"
        "  \"project_cpu_avg\": %.2f,\n"
        "  \"variations\": {\n"
        "    \"cpu_change_percent\": %.2f,\n"
        "    \"memory_change_percent\": %.2f,\n"
        "    \"response_time_change_percent\": %.2f,\n"
        "    \"availability_change_percent\": %.2f\n"
        "  },\n"
        "  \"services\": {\n"
        "    \"healthy\": %d,\n"
        "    \"total\": %d,\n"
        "    \"degraded\": %d,\n"
        "    \"offline\": %d,\n"
        "    \"errors\": %d\n"
        "  },\n"
        "  \"error_rate_per_min\": %.2f,\n"
        "  \"system\": {\n"
        "    \"cpu_usage_percent\": %.2f,\n"
        "    \"memory_usage_percent\": %.2f\n"
        "  },\n"
        "  \"containers\": [\n",
        (long)global_metrics.timestamp,
        global_metrics.cpu.load_1,
        global_metrics.cpu.load_5,
        global_metrics.cpu.load_15,
        global_metrics.cpu.cores,
        global_metrics.system_cpu_usage_percent, // ✅ CORRECTION : CPU usage réel depuis /proc/stat
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
        (global_metrics.total_network_rx_bytes + global_metrics.total_network_tx_bytes) / (1024.0 * 1024.0),
        project_memory_mb,
        project_cpu_avg,
        global_metrics.variations.cpu_change_percent,
        global_metrics.variations.memory_change_percent,
        global_metrics.variations.response_time_change_percent,
        global_metrics.variations.availability_change_percent,
        global_metrics.services_healthy,
        global_metrics.services_total,
        global_metrics.services_degraded,
        global_metrics.services_offline,
        global_metrics.services_errors,
        global_metrics.error_rate_per_min,
        global_metrics.system_cpu_usage_percent,
        global_metrics.system_memory_usage_percent
    );
    
    const char *msg4 = "[DEBUG] generate_json_response: snprintf terminé, pos=";
    write(2, msg4, strlen(msg4));
    char pos_str[20];
    snprintf(pos_str, sizeof(pos_str), "%d", pos);
    write(2, pos_str, strlen(pos_str));
    write(2, "\n", 1);
    
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
    const char *msg5 = "[DEBUG] generate_json_response: fermeture JSON\n";
    write(2, msg5, strlen(msg5));
    
    if ((size_t)pos < buffer_size - 10) {
        snprintf(buffer + pos, buffer_size - pos, "\n  ]\n}");
    } else {
        // Buffer trop petit, tronquer proprement
        if (buffer_size > 10) {
            buffer[buffer_size - 10] = '\0';
            strncat(buffer, "\n  ]\n}", buffer_size - strlen(buffer) - 1);
        }
    }
    
    const char *msg6 = "[DEBUG] generate_json_response: fin\n";
    write(2, msg6, strlen(msg6));
}

/**
 * Traite une requête HTTP
 */
void handle_request(int client_fd) {
    // ✅ CORRECTION : Installer le signal handler pour capturer les crashes
    signal(SIGSEGV, signal_handler);
    signal(SIGBUS, signal_handler);
    signal(SIGABRT, signal_handler);
    
    // ✅ CORRECTION : Utiliser write() directement pour éviter les problèmes de buffering
    const char *msg1 = "[DEBUG] handle_request appelé pour fd=";
    write(2, msg1, strlen(msg1));
    char fd_str[20];
    snprintf(fd_str, sizeof(fd_str), "%d", client_fd);
    write(2, fd_str, strlen(fd_str));
    write(2, "\n", 1);
    
    // ✅ CORRECTION : Vérifier que client_fd est valide avant de continuer
    if (client_fd < 0) {
        const char *err = "[ERROR] handle_request appelé avec fd invalide\n";
        write(2, err, strlen(err));
        return;
    }
    
    // ✅ CORRECTION : Allouer le buffer sur la heap pour éviter les problèmes de stack
    char *buffer = (char *)malloc(BUFFER_SIZE);
    if (!buffer) {
        const char *err = "[ERROR] Échec allocation mémoire pour buffer\n";
        write(2, err, strlen(err));
        close(client_fd);
        return;
    }
    memset(buffer, 0, BUFFER_SIZE);
    
    // ✅ CORRECTION : Utiliser recv() avec MSG_DONTWAIT pour éviter de bloquer
    // et ajouter un timeout avec select() pour s'assurer que les données arrivent
    fd_set read_fds;
    struct timeval timeout;
    FD_ZERO(&read_fds);
    FD_SET(client_fd, &read_fds);
    timeout.tv_sec = 2;  // 2 secondes de timeout
    timeout.tv_usec = 0;
    
    int select_result = select(client_fd + 1, &read_fds, NULL, NULL, &timeout);
    if (select_result <= 0) {
        fprintf(stderr, "[DEBUG] select() timeout ou erreur: %d\n", select_result);
        fflush(stderr);
        close(client_fd);
        return;
    }
    
    fprintf(stderr, "[DEBUG] Données disponibles, lecture...\n");
    fflush(stderr);
    
    // Lire la requête avec recv() et MSG_DONTWAIT pour éviter de bloquer
    ssize_t bytes_read = recv(client_fd, buffer, BUFFER_SIZE - 1, MSG_DONTWAIT);
    if (bytes_read <= 0) {
        fprintf(stderr, "[DEBUG] Erreur recv() ou connexion fermée: %zd (errno=%d)\n", bytes_read, errno);
        fflush(stderr);
        // Si EAGAIN/EWOULDBLOCK, réessayer avec read() normal
        if (bytes_read < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
            bytes_read = read(client_fd, buffer, BUFFER_SIZE - 1);
            if (bytes_read <= 0) {
                fprintf(stderr, "[DEBUG] read() aussi échoué: %zd\n", bytes_read);
                fflush(stderr);
                free(buffer);
                close(client_fd);
                return;
            }
        } else {
            free(buffer);
            close(client_fd);
            return;
        }
    }
    
    buffer[bytes_read] = '\0';
    fprintf(stderr, "[DEBUG] %zd bytes lus: %.100s\n", bytes_read, buffer);
    fflush(stderr);
    
    // Debug: afficher la première ligne de la requête
    fprintf(stderr, "[DEBUG] Requête reçue: %.100s\n", buffer);
    fflush(stderr);
    
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
        free(buffer);
        close(client_fd);
        return; // json_buffer n'est pas encore alloué ici
    }
    
    // ✅ CORRECTION : Allouer json_buffer sur la heap pour éviter stack overflow
    const char *msg_json = "[DEBUG] Génération JSON...\n";
    write(2, msg_json, strlen(msg_json));
    
    char *json_buffer = (char *)malloc(BUFFER_SIZE);
    if (!json_buffer) {
        const char *err = "[ERROR] Échec allocation mémoire pour json_buffer\n";
        write(2, err, strlen(err));
        free(buffer);
        close(client_fd);
        return;
    }
    memset(json_buffer, 0, BUFFER_SIZE);
    
    const char *msg_lock = "[DEBUG] Verrouillage mutex...\n";
    write(2, msg_lock, strlen(msg_lock));
    pthread_mutex_lock(&metrics_mutex);
    
    const char *msg_gen = "[DEBUG] Appel generate_json_response...\n";
    write(2, msg_gen, strlen(msg_gen));
    generate_json_response(json_buffer, BUFFER_SIZE);
    
    const char *msg_unlock = "[DEBUG] Déverrouillage mutex...\n";
    write(2, msg_unlock, strlen(msg_unlock));
    pthread_mutex_unlock(&metrics_mutex);
    
    // Vérifier que la réponse a été générée correctement
    size_t json_len = strlen(json_buffer);
    fprintf(stderr, "[DEBUG] JSON généré: %zu bytes\n", json_len);
    fflush(stderr);
    
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
            BUFFER_SIZE - 1);
        json_len = strlen(json_buffer);
    }
    
    if (json_len >= BUFFER_SIZE - 200) {
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
        free(buffer);
        free(json_buffer);
        shutdown(client_fd, SHUT_WR);
        close(client_fd);
        return;
    }
    
    // ✅ CORRECTION : Configurer SO_LINGER AVANT d'envoyer les données
    // Cela garantit que les données sont envoyées avant de fermer la connexion
    struct linger linger_opt;
    linger_opt.l_onoff = 1;
    linger_opt.l_linger = 5; // Attendre 5 secondes pour que les données soient envoyées
    setsockopt(client_fd, SOL_SOCKET, SO_LINGER, &linger_opt, sizeof(linger_opt));
    
    // Activer TCP_NODELAY pour envoyer les données immédiatement (pas de Nagle)
    int flag = 1;
    setsockopt(client_fd, IPPROTO_TCP, TCP_NODELAY, &flag, sizeof(flag));
    
    // ✅ CORRECTION : Allouer http_response sur la heap aussi pour éviter stack overflow
    char *http_response = (char *)malloc(BUFFER_SIZE + 300);
    if (!http_response) {
        const char *err = "[ERROR] Échec allocation mémoire pour http_response\n";
        write(2, err, strlen(err));
        free(buffer);
        free(json_buffer);
        close(client_fd);
        return;
    }
    int http_len = snprintf(http_response, BUFFER_SIZE + 300,
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: %zu\r\n"
        "Connection: close\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "\r\n"
        "%s",
        json_len, json_buffer);
    
    if (http_len < 0 || (size_t)http_len >= (BUFFER_SIZE + 300)) {
        // Erreur de formatage, envoyer erreur 500
        const char *error_response = 
            "HTTP/1.1 500 Internal Server Error\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: 52\r\n"
            "Connection: close\r\n"
            "\r\n"
            "{\"error\": \"Response too large\"}";
        free(buffer);
        free(json_buffer);
        free(http_response);
        write(client_fd, error_response, strlen(error_response));
        close(client_fd);
        return;
    }
    
    // Envoyer la réponse HTTP complète
    ssize_t total_written = 0;
    size_t http_response_len = (size_t)http_len;
    
    fprintf(stderr, "[DEBUG] Envoi réponse HTTP: %zu bytes\n", http_response_len);
    fflush(stderr);
    
    // Utiliser send() au lieu de write() pour plus de contrôle
    while (total_written < (ssize_t)http_response_len) {
        ssize_t written = send(client_fd, http_response + total_written, http_response_len - total_written, MSG_NOSIGNAL);
        if (written < 0) {
            perror("[ERROR] send error");
            break;
        }
        if (written == 0) {
            fprintf(stderr, "[WARN] send returned 0\n");
            break;
        }
        total_written += written;
    }
    
    // Debug: vérifier que tout a été envoyé
    if (total_written < (ssize_t)http_response_len) {
        fprintf(stderr, "[WARN] Réponse incomplète: %zd/%zu bytes\n", total_written, http_response_len);
    } else {
        fprintf(stderr, "[DEBUG] Réponse complète envoyée: %zd bytes\n", total_written);
    }
    fflush(stderr);
    
    // Fermer la connexion - SO_LINGER s'assurera que les données sont envoyées
    // Ne pas utiliser shutdown() car SO_LINGER gère déjà la fermeture propre
    const char *msg_close = "[DEBUG] Fermeture connexion...\n";
    write(2, msg_close, strlen(msg_close));
    close(client_fd);
    const char *msg_closed = "[DEBUG] Connexion fermée\n";
    write(2, msg_closed, strlen(msg_closed));
    
    // ✅ CORRECTION : Libérer tous les buffers alloués sur la heap
    free(buffer);
    free(json_buffer);
    free(http_response);
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
        fprintf(stderr, "[DEBUG] En attente de connexion...\n");
        fflush(stderr);
        client_fd = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen);
        if (client_fd < 0) {
            perror("accept");
            // Ne pas sortir de la boucle en cas d'erreur accept
            sleep(1);
            continue;
        }
        
        fprintf(stderr, "[DEBUG] Connexion acceptée: fd=%d\n", client_fd);
        fflush(stderr);
        
        // ✅ CORRECTION : Vérifier que handle_request existe et est appelé
        fprintf(stderr, "[DEBUG] Appel de handle_request(%d)...\n", client_fd);
        fflush(stderr);
        
        // Traiter la requête (ne pas bloquer la boucle principale)
        handle_request(client_fd);
        
        fprintf(stderr, "[DEBUG] handle_request(%d) terminé\n", client_fd);
        fflush(stderr);
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

