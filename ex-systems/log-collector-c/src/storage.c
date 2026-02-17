/**
 * Stockage des logs en base de données PostgreSQL
 * Version complète avec PostgreSQL
 */

#include "storage.h"
#include <libpq-fe.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdbool.h>

static PGconn *conn = NULL;
static bool storage_initialized = false;

// Variables d'environnement pour la connexion
static const char *get_db_host(void) {
    const char *host = getenv("POSTGRES_HOST");
    return host ? host : "postgres";
}

static const char *get_db_port(void) {
    const char *port = getenv("POSTGRES_PORT");
    return port ? port : "5432";
}

static const char *get_db_name(void) {
    const char *db = getenv("POSTGRES_DB");
    return db ? db : "jobbingtrack";
}

static const char *get_db_user(void) {
    const char *user = getenv("POSTGRES_USER");
    return user ? user : "jobbingtrack";
}

static const char *get_db_password(void) {
    const char *pass = getenv("POSTGRES_PASSWORD");
    return pass ? pass : "jobbingtrack123";
}

/**
 * Initialise le stockage PostgreSQL
 */
int init_storage(void) {
    if (storage_initialized && conn && PQstatus(conn) == CONNECTION_OK) {
        return 0;
    }
    
    // Construire la chaîne de connexion
    char conninfo[512];
    snprintf(conninfo, sizeof(conninfo),
        "host=%s port=%s dbname=%s user=%s password=%s",
        get_db_host(), get_db_port(), get_db_name(), get_db_user(), get_db_password());
    
    // Se connecter
    conn = PQconnectdb(conninfo);
    
    if (PQstatus(conn) != CONNECTION_OK) {
        fprintf(stderr, "[STORAGE] ❌ Échec connexion PostgreSQL: %s\n", PQerrorMessage(conn));
        PQfinish(conn);
        conn = NULL;
        return -1;
    }
    
    // Créer la table si elle n'existe pas
    const char *create_table = 
        "CREATE TABLE IF NOT EXISTS container_logs ("
        "  id BIGSERIAL PRIMARY KEY,"
        "  timestamp TIMESTAMP NOT NULL,"
        "  container_id VARCHAR(64),"
        "  container_name VARCHAR(256),"
        "  level VARCHAR(16) NOT NULL,"
        "  message TEXT NOT NULL,"
        "  source VARCHAR(128),"
        "  response_time_ms DOUBLE PRECISION DEFAULT 0,"
        "  http_status INTEGER DEFAULT 0,"
        "  is_error BOOLEAN DEFAULT FALSE"
        ");"
        "CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON container_logs(timestamp DESC);"
        "CREATE INDEX IF NOT EXISTS idx_logs_level ON container_logs(level);"
        "CREATE INDEX IF NOT EXISTS idx_logs_container ON container_logs(container_name);"
        "CREATE INDEX IF NOT EXISTS idx_logs_error ON container_logs(is_error) WHERE is_error = TRUE;";
    
    PGresult *res = PQexec(conn, create_table);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[STORAGE] ⚠️  Erreur création table: %s\n", PQerrorMessage(conn));
        PQclear(res);
    } else {
        PQclear(res);
        printf("[STORAGE] ✅ Tables créées/vérifiées\n");
    }
    
    storage_initialized = true;
    return 0;
}

/**
 * Sauvegarde un log en base
 */
int save_log_to_db(const LogEntry *entry) {
    if (!storage_initialized || !conn || PQstatus(conn) != CONNECTION_OK) {
        // Essayer de reconnecter
        if (init_storage() != 0) {
            return -1;
        }
    }
    
    // Convertir timestamp en format PostgreSQL
    char timestamp_str[64];
    struct tm *tm_info = localtime(&entry->timestamp);
    strftime(timestamp_str, sizeof(timestamp_str), "%Y-%m-%d %H:%M:%S", tm_info);
    
    // Préparer la requête SQL avec paramètres
    const char *query = 
        "INSERT INTO container_logs (timestamp, container_id, container_name, level, message, source, response_time_ms, http_status, is_error) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
    
    const char *values[9];
    char timestamp_param[64];
    snprintf(timestamp_param, sizeof(timestamp_param), "%s", timestamp_str);
    values[0] = timestamp_param;
    values[1] = entry->container_id;
    values[2] = entry->container_name;
    values[3] = entry->level;
    values[4] = entry->message;
    values[5] = entry->source;
    
    char response_time_str[32];
    snprintf(response_time_str, sizeof(response_time_str), "%.2f", entry->response_time_ms);
    values[6] = response_time_str;
    
    char http_status_str[16];
    snprintf(http_status_str, sizeof(http_status_str), "%d", entry->http_status);
    values[7] = http_status_str;
    
    char is_error_str[8];
    snprintf(is_error_str, sizeof(is_error_str), "%s", entry->is_error ? "TRUE" : "FALSE");
    values[8] = is_error_str;
    
    int lengths[9] = {0};
    int formats[9] = {0}; // 0 = texte
    
    PGresult *res = PQexecParams(conn, query, 9, NULL, values, lengths, formats, 0);
    
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[STORAGE] ⚠️  Erreur insertion log: %s\n", PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    
    PQclear(res);
    return 0;
}

/**
 * Nettoie les ressources
 */
void cleanup_storage(void) {
    if (conn) {
        PQfinish(conn);
        conn = NULL;
    }
    storage_initialized = false;
}
