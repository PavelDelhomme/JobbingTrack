/**
 * Stockage des métriques en base de données PostgreSQL
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
    if (conn) return 0;  // Déjà connecté
    
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
 * Sauvegarde des métriques
 */
int save_metrics_to_db(const MetricsData *metrics) {
    if (!conn) {
        const char *conn_str = getenv("DATABASE_URL");
        if (!conn_str) {
            conn_str = "postgresql://jobbingtrack:jobbingtrack123@localhost:5000/jobbingtrack";
        }
        if (db_connect(conn_str) != 0) return -1;
    }
    
    char query[2048];
    snprintf(query, sizeof(query),
        "INSERT INTO system_metrics_snapshot (timestamp, cpu_percent, memory_percent, disk_usage_percent) "
        "VALUES (NOW(), %.2f, %.2f, %.2f) "
        "ON CONFLICT DO NOTHING",
        metrics->cpu.load_1 * 100.0 / (metrics->cpu.cores > 0 ? metrics->cpu.cores : 1),
        metrics->memory.usage_percent,
        metrics->disk.usage_percent);
    
    PGresult *res = PQexec(conn, query);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "Erreur INSERT: %s\n", PQerrorMessage(conn));
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

