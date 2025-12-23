/**
 * Stockage des métriques en base de données PostgreSQL
 * Implémentation complète avec libpq
 */

#include "storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <libpq-fe.h>
#include <unistd.h>

// Connexion PostgreSQL globale
static PGconn *conn = NULL;
static int storage_initialized = 0;

// Variables d'environnement pour la connexion
static const char *get_db_host(void) {
    const char *host = getenv("POSTGRES_HOST");
    return host ? host : "postgres";  // Default: nom du service Docker (pas le conteneur)
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
 * Crée les tables nécessaires si elles n'existent pas
 */
static int create_tables_if_not_exists(PGconn *conn) {
    const char *create_system_metrics_table = 
        "CREATE TABLE IF NOT EXISTS system_metrics ("
        "  id BIGSERIAL PRIMARY KEY,"
        "  timestamp TIMESTAMP NOT NULL,"
        "  cpu_load_1 DOUBLE PRECISION,"
        "  cpu_load_5 DOUBLE PRECISION,"
        "  cpu_load_15 DOUBLE PRECISION,"
        "  cpu_cores INTEGER,"
        "  cpu_usage_percent DOUBLE PRECISION,"
        "  memory_total_mb BIGINT,"
        "  memory_used_mb BIGINT,"
        "  memory_free_mb BIGINT,"
        "  memory_usage_percent DOUBLE PRECISION,"
        "  disk_total_gb DOUBLE PRECISION,"
        "  disk_used_gb DOUBLE PRECISION,"
        "  disk_free_gb DOUBLE PRECISION,"
        "  disk_usage_percent DOUBLE PRECISION,"
        "  container_count INTEGER,"
        "  avg_response_time_ms DOUBLE PRECISION,"
        "  avg_cpu_percent DOUBLE PRECISION,"
        "  avg_memory_percent DOUBLE PRECISION,"
        "  availability_percent DOUBLE PRECISION,"
        "  load_score DOUBLE PRECISION,"
        "  total_network_rx_bytes BIGINT,"
        "  total_network_tx_bytes BIGINT,"
        "  project_cpu_avg DOUBLE PRECISION,"
        "  project_memory_mb BIGINT"
        ");";
    
    const char *create_container_metrics_table =
        "CREATE TABLE IF NOT EXISTS container_metrics ("
        "  id BIGSERIAL PRIMARY KEY,"
        "  system_metrics_id BIGINT REFERENCES system_metrics(id) ON DELETE CASCADE,"
        "  timestamp TIMESTAMP NOT NULL,"
        "  container_name VARCHAR(256) NOT NULL,"
        "  cpu_percent DOUBLE PRECISION,"
        "  memory_mb BIGINT,"
        "  memory_limit_mb BIGINT,"
        "  memory_percent DOUBLE PRECISION,"
        "  network_rx_bytes BIGINT,"
        "  network_tx_bytes BIGINT,"
        "  response_time_ms DOUBLE PRECISION,"
        "  http_status INTEGER"
        ");";
    
    const char *create_indexes =
        "CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);"
        "CREATE INDEX IF NOT EXISTS idx_container_metrics_timestamp ON container_metrics(timestamp);"
        "CREATE INDEX IF NOT EXISTS idx_container_metrics_name ON container_metrics(container_name);"
        "CREATE INDEX IF NOT EXISTS idx_container_metrics_system_id ON container_metrics(system_metrics_id);";
    
    PGresult *res;
    
    // Créer la table system_metrics
    res = PQexec(conn, create_system_metrics_table);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[STORAGE] Erreur création table system_metrics: %s\n", PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    PQclear(res);
    
    // Créer la table container_metrics
    res = PQexec(conn, create_container_metrics_table);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[STORAGE] Erreur création table container_metrics: %s\n", PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    PQclear(res);
    
    // Créer les index
    res = PQexec(conn, create_indexes);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[STORAGE] Erreur création index: %s\n", PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    PQclear(res);
    
    return 0;
}

/**
 * Initialise le stockage (connexion PostgreSQL)
 */
int init_storage(void) {
    if (storage_initialized) {
        return 0;  // Déjà initialisé
    }
    
    // Construire la chaîne de connexion
    char conninfo[512];
    snprintf(conninfo, sizeof(conninfo),
        "host=%s port=%s dbname=%s user=%s password=%s connect_timeout=5",
        get_db_host(),
        get_db_port(),
        get_db_name(),
        get_db_user(),
        get_db_password());
    
    // Se connecter à PostgreSQL
    conn = PQconnectdb(conninfo);
    
    if (PQstatus(conn) != CONNECTION_OK) {
        fprintf(stderr, "[STORAGE] ⚠️  Échec connexion PostgreSQL: %s\n", PQerrorMessage(conn));
        fprintf(stderr, "[STORAGE]    (Les métriques seront toujours disponibles via l'API HTTP)\n");
        PQfinish(conn);
        conn = NULL;
        return -1;
    }
    
    printf("[STORAGE] ✅ Connecté à PostgreSQL: %s@%s:%s/%s\n",
           get_db_user(), get_db_host(), get_db_port(), get_db_name());
    
    // Créer les tables si elles n'existent pas
    if (create_tables_if_not_exists(conn) != 0) {
        fprintf(stderr, "[STORAGE] ⚠️  Erreur création tables (continuons quand même)\n");
        // Ne pas retourner d'erreur, on peut continuer sans tables
    } else {
        printf("[STORAGE] ✅ Tables créées/vérifiées\n");
    }
    
    storage_initialized = 1;
    return 0;
}

/**
 * Sauvegarde les métriques en base
 */
int save_metrics_to_db(const MetricsData *metrics) {
    // Si pas initialisé, essayer d'initialiser
    if (!storage_initialized) {
        if (init_storage() != 0) {
            // Échec connexion, ne pas sauvegarder mais continuer
            return 0;  // Retourner 0 pour ne pas bloquer la collecte
        }
    }
    
    // Si pas de connexion, ne rien faire
    if (!conn || PQstatus(conn) != CONNECTION_OK) {
        // Essayer de reconnecter
        cleanup_storage();
        if (init_storage() != 0) {
            return 0;  // Échec reconnexion, continuer sans sauvegarder
        }
    }
    
    // Convertir timestamp en format PostgreSQL
    char timestamp_str[64];
    struct tm *tm_info = localtime(&metrics->timestamp);
    strftime(timestamp_str, sizeof(timestamp_str), "%Y-%m-%d %H:%M:%S", tm_info);
    
    // Calculer project_cpu_avg et project_memory_mb
    double project_cpu_total = 0.0;
    unsigned long project_memory_mb = 0;
    int project_container_count = 0;
    
    for (int i = 0; i < 100; i++) {
        if (metrics->containers[i].name[0] != '\0' && 
            strstr(metrics->containers[i].name, "jobbingtrack-") != NULL) {
            project_cpu_total += metrics->containers[i].cpu_percent;
            project_memory_mb += metrics->containers[i].memory_mb;
            project_container_count++;
        }
    }
    double project_cpu_avg = (project_container_count > 0) ? 
        (project_cpu_total / project_container_count) : 0.0;
    
    // Insérer les métriques système
    char query[2048];
    snprintf(query, sizeof(query),
        "INSERT INTO system_metrics ("
        "  timestamp, cpu_load_1, cpu_load_5, cpu_load_15, cpu_cores, cpu_usage_percent,"
        "  memory_total_mb, memory_used_mb, memory_free_mb, memory_usage_percent,"
        "  disk_total_gb, disk_used_gb, disk_free_gb, disk_usage_percent,"
        "  container_count, avg_response_time_ms, avg_cpu_percent, avg_memory_percent,"
        "  availability_percent, load_score, total_network_rx_bytes, total_network_tx_bytes,"
        "  project_cpu_avg, project_memory_mb"
        ") VALUES ("
        "  '%s', %.2f, %.2f, %.2f, %d, %.2f,"
        "  %lu, %lu, %lu, %.2f,"
        "  %.2f, %.2f, %.2f, %.2f,"
        "  %d, %.2f, %.2f, %.2f,"
        "  %.2f, %.2f, %lu, %lu,"
        "  %.2f, %lu"
        ") RETURNING id;",
        timestamp_str,
        metrics->cpu.load_1, metrics->cpu.load_5, metrics->cpu.load_15, 
        metrics->cpu.cores, metrics->cpu.load_1,  // usage_percent approximatif depuis load_1
        metrics->memory.total_mb, metrics->memory.used_mb, metrics->memory.free_mb,
        metrics->memory.usage_percent,
        metrics->disk.total_gb, metrics->disk.used_gb, metrics->disk.free_gb,
        metrics->disk.usage_percent,
        metrics->container_count,
        metrics->avg_response_time_ms, metrics->avg_cpu_percent, metrics->avg_memory_percent,
        metrics->availability_percent, metrics->load_score,
        metrics->total_network_rx_bytes, metrics->total_network_tx_bytes,
        project_cpu_avg, project_memory_mb);
    
    PGresult *res = PQexec(conn, query);
    
    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        fprintf(stderr, "[STORAGE] ⚠️  Erreur insertion métriques système: %s\n", PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    
    // Récupérer l'ID de la métrique système insérée
    char *system_id_str = PQgetvalue(res, 0, 0);
    long long system_id = atoll(system_id_str);
    PQclear(res);
    
    // Insérer les métriques des conteneurs
    for (int i = 0; i < 100 && i < metrics->container_count; i++) {
        if (metrics->containers[i].name[0] == '\0') {
            continue;  // Conteneur vide
        }
        
        // Échapper le nom du conteneur pour éviter les injections SQL
        char escaped_name[512];
        int error = 0;
        PQescapeStringConn(conn, escaped_name, metrics->containers[i].name, 
                          strlen(metrics->containers[i].name), &error);
        if (error) {
            fprintf(stderr, "[STORAGE] ⚠️  Erreur échappement nom conteneur: %s\n", metrics->containers[i].name);
            continue;
        }
        
        snprintf(query, sizeof(query),
            "INSERT INTO container_metrics ("
            "  system_metrics_id, timestamp, container_name, cpu_percent,"
            "  memory_mb, memory_limit_mb, memory_percent,"
            "  network_rx_bytes, network_tx_bytes, response_time_ms, http_status"
            ") VALUES ("
            "  %lld, '%s', '%s', %.2f,"
            "  %lu, %lu, %.2f,"
            "  %lu, %lu, %.2f, %d"
            ");",
            system_id, timestamp_str, escaped_name, metrics->containers[i].cpu_percent,
            metrics->containers[i].memory_mb, metrics->containers[i].memory_limit_mb,
            metrics->containers[i].memory_percent,
            metrics->containers[i].network_rx_bytes, metrics->containers[i].network_tx_bytes,
            metrics->containers[i].response_time_ms, metrics->containers[i].http_status);
        
        res = PQexec(conn, query);
        if (PQresultStatus(res) != PGRES_COMMAND_OK) {
            fprintf(stderr, "[STORAGE] ⚠️  Erreur insertion conteneur %s: %s\n", 
                   metrics->containers[i].name, PQerrorMessage(conn));
            // Continuer avec les autres conteneurs
        }
        PQclear(res);
    }
    
    fprintf(stderr, "[STORAGE] ✅ Métriques sauvegardées dans PostgreSQL (system_id=%lld, %d conteneurs)\n", 
            system_id, metrics->container_count);
    fflush(stderr);
    
    return 0;
}

/**
 * Nettoie les ressources (ferme la connexion)
 */
void cleanup_storage(void) {
    if (conn) {
        PQfinish(conn);
        conn = NULL;
    }
    storage_initialized = 0;
}
