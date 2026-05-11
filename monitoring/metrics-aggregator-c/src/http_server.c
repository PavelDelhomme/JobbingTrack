/**
 * Serveur HTTP simple pour exposer l'API
 * Version simplifiée basée sur monitoring-c
 */

#include "http_server.h"
#include "persistence.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <pthread.h>
#include <time.h>

static int server_fd = -1;
static int server_port = 8014;
static bool server_running = false;
static pthread_t server_thread;

// Fonction pour formater une réponse JSON
static void send_json_response(int client_fd, int status_code, const char *json_body) {
    char response[8192];
    int len = snprintf(response, sizeof(response),
        "HTTP/1.1 %d OK\r\n"
        "Content-Type: application/json\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Content-Length: %zu\r\n"
        "\r\n"
        "%s",
        status_code, strlen(json_body), json_body);
    
    send(client_fd, response, len, 0);
}

// Fonction pour parser les paramètres de requête
static void parse_query_params(const char *query_string, int *limit, int *offset, 
                                time_t *start_date, time_t *end_date) {
    *limit = 100;
    *offset = 0;
    *start_date = 0;
    *end_date = 0;
    
    if (!query_string) return;
    
    char *query_copy = strdup(query_string);
    char *token = strtok(query_copy, "&");
    
    while (token) {
        if (strncmp(token, "limit=", 6) == 0) {
            *limit = atoi(token + 6);
        } else if (strncmp(token, "offset=", 7) == 0) {
            *offset = atoi(token + 7);
        } else if (strncmp(token, "startDate=", 10) == 0) {
            // Parser la date (format timestamp ou ISO)
            *start_date = atoll(token + 10);
        } else if (strncmp(token, "endDate=", 8) == 0) {
            *end_date = atoll(token + 8);
        }
        token = strtok(NULL, "&");
    }
    
    free(query_copy);
}

// Gérer la route /api/v1/persistence/system/metrics
static void handle_system_metrics(int client_fd, const char *query_string) {
    int limit, offset;
    time_t start_date, end_date;
    parse_query_params(query_string, &limit, &offset, &start_date, &end_date);
    
    int count = 0;
    SystemMetrics *metrics = persistence_get_system_metrics_history(
        limit, offset, start_date, end_date, &count);
    
    if (!metrics || count == 0) {
        send_json_response(client_fd, 200, "{\"success\":true,\"count\":0,\"data\":[]}");
        return;
    }
    
    // Construire le JSON
    char json[65536] = "{\"success\":true,\"count\":";
    char count_str[32];
    snprintf(count_str, sizeof(count_str), "%d", count);
    strcat(json, count_str);
    strcat(json, ",\"data\":[");
    
    for (int i = 0; i < count; i++) {
        if (i > 0) strcat(json, ",");
        
        char item[2048];
        char timestamp_str[64];
        struct tm *tm = localtime(&metrics[i].timestamp);
        strftime(timestamp_str, sizeof(timestamp_str), "%Y-%m-%dT%H:%M:%SZ", tm);
        
        snprintf(item, sizeof(item),
            "{\"timestamp\":\"%s\","
            "\"cpu_usage_percent\":%.2f,"
            "\"cpu_cores\":%d,"
            "\"cpu_load_1m\":%.2f,"
            "\"cpu_load_5m\":%.2f,"
            "\"cpu_load_15m\":%.2f,"
            "\"memory_total_mb\":%lld,"
            "\"memory_used_mb\":%lld,"
            "\"memory_free_mb\":%lld,"
            "\"memory_usage_percent\":%.2f,"
            "\"disk_usage_percent\":%.2f,"
            "\"container_count\":%d,"
            "\"avg_response_time_ms\":%.2f,"
            "\"availability_percent\":%.2f,"
            "\"load_score\":%.2f,"
            "\"total_network_rx_bytes\":%lld,"
            "\"total_network_tx_bytes\":%lld,"
            "\"project_cpu_avg\":%.2f,"
            "\"project_memory_mb\":%lld}",
            timestamp_str,
            metrics[i].cpu_usage_percent,
            metrics[i].cpu_cores,
            metrics[i].cpu_load_1m,
            metrics[i].cpu_load_5m,
            metrics[i].cpu_load_15m,
            metrics[i].memory_total_mb,
            metrics[i].memory_used_mb,
            metrics[i].memory_free_mb,
            metrics[i].memory_usage_percent,
            metrics[i].disk_usage_percent,
            metrics[i].container_count,
            metrics[i].avg_response_time_ms,
            metrics[i].availability_percent,
            metrics[i].load_score,
            metrics[i].total_network_rx_bytes,
            metrics[i].total_network_tx_bytes,
            metrics[i].project_cpu_avg,
            metrics[i].project_memory_mb);
        
        strcat(json, item);
    }
    
    strcat(json, "]}");
    
    send_json_response(client_fd, 200, json);
    free(metrics);
}

// Gérer la route /api/v1/persistence/stats
static void handle_stats(int client_fd) {
    PersistenceStats stats;
    if (!persistence_get_stats(&stats)) {
        send_json_response(client_fd, 500, "{\"success\":false,\"error\":\"Failed to get stats\"}");
        return;
    }
    
    char oldest_str[64] = "", newest_str[64] = "";
    if (stats.oldest_timestamp > 0) {
        struct tm *tm = localtime(&stats.oldest_timestamp);
        strftime(oldest_str, sizeof(oldest_str), "%Y-%m-%dT%H:%M:%SZ", tm);
    }
    if (stats.newest_timestamp > 0) {
        struct tm *tm = localtime(&stats.newest_timestamp);
        strftime(newest_str, sizeof(newest_str), "%Y-%m-%dT%H:%M:%SZ", tm);
    }
    
    char json[512];
    snprintf(json, sizeof(json),
        "{\"success\":true,\"data\":{"
        "\"counts\":{"
        "\"systemMetrics\":%lld,"
        "\"containerMetrics\":%lld,"
        "\"total\":%lld"
        "},"
        "\"dataRange\":{"
        "\"oldest\":\"%s\","
        "\"newest\":\"%s\""
        "}"
        "}}",
        stats.system_metrics_count,
        stats.container_metrics_count,
        stats.system_metrics_count + stats.container_metrics_count,
        oldest_str,
        newest_str);
    
    send_json_response(client_fd, 200, json);
}

// Gérer une requête HTTP
static void handle_request(int client_fd) {
    char buffer[8192];
    ssize_t bytes_read = recv(client_fd, buffer, sizeof(buffer) - 1, 0);
    
    if (bytes_read <= 0) {
        close(client_fd);
        return;
    }
    
    buffer[bytes_read] = '\0';
    
    // Parser la requête (simplifié)
    char method[16], path[512], query_string[512] = "";
    sscanf(buffer, "%15s %511s", method, path);
    
    // Extraire query string
    char *query_start = strchr(path, '?');
    if (query_start) {
        *query_start = '\0';
        strncpy(query_string, query_start + 1, sizeof(query_string) - 1);
    }
    
    // Gérer OPTIONS (CORS preflight)
    if (strcmp(method, "OPTIONS") == 0) {
        const char *cors_response =
            "HTTP/1.1 200 OK\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type\r\n"
            "\r\n";
        send(client_fd, cors_response, strlen(cors_response), 0);
        close(client_fd);
        return;
    }
    
    // Router les requêtes
    if (strcmp(path, "/api/v1/persistence/system/metrics") == 0) {
        handle_system_metrics(client_fd, query_string);
    } else if (strcmp(path, "/api/v1/persistence/stats") == 0) {
        handle_stats(client_fd);
    } else if (strcmp(path, "/api/v1/health") == 0) {
        send_json_response(client_fd, 200, "{\"status\":\"ok\",\"service\":\"metrics-aggregator-c\"}");
    } else {
        send_json_response(client_fd, 404, "{\"success\":false,\"error\":\"Not found\"}");
    }
    
    close(client_fd);
}

// Thread du serveur
static void* server_thread_func(void *arg __attribute__((unused))) {
    struct sockaddr_in address;
    int addrlen = sizeof(address);
    
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("socket failed");
        return NULL;
    }
    
    int opt = 1;
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt))) {
        perror("setsockopt");
        return NULL;
    }
    
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(server_port);
    
    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("bind failed");
        return NULL;
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        return NULL;
    }
    
    printf("[HTTP] ✅ Serveur démarré sur le port %d\n", server_port);
    
    while (server_running) {
        int client_fd = accept(server_fd, (struct sockaddr *)&address, (socklen_t*)&addrlen);
        if (client_fd < 0) {
            if (server_running) {
                perror("accept");
            }
            continue;
        }
        
        handle_request(client_fd);
    }
    
    return NULL;
}

bool http_server_start(int port) {
    if (server_running) {
        return true;
    }
    
    server_port = port;
    server_running = true;
    
    if (pthread_create(&server_thread, NULL, server_thread_func, NULL) != 0) {
        perror("pthread_create");
        server_running = false;
        return false;
    }
    
    return true;
}

void http_server_stop(void) {
    if (!server_running) {
        return;
    }
    
    server_running = false;
    
    if (server_fd >= 0) {
        close(server_fd);
        server_fd = -1;
    }
    
    pthread_join(server_thread, NULL);
}

bool http_server_is_running(void) {
    return server_running;
}

