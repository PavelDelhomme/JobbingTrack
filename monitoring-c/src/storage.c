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

/** Préfixe datetime ISO pour les logs (ex: 2026-02-20T16:30:00Z) */
static const char* log_ts(void) {
    static char buf[32];
    time_t t = time(NULL);
    struct tm *tm = gmtime(&t);
    if (tm)
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", tm);
    else
        snprintf(buf, sizeof(buf), "%ld", (long)t);
    return buf;
}

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
        "CREATE TABLE IF NOT EXISTS public.system_metrics ("
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
        "CREATE TABLE IF NOT EXISTS public.container_metrics ("
        "  id BIGSERIAL PRIMARY KEY,"
        "  system_metrics_id BIGINT REFERENCES public.system_metrics(id) ON DELETE CASCADE,"
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
        "CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON public.system_metrics(timestamp);"
        "CREATE INDEX IF NOT EXISTS idx_container_metrics_timestamp ON public.container_metrics(timestamp);"
        "CREATE INDEX IF NOT EXISTS idx_container_metrics_name ON public.container_metrics(container_name);"
        "CREATE INDEX IF NOT EXISTS idx_container_metrics_system_id ON public.container_metrics(system_metrics_id);";
    
    PGresult *res;
    
    // Créer la table system_metrics
    res = PQexec(conn, create_system_metrics_table);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[%s] [STORAGE] Erreur création table system_metrics: %s\n", log_ts(), PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    PQclear(res);
    
    // Créer la table container_metrics
    res = PQexec(conn, create_container_metrics_table);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[%s] [STORAGE] Erreur création table container_metrics: %s\n", log_ts(), PQerrorMessage(conn));
        PQclear(res);
        return -1;
    }
    PQclear(res);
    
    // Créer les index
    res = PQexec(conn, create_indexes);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[%s] [STORAGE] Erreur création index: %s\n", log_ts(), PQerrorMessage(conn));
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
        fprintf(stderr, "[%s] [STORAGE] ⚠️  Échec connexion PostgreSQL: %s\n", log_ts(), PQerrorMessage(conn));
        fprintf(stderr, "[%s] [STORAGE]    (Les métriques seront toujours disponibles via l'API HTTP)\n", log_ts());
        PQfinish(conn);
        conn = NULL;
        return -1;
    }
    
    printf("[%s] [STORAGE] ✅ Connecté à PostgreSQL: %s@%s:%s/%s\n",
           log_ts(), get_db_user(), get_db_host(), get_db_port(), get_db_name());
    
    // Forcer le schéma public pour éviter "relation does not exist" (conflits search_path)
    PGresult *path_res = PQexec(conn, "SET search_path TO public");
    if (PQresultStatus(path_res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "[%s] [STORAGE] ⚠️ SET search_path: %s\n", log_ts(), PQerrorMessage(conn));
    }
    PQclear(path_res);
    
    // Créer les tables si elles n'existent pas
    if (create_tables_if_not_exists(conn) != 0) {
        fprintf(stderr, "[%s] [STORAGE] ⚠️  Erreur création tables (continuons quand même)\n", log_ts());
        // Ne pas retourner d'erreur, on peut continuer sans tables
    } else {
        printf("[%s] [STORAGE] ✅ Tables créées/vérifiées\n", log_ts());
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
    
    // ✅ CORRECTION : Utiliser NOW() de PostgreSQL pour avoir le timestamp exact du serveur
    // Cela garantit que le timestamp est toujours correct, même si le conteneur a un décalage horaire
    // On n'utilise plus le timestamp C, mais directement NOW() de PostgreSQL
    
    // ✅ CORRECTION : Utiliser les métriques projet déjà calculées dans collector.c
    // (elles sont stockées dans metrics->project_cpu_avg et metrics->project_memory_mb)
    double project_cpu_avg = metrics->project_cpu_avg;
    unsigned long project_memory_mb = metrics->project_memory_mb;
    
    // Insérer les métriques système (schéma public explicite)
    char query[2048];
    snprintf(query, sizeof(query),
        "INSERT INTO public.system_metrics ("
        "  timestamp, cpu_load_1, cpu_load_5, cpu_load_15, cpu_cores, cpu_usage_percent,"
        "  memory_total_mb, memory_used_mb, memory_free_mb, memory_usage_percent,"
        "  disk_total_gb, disk_used_gb, disk_free_gb, disk_usage_percent,"
        "  container_count, avg_response_time_ms, avg_cpu_percent, avg_memory_percent,"
        "  availability_percent, load_score, total_network_rx_bytes, total_network_tx_bytes,"
        "  project_cpu_avg, project_memory_mb"
        ") VALUES ("
        "  NOW(), %.2f, %.2f, %.2f, %d, %.2f,"
        "  %lu, %lu, %lu, %.2f,"
        "  %.2f, %.2f, %.2f, %.2f,"
        "  %d, %.2f, %.2f, %.2f,"
        "  %.2f, %.2f, %lu, %lu,"
        "  %.2f, %lu"
        ") RETURNING id;",
        metrics->cpu.load_1, metrics->cpu.load_5, metrics->cpu.load_15, 
        metrics->cpu.cores, metrics->system_cpu_usage_percent,  // ✅ CORRECTION : Utiliser system_cpu_usage_percent au lieu de load_1
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
        fprintf(stderr, "[%s] [STORAGE] ⚠️  Erreur insertion métriques système: %s\n", log_ts(), PQerrorMessage(conn));
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
            fprintf(stderr, "[%s] [STORAGE] ⚠️  Erreur échappement nom conteneur: %s\n", log_ts(), metrics->containers[i].name);
            continue;
        }
        
        snprintf(query, sizeof(query),
            "INSERT INTO public.container_metrics ("
            "  system_metrics_id, timestamp, container_name, cpu_percent,"
            "  memory_mb, memory_limit_mb, memory_percent,"
            "  network_rx_bytes, network_tx_bytes, response_time_ms, http_status"
            ") VALUES ("
            "  %lld, NOW(), '%s', %.2f,"
            "  %lu, %lu, %.2f,"
            "  %lu, %lu, %.2f, %d"
            ");",
            system_id, escaped_name, metrics->containers[i].cpu_percent,
            metrics->containers[i].memory_mb, metrics->containers[i].memory_limit_mb,
            metrics->containers[i].memory_percent,
            metrics->containers[i].network_rx_bytes, metrics->containers[i].network_tx_bytes,
            metrics->containers[i].response_time_ms, metrics->containers[i].http_status);
        
        res = PQexec(conn, query);
        if (PQresultStatus(res) != PGRES_COMMAND_OK) {
            fprintf(stderr, "[%s] [STORAGE] ⚠️  Erreur insertion conteneur %s: %s\n", log_ts(),
                   metrics->containers[i].name, PQerrorMessage(conn));
            // Continuer avec les autres conteneurs
        }
        PQclear(res);
    }
    
    fprintf(stderr, "[%s] [STORAGE] ✅ Métriques sauvegardées dans PostgreSQL (system_id=%lld, %d conteneurs)\n", log_ts(),
            system_id, metrics->container_count);
    fflush(stderr);
    
    return 0;
}

/**
 * Récupère l'historique des métriques système depuis PostgreSQL
 * Utilise des paramètres préparés pour éviter l'injection SQL (start_date, end_date).
 * Retourne un JSON string alloué dynamiquement (à libérer par l'appelant)
 */
char* get_system_metrics_history(int limit, int offset, const char *start_date, const char *end_date) {
    if (!conn || PQstatus(conn) != CONNECTION_OK) {
        return NULL;
    }

    /* Validation des entrées : bornes pour limit/offset */
    if (limit <= 0) limit = 100;
    if (limit > 5000) limit = 5000;
    if (offset < 0) offset = 0;
    if (offset > 100000) offset = 100000;

    const char *query =
        "SELECT timestamp, cpu_usage_percent, cpu_cores, cpu_load_1, cpu_load_5, cpu_load_15, "
        "memory_total_mb, memory_used_mb, memory_free_mb, memory_usage_percent, "
        "disk_usage_percent, container_count, avg_response_time_ms, availability_percent, "
        "load_score, total_network_rx_bytes, total_network_tx_bytes, project_cpu_avg, project_memory_mb "
        "FROM public.system_metrics "
        "WHERE ($1::text = '' OR timestamp >= $1::timestamp) AND ($2::text = '' OR timestamp <= $2::timestamp) "
        "ORDER BY timestamp DESC "
        "LIMIT $3 OFFSET $4";

    const char *param_values[4];
    char limit_str[16], offset_str[16];
    snprintf(limit_str, sizeof(limit_str), "%d", limit);
    snprintf(offset_str, sizeof(offset_str), "%d", offset);
    param_values[0] = (start_date && start_date[0]) ? start_date : "";
    param_values[1] = (end_date && end_date[0]) ? end_date : "";
    param_values[2] = limit_str;
    param_values[3] = offset_str;

    PGresult *res = PQexecParams(conn, query, 4, NULL, param_values, NULL, NULL, 0);
    
    if (PQresultStatus(res) != PGRES_TUPLES_OK) {
        fprintf(stderr, "[%s] [STORAGE] ❌ Erreur requête historique: %s\n", log_ts(), PQerrorMessage(conn));
        PQclear(res);
        return NULL;
    }
    
    int rows = PQntuples(res);
    if (rows == 0) {
        PQclear(res);
        // Retourner un JSON vide mais valide
        char *empty_json = (char*)malloc(64);
        snprintf(empty_json, 64, "{\"success\":true,\"count\":0,\"data\":[]}");
        return empty_json;
    }
    
    // Allouer un buffer pour le JSON (estimation: ~500 bytes par ligne)
    size_t json_size = rows * 500 + 1024;
    char *json = (char*)malloc(json_size);
    if (!json) {
        PQclear(res);
        return NULL;
    }
    
    // Construire le JSON
    int pos = snprintf(json, json_size, "{\"success\":true,\"count\":%d,\"data\":[", rows);
    
    for (int i = 0; i < rows; i++) {
        if (i > 0) {
            pos += snprintf(json + pos, json_size - pos, ",");
        }
        
        const char *timestamp = PQgetvalue(res, i, 0);
        const char *cpu_usage = PQgetvalue(res, i, 1);
        const char *cpu_cores = PQgetvalue(res, i, 2);
        const char *cpu_load_1 = PQgetvalue(res, i, 3);
        const char *cpu_load_5 = PQgetvalue(res, i, 4);
        const char *cpu_load_15 = PQgetvalue(res, i, 5);
        const char *memory_total = PQgetvalue(res, i, 6);
        const char *memory_used = PQgetvalue(res, i, 7);
        const char *memory_free = PQgetvalue(res, i, 8);
        const char *memory_usage = PQgetvalue(res, i, 9);
        const char *disk_usage = PQgetvalue(res, i, 10);
        const char *container_count = PQgetvalue(res, i, 11);
        const char *avg_response_time = PQgetvalue(res, i, 12);
        const char *availability = PQgetvalue(res, i, 13);
        const char *load_score = PQgetvalue(res, i, 14);
        const char *network_rx = PQgetvalue(res, i, 15);
        const char *network_tx = PQgetvalue(res, i, 16);
        const char *project_cpu_avg = PQgetvalue(res, i, 17);
        const char *project_memory_mb = PQgetvalue(res, i, 18);
        
        // Convertir timestamp PostgreSQL en ISO string
        char iso_timestamp[64];
        if (strlen(timestamp) >= 19) {
            // Format: "2025-12-24 07:18:38" -> "2025-12-24T07:18:38Z"
            snprintf(iso_timestamp, sizeof(iso_timestamp), "%.10sT%.8sZ", timestamp, timestamp + 11);
        } else {
            strncpy(iso_timestamp, timestamp, sizeof(iso_timestamp) - 1);
            iso_timestamp[sizeof(iso_timestamp) - 1] = '\0';
        }
        
        pos += snprintf(json + pos, json_size - pos,
            "{\"timestamp\":\"%s\",\"cpuUsagePercent\":%s,\"cpu_usage_percent\":%s,\"cpuCores\":%s,"
            "\"cpuLoadAverage1m\":%s,\"cpuLoadAverage5m\":%s,\"cpuLoadAverage15m\":%s,"
            "\"memoryTotalMb\":%s,\"memoryUsedMb\":%s,\"memoryFreeMb\":%s,\"memoryUsagePercent\":%s,"
            "\"diskUsagePercent\":%s,\"containerCount\":%s,\"responseTimeAvg\":%s,"
            "\"availabilityPercent\":%s,\"loadScore\":%s,\"networkRxBytes\":%s,\"networkTxBytes\":%s,"
            "\"project_cpu_avg\":%s,\"project_memory_mb\":%s}",
            iso_timestamp, cpu_usage, cpu_usage, cpu_cores,
            cpu_load_1 ? cpu_load_1 : "null", cpu_load_5 ? cpu_load_5 : "null", cpu_load_15 ? cpu_load_15 : "null",
            memory_total ? memory_total : "null", memory_used ? memory_used : "null", 
            memory_free ? memory_free : "null", memory_usage ? memory_usage : "null",
            disk_usage ? disk_usage : "null", container_count ? container_count : "null",
            avg_response_time ? avg_response_time : "null",
            availability ? availability : "null", load_score ? load_score : "null",
            network_rx ? network_rx : "null", network_tx ? network_tx : "null",
            project_cpu_avg ? project_cpu_avg : "null", project_memory_mb ? project_memory_mb : "null");
    }
    
    pos += snprintf(json + pos, json_size - pos, "]}");
    PQclear(res);
    
    return json;
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
