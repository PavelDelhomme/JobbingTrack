/**
 * Stockage des logs en base de données PostgreSQL
 */

#include "storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libpq-fe.h>

static PGconn *conn = NULL;

/**
 * Connexion à PostgreSQL
 */
int db_connect(const char *conn_string) {
    if (conn) return 0;
    
    conn = PQconnectdb(conn_string);
    if (PQstatus(conn) != CONNECTION_OK) {
        fprintf(stderr, "Erreur connexion DB: %s\n", PQerrorMessage(conn));
        PQfinish(conn);
        conn = NULL;
        return -1;
    }
    return 0;
}

/**
 * Sauvegarde d'une entrée de log
 */
int store_log_entry(const LogEntry *entry) {
    if (!conn) {
        const char *conn_str = getenv("DATABASE_URL");
        if (!conn_str) {
            conn_str = "postgresql://jobbingtrack:jobbingtrack123@localhost:5000/jobbingtrack";
        }
        if (db_connect(conn_str) != 0) return -1;
    }
    
    char query[4096];
    char timestamp_str[64];
    struct tm *tm_info = localtime(&entry->timestamp);
    strftime(timestamp_str, sizeof(timestamp_str), "%Y-%m-%d %H:%M:%S", tm_info);
    
    // Échapper les caractères spéciaux dans le message
    char escaped_message[4096];
    int escaped_len = PQescapeStringConn(conn, escaped_message, entry->message, strlen(entry->message), NULL);
    
    snprintf(query, sizeof(query),
        "INSERT INTO container_logs (timestamp, container_id, container_name, level, message, source) "
        "VALUES ('%s', '%s', '%s', '%s', '%s', '%s') "
        "ON CONFLICT DO NOTHING",
        timestamp_str,
        entry->container_id,
        entry->container_name,
        entry->level,
        escaped_message,
        entry->source);
    
    PGresult *res = PQexec(conn, query);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "Erreur INSERT log: %s\n", PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    
    PQclear(res);
    return 0;
}

/**
 * Fermeture de la connexion
 */
void db_disconnect(void) {
    if (conn) {
        PQfinish(conn);
        conn = NULL;
    }
}

