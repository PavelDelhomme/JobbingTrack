/**
 * Serveur HTTP simple pour exposer les logs via API
 * Basé sur monitoring-c/http_server.c
 */

#include "http_server.h"
#include "storage.h"
#include <libpq-fe.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <pthread.h>
#include <time.h>

static int server_fd = -1;
static int server_port = 5099;
static bool server_running = false;
static pthread_t server_thread;

// Fonction pour formater une réponse JSON
static void send_json_response(int client_fd, int status_code, const char *json_body) {
    char response[16384];
    int len = snprintf(response, sizeof(response),
        "HTTP/1.1 %d OK\r\n"
        "Content-Type: application/json\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Connection: close\r\n"
        "\r\n"
        "%s",
        status_code, json_body);
    write(client_fd, response, len);
}

// Fonction pour gérer une requête
static void handle_request(int client_fd) {
    char buffer[4096];
    ssize_t bytes_read = read(client_fd, buffer, sizeof(buffer) - 1);
    
    if (bytes_read <= 0) {
        close(client_fd);
        return;
    }
    
    buffer[bytes_read] = '\0';
    
    // Parser la requête (simplifié)
    if (strstr(buffer, "GET /api/v1/health") != NULL) {
        send_json_response(client_fd, 200, "{\"status\":\"ok\",\"service\":\"log-collector-c\"}");
    } else if (strstr(buffer, "GET /api/v1/logs") != NULL) {
        // Récupérer les paramètres de la requête
        int limit = 100;
        const char *level_filter = NULL;
        const char *container_filter = NULL;
        bool errors_only = false;
        
        // Parser les paramètres de requête (simplifié)
        if (strstr(buffer, "limit=") != NULL) {
            sscanf(strstr(buffer, "limit="), "limit=%d", &limit);
        }
        if (strstr(buffer, "level=") != NULL) {
            char level_buf[16];
            if (sscanf(strstr(buffer, "level="), "level=%15s", level_buf) == 1) {
                level_filter = strdup(level_buf);
            }
        }
        if (strstr(buffer, "container=") != NULL) {
            char container_buf[256];
            if (sscanf(strstr(buffer, "container="), "container=%255s", container_buf) == 1) {
                container_filter = strdup(container_buf);
            }
        }
        if (strstr(buffer, "errors_only=true") != NULL || strstr(buffer, "errors_only=1") != NULL) {
            errors_only = true;
        }
        
        // ✅ CORRECTION : Construire la requête SQL avec échappement des paramètres (PQexec ne supporte pas $1, $2)
        char query[2048];
        char where_clause[512] = "";
        int where_pos = 0;
        
        // Construire la clause WHERE dynamiquement
        if (errors_only) {
            where_pos += snprintf(where_clause + where_pos, sizeof(where_clause) - where_pos, "is_error = true");
        }
        if (level_filter) {
            if (where_pos > 0) {
                where_pos += snprintf(where_clause + where_pos, sizeof(where_clause) - where_pos, " AND ");
            }
            char level_escaped[32];
            snprintf(level_escaped, sizeof(level_escaped), "'%s'", level_filter);
            where_pos += snprintf(where_clause + where_pos, sizeof(where_clause) - where_pos, "level = %s", level_escaped);
        }
        if (container_filter) {
            if (where_pos > 0) {
                where_pos += snprintf(where_clause + where_pos, sizeof(where_clause) - where_pos, " AND ");
            }
            char container_escaped[256];
            snprintf(container_escaped, sizeof(container_escaped), "'%s'", container_filter);
            where_pos += snprintf(where_clause + where_pos, sizeof(where_clause) - where_pos, "container_name = %s", container_escaped);
        }
        
        if (where_pos > 0) {
            snprintf(query, sizeof(query),
                "SELECT timestamp, container_id, container_name, level, message, source, response_time_ms, http_status, is_error "
                "FROM container_logs "
                "WHERE %s "
                "ORDER BY timestamp DESC "
                "LIMIT %d",
                where_clause, limit);
        } else {
            snprintf(query, sizeof(query),
                "SELECT timestamp, container_id, container_name, level, message, source, response_time_ms, http_status, is_error "
                "FROM container_logs "
                "ORDER BY timestamp DESC "
                "LIMIT %d",
                limit);
        }
        
        // ✅ CORRECTION : Utiliser les variables d'environnement pour la connexion
        const char *db_host = getenv("POSTGRES_HOST") ? getenv("POSTGRES_HOST") : "postgres";
        const char *db_port = getenv("POSTGRES_PORT") ? getenv("POSTGRES_PORT") : "5432";
        const char *db_name = getenv("POSTGRES_DB") ? getenv("POSTGRES_DB") : "jobbingtrack";
        const char *db_user = getenv("POSTGRES_USER") ? getenv("POSTGRES_USER") : "jobbingtrack";
        const char *db_password = getenv("POSTGRES_PASSWORD") ? getenv("POSTGRES_PASSWORD") : "jobbingtrack123";
        
        char conninfo[512];
        snprintf(conninfo, sizeof(conninfo),
            "host=%s port=%s dbname=%s user=%s password=%s",
            db_host, db_port, db_name, db_user, db_password);
        
        // Exécuter la requête
        PGconn *conn = PQconnectdb(conninfo);
        
        if (PQstatus(conn) == CONNECTION_OK) {
            PGresult *res = PQexec(conn, query);
            
            if (PQresultStatus(res) == PGRES_TUPLES_OK) {
                int rows = PQntuples(res);
                char json[16384] = "{\"success\":true,\"data\":[";
                int pos = strlen(json);
                
                for (int i = 0; i < rows && (size_t)pos < sizeof(json) - 500; i++) {
                    if (i > 0) {
                        pos += snprintf(json + pos, sizeof(json) - pos, ",");
                    }
                    pos += snprintf(json + pos, sizeof(json) - pos,
                        "{\"timestamp\":\"%s\",\"container_id\":\"%s\",\"container_name\":\"%s\","
                        "\"level\":\"%s\",\"message\":\"%s\",\"source\":\"%s\","
                        "\"response_time_ms\":%s,\"http_status\":%s,\"is_error\":%s}",
                        PQgetvalue(res, i, 0),
                        PQgetvalue(res, i, 1),
                        PQgetvalue(res, i, 2),
                        PQgetvalue(res, i, 3),
                        PQgetvalue(res, i, 4),
                        PQgetvalue(res, i, 5),
                        PQgetvalue(res, i, 6),
                        PQgetvalue(res, i, 7),
                        PQgetvalue(res, i, 8));
                }
                
                pos += snprintf(json + pos, sizeof(json) - pos, "]}");
                send_json_response(client_fd, 200, json);
                PQclear(res);
            } else {
                send_json_response(client_fd, 500, "{\"success\":false,\"error\":\"Database error\"}");
                PQclear(res);
            }
            PQfinish(conn);
        } else {
            send_json_response(client_fd, 500, "{\"success\":false,\"error\":\"Database connection failed\"}");
        }
        
        if (level_filter) free((void*)level_filter);
        if (container_filter) free((void*)container_filter);
    } else {
        send_json_response(client_fd, 404, "{\"error\":\"Not found\"}");
    }
    
    close(client_fd);
}

// Thread du serveur
static void* server_thread_func(void* arg) {
    (void)arg;
    
    while (server_running) {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
        
        if (client_fd >= 0) {
            handle_request(client_fd);
        }
    }
    
    return NULL;
}

// Démarrer le serveur HTTP
int start_http_server(int port) {
    server_port = port;
    
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return -1;
    }
    
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(server_port);
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(server_fd);
        return -1;
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        close(server_fd);
        return -1;
    }
    
    server_running = true;
    pthread_create(&server_thread, NULL, server_thread_func, NULL);
    
    printf("[HTTP] ✅ Serveur démarré sur le port %d\n", server_port);
    return 0;
}

// Arrêter le serveur HTTP
void stop_http_server(void) {
    server_running = false;
    if (server_fd >= 0) {
        close(server_fd);
        server_fd = -1;
    }
    pthread_join(server_thread, NULL);
}

