/**
 * Stockage des métriques en base de données PostgreSQL
 * Version simplifiée sans dépendance PostgreSQL (pour compilation)
 */

#include "storage.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

// TODO: Implémenter la connexion PostgreSQL quand nécessaire
// Pour l'instant, stockage simplifié (affichage ou fichier)

/**
 * Initialise le stockage
 */
int init_storage(void) {
    // Pour l'instant, juste retourner 0 (succès)
    // TODO: Connexion PostgreSQL
    return 0;
}

/**
 * Sauvegarde les métriques en base
 */
int save_metrics_to_db(const MetricsData *metrics) {
    // Pour l'instant, juste afficher
    // TODO: Insérer dans PostgreSQL
    printf("[METRICS] CPU: %.2f%%, Memory: %.2f%% (%lu MB used / %lu MB total), Containers: %d\n",
           metrics->cpu.load_1,
           metrics->memory.usage_percent,
           metrics->memory.used_mb,
           metrics->memory.total_mb,
           metrics->container_count);
    return 0;
}

/**
 * Nettoie les ressources
 */
void cleanup_storage(void) {
    // TODO: Fermer connexion PostgreSQL
}
