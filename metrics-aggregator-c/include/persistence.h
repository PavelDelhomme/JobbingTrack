/**
 * Service de persistance PostgreSQL avec cache
 * Gère l'enregistrement et la récupération des métriques
 */

#ifndef PERSISTENCE_H
#define PERSISTENCE_H

#include <stdbool.h>
#include <time.h>

// Structure pour les métriques système
typedef struct {
    time_t timestamp;
    double cpu_usage_percent;
    int cpu_cores;
    double cpu_load_1m;
    double cpu_load_5m;
    double cpu_load_15m;
    long long memory_total_mb;
    long long memory_used_mb;
    long long memory_free_mb;
    double memory_usage_percent;
    double disk_usage_percent;
    int container_count;
    double avg_response_time_ms;
    double availability_percent;
    double load_score;
    long long total_network_rx_bytes;
    long long total_network_tx_bytes;
    double project_cpu_avg;
    long long project_memory_mb;
} SystemMetrics;

// Structure pour les métriques de conteneur
typedef struct {
    time_t timestamp;
    char container_name[256];
    double cpu_percent;
    long long memory_mb;
    long long memory_limit_mb;
    double memory_percent;
    long long network_rx_bytes;
    long long network_tx_bytes;
    double response_time_ms;
    int http_status;
} ContainerMetrics;

// Initialiser la connexion PostgreSQL
bool persistence_init(void);

// Fermer la connexion
void persistence_close(void);

// Vérifier si la base de données est disponible
bool persistence_is_available(void);

// Sauvegarder les métriques système (avec cache)
bool persistence_save_system_metrics(const SystemMetrics *metrics);

// Récupérer l'historique des métriques système (avec cache)
SystemMetrics* persistence_get_system_metrics_history(
    int limit,
    int offset,
    time_t start_date,
    time_t end_date,
    int *count
);

// Sauvegarder les métriques d'un conteneur
bool persistence_save_container_metrics(const ContainerMetrics *metrics);

// Récupérer l'historique des métriques d'un conteneur (avec cache)
ContainerMetrics* persistence_get_container_metrics_history(
    const char *container_name,
    int limit,
    int offset,
    time_t start_date,
    time_t end_date,
    int *count
);

// Nettoyer les anciennes données
int persistence_cleanup_old_data(int days_to_keep);

// Obtenir des statistiques globales
typedef struct {
    long long system_metrics_count;
    long long container_metrics_count;
    time_t oldest_timestamp;
    time_t newest_timestamp;
} PersistenceStats;

bool persistence_get_stats(PersistenceStats *stats);

#endif // PERSISTENCE_H

