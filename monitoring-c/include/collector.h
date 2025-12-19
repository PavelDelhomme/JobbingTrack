#ifndef COLLECTOR_H
#define COLLECTOR_H

#include <time.h>

// Structure pour les métriques CPU
typedef struct {
    double load_1;
    double load_5;
    double load_15;
    int cores;
} CPUMetrics;

// Structure pour les métriques mémoire
typedef struct {
    unsigned long total_mb;
    unsigned long used_mb;
    unsigned long free_mb;
    double usage_percent;
} MemoryMetrics;

// Structure pour les métriques disque
typedef struct {
    double total_gb;
    double used_gb;
    double free_gb;
    double usage_percent;
} DiskMetrics;

// Structure pour les métriques d'un conteneur
typedef struct {
    char name[256];
    double cpu_percent;
    unsigned long memory_mb;
    unsigned long memory_limit_mb;
    double memory_percent;
    unsigned long network_rx_bytes;
    unsigned long network_tx_bytes;
    double response_time_ms;  // Temps de réponse HTTP en ms
    int http_status;          // Code HTTP (200, 404, etc.)
    char health_url[512];     // URL pour health check
} ContainerMetrics;

// Structure complète des métriques
typedef struct {
    time_t timestamp;
    CPUMetrics cpu;
    MemoryMetrics memory;
    DiskMetrics disk;
    int container_count;
    ContainerMetrics containers[100];
    // Statistiques globales calculées
    double avg_response_time_ms;      // Temps de réponse moyen en ms
    double avg_cpu_percent;            // CPU moyen des conteneurs
    double avg_memory_percent;         // Mémoire moyenne des conteneurs
    double availability_percent;       // Pourcentage de services sains
    double load_score;                 // Score de charge (0-100)
    unsigned long total_network_rx_bytes;  // Total réseau réception (bytes)
    unsigned long total_network_tx_bytes;   // Total réseau émission (bytes)
} MetricsData;

// Fonctions principales
int collect_system_metrics(void);
int collect_container_metrics(void);
int save_metrics_to_db(const MetricsData *metrics);

#endif // COLLECTOR_H

